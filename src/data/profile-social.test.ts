import { afterEach, expect, it, vi } from "vitest";
import { requestSocial } from "./profile-social";
const mocks = vi.hoisted(() => {
  const user = { uid: "a", isAnonymous: false, getIdToken: async () => "token" };
  return {
    user,
    auth: { currentUser: user as typeof user | null, authStateReady: async () => {} },
  };
});
vi.mock("./firebase-account", () => ({
  getFirebaseAccountServices: async () => ({ auth: mocks.auth }),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  mocks.auth.currentUser = mocks.user;
  mocks.user.isAnonymous = false;
});
it("não consulta sem conta e rejeita resposta após troca de conta", async () => {
  const fetch = vi.fn(async () => {
    mocks.auth.currentUser = null;
    return new Response("{}");
  });
  vi.stubGlobal("fetch", fetch);
  mocks.auth.currentUser = null;
  await expect(requestSocial()).rejects.toThrow("Entre");
  expect(fetch).not.toHaveBeenCalled();
  mocks.auth.currentUser = mocks.user;
  await expect(requestSocial()).rejects.toThrow("conta mudou");
  expect(fetch).toHaveBeenCalledWith(
    "/api/profile-social",
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer token" }),
    }),
  );
});
it("rejeita respostas malformadas e imagens externas", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            self: { username: "alice", name: "Alice", photoUrl: "https://evil.test/photo" },
            notifications: [],
          }),
        ),
    ),
  );
  await expect(requestSocial()).rejects.toThrow("Resposta inválida");
});
it("aceita conclusão de módulo oficial e recusa metadados arbitrários", async () => {
  const person = {
    username: "alice",
    name: "Alice",
    photoUrl: "/profile-avatars/helena.webp",
    followers: 0,
    following: 0,
    followed: false,
    followsYou: true,
    shared: true,
  };
  const activity = {
    id: "a".repeat(32),
    kind: "module",
    value: 1,
    at: Date.now(),
    course: "foundations",
    level: 0,
    person,
    liked: false,
    likes: [],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ self: person, notifications: [], activities: [activity] })),
    ),
  );
  expect((await requestSocial()).activities?.[0]).toMatchObject({
    kind: "module",
    course: "foundations",
    level: 0,
  });
  activity.course = "private-note-title";
  await expect(requestSocial()).rejects.toThrow("Resposta inválida");
});
it("um perfil inválido some da lista de conexões sem derrubar os outros", async () => {
  const person = (username: string, photoUrl: string) => ({
    username,
    name: username,
    photoUrl,
    followers: 0,
    following: 0,
    followed: false,
    followsYou: true,
    shared: true,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            self: person("eu", "/profile-avatars/helena.webp"),
            notifications: [],
            connections: {
              kind: "followers",
              owner: "eu",
              people: [
                person("ana", "/profile-avatars/leticia-coelho.svg"),
                person("bia", "/profile-avatars/alice.svg"),
              ],
            },
          }),
        ),
    ),
  );
  const feed = await requestSocial();
  expect(feed.connections?.people.map((item) => item.username)).toEqual(["bia"]);
});
it("troca o erro cru de rede por orientação e repete só a leitura", async () => {
  const fetch = vi.fn(async () => {
    throw new TypeError("Failed to fetch");
  });
  vi.stubGlobal("fetch", fetch);
  await expect(requestSocial(undefined, "search=ana")).rejects.toThrow(
    "Confira sua conexão e tente novamente.",
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  fetch.mockClear();
  await expect(requestSocial({ action: "follow", username: "ana" })).rejects.toThrow(
    "Confira sua conexão",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("a leitura se recupera quando a segunda tentativa chega", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ self: { username: "ana", name: "Ana", photoUrl: "" } })),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(requestSocial(undefined, "search=ana")).rejects.not.toThrow("conexão");
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("resposta sem JSON não vaza o erro do navegador", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("<html>erro</html>", { status: 500 })),
  );
  const failure = await requestSocial().catch((cause: Error) => cause.message);
  expect(failure).not.toMatch(/JSON|Unexpected|token/i);
});
