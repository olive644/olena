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
