import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { createProfileSocialHandler, type SocialState } from "./profile-social-handler";
import type { HandleRegistry } from "./profile-handle-handler";
import type { SocialFeed } from "../domain/profile-social";
const key = (uid: string) => createHash("sha256").update(uid).digest("hex");
it("compartilha somente metadados públicos validados da própria conta", async () => {
  const app = setup();
  const action = {
    action: "share",
    enabled: true,
    name: "Alice",
    photoUrl: "/profile-avatars/alice.svg",
    details: {
      level: 7,
      streaks: { islands: 4, timer: 0, pomodoro: 1 },
      socialLinks: ["github.com/alice"],
    },
  };
  expect((await app.request("a", action)).status).toBe(200);
  const visited = await app.feed("b", "username=alice");
  expect(visited.profile?.details).toMatchObject({
    level: 7,
    streaks: action.details.streaks,
    socialLinks: ["https://github.com/alice"],
  });
  expect((await app.feed("b")).self.details).toBeUndefined();
  for (const details of [
    { ...action.details, level: -1 },
    { ...action.details, socialLinks: ["javascript:alert(1)"] },
    { ...action.details, streaks: { islands: -1, timer: 0, pomodoro: 0 } },
  ]) {
    expect((await app.request("a", { ...action, details })).status).toBe(400);
  }
});
it("resumo acumulado preserva curtidas e não refaz aviso nem leitura", async () => {
  const activity = {
    id: "f".repeat(32),
    kind: "practice" as const,
    course: "foundations",
    value: 10,
    at: Date.parse("2026-10-17T12:00:01Z"),
  };
  const app = setup(async () => [activity]);
  await app.request("a", { action: "activity-privacy", enabled: true });
  await app.request("b", { action: "follow", username: "alice" });
  app.advance(2000);
  await app.request("a", { action: "publish-activities" });
  await app.request("b", {
    action: "like-activity",
    username: "alice",
    activityId: activity.id,
    liked: true,
  });
  await app.request("b", { action: "read" });
  const before = (await app.feed("b")).notifications.find((item) => item.kind === "activity")!;
  activity.value = 20;
  activity.at += 1000;
  app.advance(2000);
  await app.request("a", { action: "publish-activities" });
  const feed = await app.feed("b");
  expect(feed.activities).toHaveLength(1);
  expect(feed.activities?.[0]).toMatchObject({ value: 20, course: "foundations", liked: true });
  expect(feed.activities?.[0]?.likes).toHaveLength(1);
  expect(feed.notifications.filter((item) => item.kind === "activity")).toEqual([
    expect.objectContaining({
      at: before.at,
      read: true,
      activity: expect.objectContaining({ value: 20 }),
    }),
  ]);
});
it("padrão ativo publica novas conquistas sem republicar histórico nem reativar opt-out", async () => {
  const activities = [
    {
      id: "c".repeat(32),
      kind: "focus" as const,
      value: 10,
      at: Date.parse("2026-10-17T11:59:00Z"),
    },
  ];
  const app = setup(async () => activities);
  await app.request("b", { action: "follow", username: "alice" });
  await app.request("a", { action: "publish-activities" });
  expect((await app.feed("b")).activities).toEqual([]);
  app.advance(2000);
  activities.push({
    ...activities[0]!,
    id: "d".repeat(32),
    at: Date.parse("2026-10-17T12:00:01Z"),
  });
  await app.request("a", { action: "publish-activities" });
  expect((await app.feed("b")).activities).toHaveLength(1);
  await app.request("a", { action: "activity-privacy", enabled: false });
  await app.request("a", { action: "publish-activities" });
  expect((await app.feed("a")).activitySharing).toBe(false);
  expect((await app.feed("b")).activities).toEqual([]);
});
it("atividades respeitam a desativação e registros salvos; curtidas são idempotentes e revogáveis", async () => {
  const activity = {
    id: "a".repeat(32),
    kind: "focus" as const,
    value: 25,
    at: Date.parse("2026-10-17T12:00:01Z"),
  };
  const app = setup(async () => [activity]);
  expect((await app.feed("a")).activitySharing).toBe(true);
  await app.request("a", { action: "activity-privacy", enabled: false });
  await app.request("b", { action: "follow", username: "alice" });
  await app.request("a", { action: "publish-activities" });
  expect((await app.feed("b")).activities).toEqual([]);
  await app.request("a", { action: "activity-privacy", enabled: true });
  app.advance(2000);
  await app.request("a", { action: "publish-activities" });
  expect((await app.feed("b")).activities).toHaveLength(1);
  expect((await app.feed("c")).activities).toEqual([]);
  expect((await app.feed("c", "username=alice")).activities).toHaveLength(1);
  const like = { action: "like-activity", username: "alice", activityId: activity.id, liked: true };
  await app.request("b", like);
  await app.request("b", like);
  expect(
    (await app.feed("a")).notifications.filter((notice) => notice.kind === "like"),
  ).toHaveLength(1);
  expect((await app.feed("b")).activities?.[0]?.likes).toEqual([{ username: "bob", name: "bob" }]);
  await app.request("b", { ...like, liked: false });
  expect(
    (await app.feed("a")).notifications.filter((notice) => notice.kind === "like"),
  ).toHaveLength(0);
  expect(
    (await app.request("a", { action: "publish-activities", title: "inventado" })).status,
  ).toBe(400);
  await app.request("a", { action: "activity-privacy", enabled: false });
  expect((await app.feed("a")).activitySharing).toBe(false);
  expect((await app.feed("b")).activities).toEqual([]);
  expect((await app.feed("b")).notifications.filter((notice) => notice.kind)).toEqual([]);
  expect((await app.request("b", like)).status).toBe(404);
});
it("listas usam perspectiva do visitante e remover seguidor preserva o vínculo inverso", async () => {
  const app = setup();
  await app.request("b", { action: "follow", username: "alice" });
  await app.request("a", { action: "follow", username: "bob" });
  const list = await app.feed("a", "list=followers");
  expect(
    list.connections?.people.map((person) => [person.username, person.followed, person.followsYou]),
  ).toEqual([["bob", true, true]]);
  expect(
    (await app.feed("c", "username=alice&list=followers")).connections?.people[0]?.followed,
  ).toBe(false);
  await app.request("a", { action: "remove-follower", username: "bob" });
  expect((await app.feed("a", "list=followers")).connections?.people).toEqual([]);
  expect((await app.feed("a", "list=following")).connections?.people[0]?.username).toBe("bob");
  expect((await app.feed("b")).self.following).toBe(0);
  expect((await app.feed("a")).notifications).toEqual([]);
  expect((await app.request("a", undefined, "list=unknown")).status).toBe(400);
  expect((await app.request("a", undefined, "list=followers&offset=-1")).status).toBe(400);
});
it("apresentação automática aceita capa oficial e impede publicação na conta trocada", async () => {
  const app = setup();
  const presentation = {
    action: "share",
    enabled: true,
    name: "Alice",
    photoUrl: "/profile-avatars/oliver.webp",
    cover: "ocean",
    expectedUsername: "alice",
  };
  expect((await app.request("a", presentation)).status).toBe(200);
  expect((await app.feed("b", "username=alice")).profile).toMatchObject({
    name: "Alice",
    cover: "ocean",
  });
  expect((await app.request("b", presentation)).status).toBe(409);
  expect(
    (await app.request("a", { ...presentation, cover: "https://outside.test/cover" })).status,
  ).toBe(400);
});
function setup(
  completedActivities?: () => Promise<import("./study-activity-summary").StudyActivity[]>,
) {
  let state: SocialState = { accounts: {} };
  let version = 0;
  let now = Date.parse("2026-10-17T12:00:00Z");
  let allowed = true;
  let conflict = false;
  const handles: HandleRegistry = {
    [key("a")]: { username: "alice" },
    [key("b")]: { username: "bob" },
    [key("c")]: { username: "carol" },
  };
  const handler = createProfileSocialHandler({
    ...(completedActivities ? { completedActivities } : {}),
    allowedOrigins: ["https://app.test"],
    identify: async (request) => {
      const uid = request.headers.get("x-test-uid");
      return uid ? { uid, anonymous: uid === "guest", emailVerified: true } : undefined;
    },
    handles: async () => handles,
    consume: async () => allowed,
    now: () => now,
    store: {
      read: async () => ({ value: structuredClone(state), version: String(version) }),
      write: async (value, expected) => {
        if (conflict) {
          conflict = false;
          version++;
          return false;
        }
        if (expected !== String(version)) return false;
        state = structuredClone(value);
        version++;
        return true;
      },
    },
  });
  function request(
    uid = "a",
    action?: Record<string, unknown>,
    query = "",
    method = action ? "POST" : "GET",
    origin = "https://app.test",
  ) {
    return handler(
      new Request(`https://app.test/api/profile-social${query ? `?${query}` : ""}`, {
        method,
        headers: { Origin: origin, "x-test-uid": uid, "Content-Type": "application/json" },
        ...(action ? { body: JSON.stringify(action) } : {}),
      }),
    );
  }
  const feed = async (uid: string, query = "") =>
    (await (await request(uid, undefined, query)).json()) as SocialFeed;
  return {
    request,
    feed,
    handles,
    state: () => state,
    advance: (ms: number) => (now += ms),
    deny: () => (allowed = false),
    conflict: () => (conflict = true),
  };
}

it("seguir é atômico, idempotente e gera aviso real com seguir de volta", async () => {
  const app = setup();
  expect((await app.request("a", { action: "follow", username: "bob" })).status).toBe(200);
  await app.request("a", { action: "follow", username: "bob" });
  let bob = await app.feed("b");
  expect(bob.self.followers).toBe(1);
  expect(bob.notifications).toHaveLength(1);
  expect(bob.notifications[0]?.person).toMatchObject({
    username: "alice",
    followed: false,
    followsYou: true,
  });
  await app.request("b", { action: "follow", username: "alice" });
  bob = await app.feed("b");
  expect(bob.notifications[0]?.person.followed).toBe(true);
  expect((await app.feed("a")).self.followers).toBe(1);
  expect(JSON.stringify(bob)).not.toContain(key("a"));
});
it("seguir novamente renova o aviso sem duplicar requisições de um vínculo já existente", async () => {
  const app = setup();
  await app.request("a", { action: "follow", username: "bob" });
  await app.request("b", { action: "read" });
  app.advance(1000);
  await app.request("a", { action: "unfollow", username: "bob" });
  expect((await app.feed("b")).self.followers).toBe(0);
  await app.request("a", { action: "follow", username: "bob" });
  expect((await app.feed("b")).notifications).toHaveLength(1);
  const renewed = (await app.feed("b")).notifications[0]!;
  expect(renewed.read).toBe(false);
  app.advance(1000);
  await app.request("a", { action: "follow", username: "bob" });
  expect((await app.feed("b")).notifications[0]?.at).toBe(renewed.at);
});
it("avisos expiram em 48 horas, mas as conexões não expiram", async () => {
  const app = setup();
  await app.request("a", { action: "follow", username: "bob" });
  app.advance(48 * 3600000);
  const bob = await app.feed("b");
  expect(bob.notifications).toEqual([]);
  expect(bob.self.followers).toBe(1);
});
it("somente nome e avatar autorizados podem ser compartilhados, sem email ou estudos", async () => {
  const app = setup();
  expect((await app.feed("b", "username=alice")).profile?.name).toBe("alice");
  await app.request("a", {
    action: "share",
    enabled: true,
    name: "Alice Silva",
    photoUrl: "/profile-avatars/alice.svg",
  });
  const other = await app.feed("b", "username=alice");
  expect(other.profile).toMatchObject({
    name: "Alice Silva",
    photoUrl: "/profile-avatars/alice.svg",
    shared: true,
  });
  expect((await app.feed("b", "search=alice%20silva")).results).toHaveLength(1);
  await app.request("a", { action: "share", enabled: false });
  expect((await app.feed("b", "username=alice")).profile?.name).toBe("alice");
  expect(
    (
      await app.request("a", {
        action: "share",
        enabled: true,
        name: "Alice",
        photoUrl: "https://external.test/photo.png",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await app.request("a", {
        action: "share",
        enabled: true,
        name: "Alice",
        photoUrl: "/profile-avatars/alice.svg",
        email: "private@test",
      })
    ).status,
  ).toBe(400);
});
it("sugere somente conexões de segundo grau reais", async () => {
  const app = setup();
  expect((await app.feed("a")).suggestions).toEqual([]);
  await app.request("a", { action: "follow", username: "bob" });
  await app.request("b", { action: "follow", username: "carol" });
  expect((await app.feed("a")).suggestions).toEqual([
    expect.objectContaining({ username: "carol", mutualCount: 1 }),
  ]);
});
it("excluir remove o perfil, suas relações e referências nas notificações", async () => {
  const app = setup();
  await app.request("a", { action: "follow", username: "bob" });
  await app.request("b", { action: "follow", username: "alice" });
  expect((await app.request("a", undefined, "", "DELETE")).status).toBe(200);
  expect(app.state().accounts[key("a")]).toBeUndefined();
  expect((await app.feed("b")).self.following).toBe(0);
  expect((await app.feed("b")).notifications).toEqual([]);
});
it("resolve renomeação por identidade e não entrega perfil de conta removida", async () => {
  const app = setup();
  await app.request("a", { action: "follow", username: "bob" });
  app.handles[key("a")]!.username = "alice_nova";
  expect((await app.feed("b")).notifications[0]?.person.username).toBe("alice_nova");
  delete app.handles[key("a")];
  expect((await app.feed("b")).notifications).toEqual([]);
  expect((await app.feed("b")).self.followers).toBe(0);
});
it("recusa origem externa, guests, perfis inexistentes, auto-seguir e troca de UID", async () => {
  const app = setup();
  expect((await app.request("a", undefined, "", "GET", "https://evil.test")).status).toBe(403);
  expect((await app.request("")).status).toBe(401);
  expect((await app.request("guest")).status).toBe(401);
  expect((await app.request("a", { action: "follow", username: "alice" })).status).toBe(400);
  expect((await app.request("a", { action: "follow", username: "nobody" })).status).toBe(404);
  expect((await app.request("a", { action: "follow", username: "bob", uid: "b" })).status).toBe(
    400,
  );
  expect((await app.request("unregistered")).status).toBe(409);
  app.deny();
  expect((await app.request()).status).toBe(429);
});
it("repete CAS em conflito e não perde uma conexão", async () => {
  const app = setup();
  app.conflict();
  expect((await app.request("a", { action: "follow", username: "bob" })).status).toBe(200);
  expect((await app.feed("b")).self.followers).toBe(1);
});

it("aceita objetos vazios omitidos pelo transporte do Firebase", async () => {
  const app = setup();
  await app.request("a", {
    action: "share",
    enabled: true,
    name: "Alice",
    photoUrl: "/profile-avatars/alice.svg",
  });
  const account = app.state().accounts[key("a")] as Partial<SocialState["accounts"][string]>;
  delete account.following;
  delete account.notices;
  expect((await app.feed("a")).self.followers).toBe(0);
  expect((await app.request("a", { action: "follow", username: "bob" })).status).toBe(200);
});
