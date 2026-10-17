import { expect, it, vi } from "vitest";
import { createProfileCompletionHandler } from "./profile-completion-handler";
const origin = "https://olena.example";
function setup() {
  const options = {
    allowedOrigins: [origin],
    identify: vi.fn(async () => ({ uid: "own", anonymous: false })),
    consume: vi.fn(async () => true),
    read: vi.fn(async () => ({
      profile: {
        name: "Oli",
        photoUrl: "/profile-avatars/helena.webp",
        cover: "ocean",
        pronouns: "",
        username: "fake",
      },
      username: "oli",
    })),
  };
  const handler = createProfileCompletionHandler(options);
  const request = (query = "", method = "GET", source = origin) =>
    new Request(`${origin}/api/olena?action=profile-completion${query}`, {
      method,
      headers: { Origin: source },
    });
  return { options, handler, request };
}
it("confere somente os dados da conta autenticada e retorna apenas etapas", async () => {
  const { options, handler, request } = setup();
  const response = await handler(request());
  expect(options.read).toHaveBeenCalledExactlyOnceWith("own");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    version: 1,
    steps: [
      { id: "identity", done: true },
      { id: "avatar", done: true },
      { id: "cover", done: true },
    ],
    completed: 3,
    complete: true,
    next: null,
  });
});
it.each([
  "&uid=other",
  "&username=other",
  "&version=2",
  "&action=profile-completion",
  "&version=1&version=1",
])("rejeita filtros e parâmetros sem ler dados: %s", async (query) => {
  const { options, handler, request } = setup();
  expect((await handler(request(query))).status).toBe(400);
  expect(options.read).not.toHaveBeenCalled();
});
it("não lê dados sem sessão válida, sem origem confiável ou acima da cota", async () => {
  const { options, handler, request } = setup();
  expect((await handler(request("", "POST"))).status).toBe(405);
  expect((await handler(request("", "GET", "https://evil.example"))).status).toBe(403);
  options.identify.mockResolvedValueOnce({ uid: "own", anonymous: true });
  expect((await handler(request())).status).toBe(401);
  options.identify.mockResolvedValueOnce({ uid: "../other", anonymous: false });
  expect((await handler(request())).status).toBe(401);
  options.consume.mockResolvedValueOnce(false);
  expect((await handler(request())).status).toBe(429);
  expect(options.read).not.toHaveBeenCalled();
});
it("não confunde erro de rede com perfil incompleto nem vaza detalhes", async () => {
  const { options, handler, request } = setup();
  options.read.mockRejectedValueOnce(new Error("private-secret"));
  const response = await handler(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private-secret");
});
