import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
vi.mock("./profile-handle-runtime.js", () => ({
  profileAllowedOrigins: ["https://olena.example"],
  identifyProfileAccount: async () => ({ uid: "only-owner", anonymous: false }),
}));
vi.mock("./firebase-realtime-store.js", () => ({
  createFirebaseAccessTokenProvider: () => async () => "server-token",
  createFirebaseRealtimeStore: () => ({}),
}));
vi.mock("./rate-limit.js", () => ({ checkRateLimit: async () => true }));
import { handleOlena } from "./olena-handler";
afterEach(() => vi.unstubAllGlobals());
it("interrompe resposta excessiva sem tratá-la como perfil incompleto", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("x".repeat(17000))),
  );
  const response = await handleOlena(
    new Request("https://olena.example/api/olena?action=profile-completion", {
      headers: { Origin: "https://olena.example" },
    }),
  );
  expect(response.status).toBe(503);
});
it("a rota real consulta apenas os dois itens da conta, sem baixar estudos ou aceitar dados locais", async () => {
  const fetcher = vi.fn(
    async (input: RequestInfo | URL) =>
      new Response(
        JSON.stringify(
          String(input).includes("privateProfileHandles")
            ? "oli"
            : JSON.stringify({
                name: "Oli",
                photoUrl: "/profile-avatars/helena.webp",
                cover: "ocean",
              }),
        ),
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await handleOlena(
    new Request("https://olena.example/api/olena?action=profile-completion&version=1", {
      headers: { Origin: "https://olena.example" },
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ complete: true, completed: 3 });
  const urls = fetcher.mock.calls.map(([input]) => String(input));
  expect(urls).toHaveLength(2);
  expect(
    urls.some((url) =>
      url.endsWith(
        `/users/only-owner/stateV2/items/k_${Buffer.from("helena.profile.v1").toString("base64url")}.json`,
      ),
    ),
  ).toBe(true);
  expect(
    urls.some((url) =>
      url.endsWith(
        `/privateProfileHandles/${createHash("sha256").update("only-owner").digest("hex")}/username.json`,
      ),
    ),
  ).toBe(true);
});
