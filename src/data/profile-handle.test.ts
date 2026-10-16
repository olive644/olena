import { afterEach, expect, it, vi } from "vitest";
import { requestProfileHandle } from "./profile-handle";
const mocks = vi.hoisted(() => {
  const user = { uid: "a", isAnonymous: false, getIdToken: vi.fn(async () => "token") };
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
it("não envia requisição sem login ou como guest", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  mocks.auth.currentUser = null;
  await expect(requestProfileHandle("POST", "nome")).rejects.toThrow("Entre");
  mocks.auth.currentUser = mocks.user;
  mocks.user.isAnonymous = true;
  await expect(requestProfileHandle("POST", "nome")).rejects.toThrow("Entre");
  expect(fetch).not.toHaveBeenCalled();
});
it("envia token, mostra conflito e rejeita resposta após troca de conta", async () => {
  const fetch = vi.fn(
    async () => new Response(JSON.stringify({ error: "Esse @ já está em uso." }), { status: 409 }),
  );
  vi.stubGlobal("fetch", fetch);
  await expect(requestProfileHandle("POST", "nome")).rejects.toThrow("já está em uso");
  expect(fetch).toHaveBeenCalledWith(
    "/api/profile-handle",
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer token" }),
    }),
  );
  fetch.mockImplementation(async () => {
    mocks.auth.currentUser = null;
    return new Response(JSON.stringify({ username: "nome", creks: false }));
  });
  await expect(requestProfileHandle("POST", "nome")).rejects.toThrow("conta mudou");
});
