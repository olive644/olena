import { createPublicKey, generateKeyPairSync } from "node:crypto";
import { jwtVerify } from "jose";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("./google-service-account.js", () => ({
  createGoogleAccessTokenProvider: () => async () => "admin-token",
}));
vi.mock("./firebase-account-identity.js", () => ({
  createFirebaseAccountIdentity: () => async () => ({
    uid: "existing-owner",
    name: "Owner",
    anonymous: false,
  }),
}));
vi.mock("./profile-handle-runtime.js", () => ({
  profileAllowedOrigins: ["https://olena.test"],
  identifyProfileAccount: async () => ({
    uid: "existing-owner",
    authTime: Math.floor(Date.now() / 1000),
  }),
}));
const key = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ format: "pem", type: "pkcs8" })
  .toString();
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function setup() {
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
  vi.stubEnv("VITE_FIREBASE_API_KEY", "public-test-key");
  vi.stubEnv("FIREBASE_DATABASE_URL", "https://db.test");
  vi.stubEnv("FIREBASE_CLIENT_EMAIL", "test@project.iam.gserviceaccount.com");
  vi.stubEnv("FIREBASE_PRIVATE_KEY", key);
  vi.stubEnv("AUTH_PUBLIC_ORIGIN", "https://olena.test");
  vi.stubEnv("DISCORD_CLIENT_ID", "client");
  vi.stubEnv("DISCORD_CLIENT_SECRET", "secret");
  const values = new Map<string, { value: unknown; version: number }>();
  const accounts = new Map<
    string,
    {
      localId: string;
      displayName: string;
      disabled?: boolean;
      passwordHash?: string;
      providerUserInfo?: { providerId: string }[];
    }
  >();
  const revoked: Record<string, unknown>[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const body = init?.body
      ? (JSON.parse(String(init.body).startsWith("{") ? String(init.body) : "{}") as Record<
          string,
          unknown
        >)
      : {};
    if (url === "https://discord.com/api/oauth2/token")
      return Response.json({ access_token: "discord-token", token_type: "Bearer" });
    if (url === "https://discord.com/api/v10/users/@me")
      return Response.json({ id: "123456789012345678", username: "Learner" });
    if (url.endsWith("/accounts:lookup") || url.includes("/accounts:lookup?")) {
      const id = body["idToken"] ? "existing-owner" : (body["localId"] as string[])[0]!;
      return Response.json({ users: accounts.has(id) ? [accounts.get(id)] : [] });
    }
    if (url === "https://identitytoolkit.googleapis.com/v1/projects/project/accounts:update") {
      expect(init?.headers).toMatchObject({ Authorization: "Bearer admin-token" });
      revoked.push(body);
      return Response.json({ localId: body["localId"] });
    }
    if (url.includes("/accounts:update?")) {
      expect(body["idToken"]).toBeTruthy();
      expect(body["localId"]).toBeUndefined();
      const target = accounts.get("existing-owner");
      if (!target) return Response.json({}, { status: 400 });
      target.providerUserInfo = (target.providerUserInfo ?? []).filter(
        (p) => !(body["deleteProvider"] as string[]).includes(p.providerId),
      );
      return Response.json({ localId: body["localId"] });
    }
    if (url === "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=public-test-key") {
      expect(body["targetProjectId"]).toBe("project");
      const id = String(body["localId"]);
      if (accounts.has(id)) return Response.json({}, { status: 400 });
      accounts.set(id, { localId: id, displayName: String(body["displayName"]) });
      return Response.json({ localId: id });
    }
    if (url.startsWith("https://db.test/")) {
      const previous = values.get(url);
      const version = String(previous?.version ?? 0);
      const headers = new Headers(init?.headers);
      if (headers.has("if-match") && headers.get("if-match") !== version)
        return Response.json({}, { status: 412 });
      if (init?.method === "PUT") {
        values.set(url, { value: body, version: Number(version) + 1 });
        return Response.json(body);
      }
      if (init?.method === "DELETE") {
        values.delete(url);
        return Response.json(null);
      }
      return Response.json(previous?.value ?? null, { headers: { etag: version } });
    }
    throw new Error("unexpected-request");
  });
  vi.stubGlobal("fetch", fetcher);
  const { handleDiscordAuth } = await import("./discord-auth-runtime");
  async function login(authorization?: string) {
    const start = await handleDiscordAuth(
      new Request("https://olena.test/api/olena?action=account-auth&step=start", {
        method: "POST",
        headers: { origin: "https://olena.test", ...(authorization ? { authorization } : {}) },
      }),
    );
    const body = (await start.json()) as { url: string };
    const cookie = start.headers.get("set-cookie")!.split(";")[0]!;
    const state = new URL(body.url).searchParams.get("state")!;
    const callback = await handleDiscordAuth(
      new Request(
        `https://olena.test/api/olena?action=account-auth&step=callback&state=${state}&code=code&iss=https%3A%2F%2Fdiscord.com`,
        { headers: { cookie } },
      ),
    );
    return { callback, cookie };
  }
  return { handleDiscordAuth, login, accounts, values, revoked };
}

it("keeps one Firebase UID across repeated and concurrent Discord logins", async () => {
  const s = await setup();
  const results = await Promise.all([s.login(), s.login()]);
  expect(results.map((item) => item.callback.status)).toEqual([303, 303]);
  expect(s.accounts.size).toBe(1);
  const original = [...s.accounts.keys()][0]!;
  expect(s.accounts.get(original)?.displayName).toBe("Learner");
  await s.login();
  expect([...s.accounts.keys()]).toEqual([original]);
});
it("links only to the authenticated UID and refuses to transfer an existing identity", async () => {
  const s = await setup();
  await s.login();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  const before = JSON.stringify([...s.values]);
  const result = await s.login("Bearer owner");
  expect(result.callback.status).toBe(503);
  const mapping = [...s.values].find(([path]) => path.includes("/privateAuthDiscord/"));
  expect(JSON.stringify(mapping)).not.toContain("existing-owner");
  expect(before).toContain("privateAuthDiscord");
});
it("refuses disabled accounts and creates a fresh UID after deletion", async () => {
  const s = await setup();
  await s.login();
  const original = [...s.accounts.keys()][0]!;
  s.accounts.get(original)!.disabled = true;
  expect((await s.login()).callback.status).toBe(503);
  s.accounts.delete(original);
  expect((await s.login()).callback.status).toBe(303);
  expect([...s.accounts.keys()][0]).not.toBe(original);
});
it("does not unlink an active Firebase account during deletion cleanup", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  const result = await s.handleDiscordAuth(
    new Request("https://olena.test/api/olena?action=account-auth&step=cleanup", {
      method: "POST",
      headers: { origin: "https://olena.test", authorization: "Bearer owner" },
    }),
  );
  expect(result.status).toBe(403);
});

it("issues a signed five-minute Firebase credential for the resolved UID only", async () => {
  const s = await setup();
  const flow = await s.login();
  const code = new URL(flow.callback.headers.get("location")!).searchParams.get("discord")!;
  const response = await s.handleDiscordAuth(
    new Request(`https://olena.test/api/olena?action=account-auth&step=exchange&code=${code}`, {
      method: "POST",
      headers: { origin: "https://olena.test", cookie: flow.cookie },
    }),
  );
  expect(response.status).toBe(200);
  const body = (await response.json()) as { token: string };
  const { payload, protectedHeader } = await jwtVerify(body.token, createPublicKey(key), {
    issuer: "test@project.iam.gserviceaccount.com",
    audience:
      "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
  });
  expect(protectedHeader.alg).toBe("RS256");
  expect(payload["uid"]).toBe([...s.accounts.keys()][0]);
  expect(payload.exp! - payload.iat!).toBe(300);
});

it("removes the Discord mapping after the Firebase user has been deleted", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  await s.login("Bearer owner");
  expect([...s.values.keys()].some((path) => path.includes("/privateAuthDiscord/"))).toBe(true);
  s.accounts.delete("existing-owner");
  const response = await s.handleDiscordAuth(
    new Request("https://olena.test/api/olena?action=account-auth&step=cleanup", {
      method: "POST",
      headers: { origin: "https://olena.test", authorization: "Bearer old-owner-token" },
    }),
  );
  expect(response.status).toBe(200);
  expect(
    [...s.values.keys()].some(
      (path) =>
        path.includes("/privateAuthDiscord/") || path.includes("/privateAuthDiscordOwners/"),
    ),
  ).toBe(false);
});

it("checks Discord session age on the server rather than the device clock", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  for (const [offset, expected] of [
    [0, true],
    [-300, false],
    [60, false],
  ] as const) {
    const payload = Buffer.from(
      JSON.stringify({ auth_time: Math.floor(Date.now() / 1000) + offset }),
    ).toString("base64url");
    const token = `eyJhbGciOiJSUzI1NiJ9.${payload}.signature`;
    const response = await s.handleDiscordAuth(
      new Request("https://olena.test/api/olena?action=account-auth&step=recent", {
        method: "POST",
        headers: { origin: "https://olena.test", authorization: `Bearer ${token}` },
      }),
    );
    expect(await response.json()).toEqual({ recent: expected });
  }
});

it("reports only a confirmed Discord association owned by the authenticated account", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  const request = () =>
    s.handleDiscordAuth(
      new Request("https://olena.test/api/olena?action=account-auth&step=methods", {
        method: "POST",
        headers: { origin: "https://olena.test", authorization: "Bearer owner" },
      }),
    );
  expect(await (await request()).json()).toEqual({
    password: false,
    google: false,
    discord: { linked: false },
  });
  await s.login("Bearer owner");
  expect(await (await request()).json()).toEqual({
    password: false,
    google: false,
    discord: { linked: true, name: "Learner" },
  });
  const binding = [...s.values].find(([path]) => path.includes("/privateAuthDiscord/"))!;
  s.values.set(binding[0], {
    value: { uid: "other-owner", ready: true },
    version: binding[1].version + 1,
  });
  expect(await (await request()).json()).toEqual({
    password: false,
    google: false,
    discord: { linked: false },
  });
  s.accounts.get("existing-owner")!.disabled = true;
  expect((await request()).status).toBe(403);
});

it("refuses association status requests from an unapproved origin", async () => {
  const s = await setup();
  const response = await s.handleDiscordAuth(
    new Request("https://olena.test/api/olena?action=account-auth&step=methods", {
      method: "POST",
      headers: { origin: "https://attacker.test", authorization: "Bearer owner" },
    }),
  );
  expect(response.status).toBe(403);
});
it("limits authenticated association reads before exposing additional metadata", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  const request = () =>
    s.handleDiscordAuth(
      new Request("https://olena.test/api/olena?action=account-auth&step=methods", {
        method: "POST",
        headers: { origin: "https://olena.test", authorization: "Bearer owner" },
      }),
    );
  for (let i = 0; i < 30; i++) expect((await request()).status).toBe(200);
  expect((await request()).status).toBe(429);
});
function sessionToken(offset = 0) {
  return `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify({ auth_time: Math.floor(Date.now() / 1000) + offset })).toString("base64url")}.signature`;
}
function methodRequest(step: string, offset = 0) {
  return new Request(`https://olena.test/api/olena?action=account-auth&step=${step}`, {
    method: "POST",
    headers: { origin: "https://olena.test", authorization: `Bearer ${sessionToken(offset)}` },
  });
}
it("reports password presence even when providerUserInfo omits password, without exposing credential material", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", {
    localId: "existing-owner",
    displayName: "Owner",
    passwordHash: "redacted",
    providerUserInfo: [{ providerId: "google.com" }],
  });
  const response = await s.handleDiscordAuth(methodRequest("methods"));
  expect(await response.json()).toEqual({
    password: true,
    google: true,
    discord: { linked: false },
  });
});
it("requires recent authentication and another method before unlinking", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", {
    localId: "existing-owner",
    displayName: "Owner",
    providerUserInfo: [{ providerId: "google.com" }],
  });
  expect((await s.handleDiscordAuth(methodRequest("unlink-google", -300))).status).toBe(401);
  expect((await s.handleDiscordAuth(methodRequest("unlink-google", 60))).status).toBe(401);
  const blocked = await s.handleDiscordAuth(methodRequest("unlink-google"));
  expect(blocked.status).toBe(409);
  expect(await blocked.json()).toEqual({ error: "last-method" });
  expect(s.accounts.get("existing-owner")!.providerUserInfo).toHaveLength(1);
});
it("unlinks Google while retaining Discord and refuses removing the remaining access", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", {
    localId: "existing-owner",
    displayName: "Owner",
    providerUserInfo: [{ providerId: "google.com" }],
  });
  await s.login("Bearer owner");
  expect((await s.handleDiscordAuth(methodRequest("unlink-google"))).status).toBe(200);
  expect((await s.handleDiscordAuth(methodRequest("unlink-discord"))).status).toBe(409);
  expect((await (await s.handleDiscordAuth(methodRequest("methods"))).json()).discord.linked).toBe(
    true,
  );
});
it("serializes concurrent removals and preserves at least one login method", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", {
    localId: "existing-owner",
    displayName: "Owner",
    providerUserInfo: [{ providerId: "google.com" }],
  });
  await s.login("Bearer owner");
  const results = await Promise.all(
    ["unlink-google", "unlink-discord"].map((step) => s.handleDiscordAuth(methodRequest(step))),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  const body = await (await s.handleDiscordAuth(methodRequest("methods"))).json();
  expect(
    body.discord.linked || s.accounts.get("existing-owner")!.providerUserInfo!.length > 0,
  ).toBe(true);
});
it("removes only this account Discord link and allows subsequent access through password", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", {
    localId: "existing-owner",
    displayName: "Owner",
    passwordHash: "redacted",
  });
  await s.login("Bearer owner");
  expect((await s.handleDiscordAuth(methodRequest("unlink-discord"))).status).toBe(200);
  expect(await (await s.handleDiscordAuth(methodRequest("methods"))).json()).toEqual({
    password: true,
    google: false,
    discord: { linked: false },
  });
  expect([...s.values.keys()].filter((p) => p.includes("/privateAuthDiscord"))).toHaveLength(0);
});
it("does not count an obsolete sign-in method as a remaining supported access", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", {
    localId: "existing-owner",
    displayName: "Owner",
    providerUserInfo: [{ providerId: "google.com" }, { providerId: "apple.com" }],
  });
  expect((await s.handleDiscordAuth(methodRequest("unlink-google"))).status).toBe(409);
});
it("never unlinks an account when Firebase returns a different UID", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", {
    localId: "existing-owner",
    displayName: "Owner",
    passwordHash: "redacted",
  });
  const previous = fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input, init) =>
      String(input).includes("/accounts:lookup?")
        ? Response.json({ users: [{ localId: "another-owner", passwordHash: "redacted" }] })
        : previous(input, init),
    ),
  );
  expect((await s.handleDiscordAuth(methodRequest("unlink-google"))).status).toBe(503);
});
it("signs the account out of every device only after a recent login, and limits how often", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  expect((await s.handleDiscordAuth(methodRequest("revoke-sessions", -600))).status).toBe(401);
  expect(s.revoked).toHaveLength(0);
  const before = Math.floor(Date.now() / 1000);
  expect((await s.handleDiscordAuth(methodRequest("revoke-sessions"))).status).toBe(200);
  expect(s.revoked).toHaveLength(1);
  expect(s.revoked[0]).toMatchObject({ localId: "existing-owner" });
  expect(Number(s.revoked[0]!["validSince"])).toBeGreaterThanOrEqual(before);
  s.accounts.get("existing-owner")!.disabled = true;
  expect((await s.handleDiscordAuth(methodRequest("revoke-sessions"))).status).toBe(403);
  s.accounts.get("existing-owner")!.disabled = false;
  for (let i = 0; i < 3; i++)
    expect((await s.handleDiscordAuth(methodRequest("revoke-sessions"))).status).toBe(200);
  expect((await s.handleDiscordAuth(methodRequest("revoke-sessions"))).status).toBe(429);
});
it("does not revoke sessions through a cross-origin request", async () => {
  const s = await setup();
  s.accounts.set("existing-owner", { localId: "existing-owner", displayName: "Owner" });
  const response = await s.handleDiscordAuth(
    new Request("https://olena.test/api/olena?action=account-auth&step=revoke-sessions", {
      method: "POST",
      headers: { origin: "https://evil.test", authorization: `Bearer ${sessionToken()}` },
    }),
  );
  expect(response.status).toBe(403);
  expect(s.revoked).toHaveLength(0);
});
