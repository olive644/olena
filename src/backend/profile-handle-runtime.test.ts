import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identify: vi.fn() }));
vi.mock("./firebase-account-identity", () => ({
  createFirebaseAccountIdentity: () => mocks.identify,
}));
vi.mock("./firebase-realtime-store", () => ({
  createFirebaseAccessTokenProvider: () => async () => "admin-token",
  createFirebaseRealtimeStore: () => ({}),
}));
vi.mock("./rate-limit", () => ({ checkRateLimit: async () => true }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("HELENA_ALLOWED_ORIGINS", "https://app.test");
  vi.stubEnv("CREKS_OWNER_EMAIL", "owner@example.test");
  vi.stubEnv("FIREBASE_DATABASE_URL", "https://db.test");
  mocks.identify.mockResolvedValue({ uid: "a", name: "Name", anonymous: false });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function request() {
  return new Request("https://app.test/api/profile-handle", {
    headers: { Origin: "https://app.test", Authorization: "Bearer user-token" },
  });
}
it("consulta a conta atual, não confia no email do navegador e usa registro privado", async () => {
  const fetch = vi.fn(async (input: RequestInfo | URL) =>
    String(input).includes("accounts:lookup")
      ? new Response(
          JSON.stringify({
            users: [{ localId: "a", email: "owner@example.test", emailVerified: true }],
          }),
        )
      : new Response("null", { headers: { etag: '"1"' } }),
  );
  vi.stubGlobal("fetch", fetch);
  const { handleProfileHandle } = await import("./profile-handle-runtime");
  expect(await (await handleProfileHandle(request())).json()).toMatchObject({
    username: "",
    creks: false,
    preferredUsername: "oliver644",
  });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("accounts:lookup"),
    expect.objectContaining({ body: JSON.stringify({ idToken: "user-token" }) }),
  );
  expect(fetch).toHaveBeenCalledWith(
    "https://db.test/privateProfileHandles.json",
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
    }),
  );
});
it("conta removida, desativada ou UID divergente não acessa o registro", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const { handleProfileHandle } = await import("./profile-handle-runtime");
  for (const users of [[], [{ localId: "a", disabled: true }], [{ localId: "other" }]]) {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ users })));
    expect((await handleProfileHandle(request())).status).toBe(401);
  }
  expect(fetch).toHaveBeenCalledTimes(3);
});
