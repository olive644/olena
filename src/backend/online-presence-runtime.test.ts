import { expect, it, vi, beforeEach } from "vitest";
const state = vi.hoisted(() => ({
  identity: undefined as { uid: string; anonymous: boolean } | undefined,
  now: Date.now(),
  values: new Map<string, string>(),
  fetcher: vi.fn<typeof fetch>(),
}));
vi.mock("./firebase-account-identity.js", () => ({
  createFirebaseAccountIdentity: () => async () => state.identity,
}));
vi.mock("./profile-handle-runtime.js", () => ({ profileAllowedOrigins: ["https://app.example"] }));
vi.mock("./firebase-realtime-store.js", () => ({
  createFirebaseAccessTokenProvider: () => async () => "server-token",
  createFirebaseRealtimeStore: () => ({
    get: async (key: string) => state.values.get(key),
    set: async (key: string, v: string) => {
      state.values.set(key, v);
    },
    readVersion: async (key: string) => ({ value: state.values.get(key), version: "1" }),
    compareAndSet: async (key: string, value: string) => {
      state.values.set(key, value);
      return true;
    },
  }),
}));
vi.mock("./rate-limit.js", () => ({ checkRateLimit: async () => true }));
import { handleOnlinePresence } from "./online-presence-runtime";
import { PRIVACY_POLICY_VERSION } from "../domain/privacy-policy";
beforeEach(() => {
  state.identity = undefined;
  state.values.clear();
  state.fetcher.mockReset();
  vi.stubGlobal("fetch", state.fetcher);
  vi.stubEnv("DISCORD_ONLINE_COUNT_ENABLED", "true");
});
const request = (body = PRIVACY_POLICY_VERSION, origin = "https://app.example") =>
  new Request("https://app.example/api/olena?action=online-presence", {
    method: "POST",
    headers: { origin },
    body,
  });
it("rejeita origem, falta de sessão, anônimo e ausência de aceite vigente sem consultar Discord", async () => {
  expect((await handleOnlinePresence(request("", "https://evil.example"))).status).toBe(403);
  expect((await handleOnlinePresence(request())).status).toBe(401);
  state.identity = { uid: "a", anonymous: true };
  expect((await handleOnlinePresence(request())).status).toBe(401);
  state.identity = { uid: "a", anonymous: false };
  expect((await handleOnlinePresence(request("old"))).status).toBe(400);
  expect((await handleOnlinePresence(request("x".repeat(65)))).status).toBe(413);
  expect(state.fetcher).not.toHaveBeenCalled();
});
it("cron exige segredo e flag desativada não faz I/O", async () => {
  expect(
    (
      await handleOnlinePresence(
        new Request("https://app.example/api/olena?action=online-presence"),
      )
    ).status,
  ).toBe(401);
  vi.stubEnv("DISCORD_ONLINE_COUNT_ENABLED", "false");
  expect((await handleOnlinePresence(request())).headers.get("X-Olena-Presence")).toBe("disabled");
  expect(state.fetcher).not.toHaveBeenCalled();
});
it("somente canal de voz do servidor permitido pode ser renomeado", async () => {
  state.identity = { uid: "private-user", anonymous: false };
  state.fetcher.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes("privateOnlinePresence"))
      return Response.json(init?.method === "PUT" ? Date.now() : null);
    if (new URL(url).hostname === "discord.com")
      return Response.json({ guild_id: "wrong-server", type: 2 });
    throw new Error("unexpected");
  });
  expect((await handleOnlinePresence(request())).status).toBe(503);
  expect(state.fetcher.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
  const stored = state.fetcher.mock.calls.find(
    ([url, init]) => String(url).includes("privateOnlinePresence") && init?.method === "PUT",
  );
  expect(String(stored?.[0])).not.toContain("private-user");
  expect(String(stored?.[1]?.body)).toMatch(/^\d+$/);
});
it.each([true, false])(
  "limpeza protege sinal renovado e conflito de ETag, atualizado=%s",
  async (fresh) => {
    state.identity = { uid: "private-user", anonymous: false };
    const key = "f".repeat(64);
    state.fetcher.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("privateOnlinePresence")) {
        if (init?.method === "PUT") return Response.json(Date.now());
        if (init?.method === "DELETE") return new Response(null, { status: 412 });
        if (url.includes("endAt=")) return Response.json({ [key]: Date.now() - 900000 });
        if (url.endsWith("/" + key + ".json"))
          return Response.json(Date.now() - (fresh ? 0 : 900000), {
            headers: { etag: "safe-version" },
          });
        return Response.json({});
      }
      if (new URL(url).hostname === "discord.com") {
        if (init?.method === "PATCH") return new Response(null, { status: 204 });
        return Response.json({ guild_id: "1562664412530085908", type: 2 });
      }
      throw new Error("unexpected");
    });
    expect((await handleOnlinePresence(request())).status).toBe(204);
    const deletions = state.fetcher.mock.calls.filter(([, init]) => init?.method === "DELETE");
    expect(deletions).toHaveLength(fresh ? 0 : 1);
    if (!fresh)
      expect(new Headers(deletions[0]?.[1]?.headers).get("if-match")).toBe("safe-version");
  },
);
