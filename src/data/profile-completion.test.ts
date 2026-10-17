import { afterEach, expect, it, vi } from "vitest";
import {
  invalidateProfileCompletion,
  parseProfileCompletion,
  requestProfileCompletion,
} from "./profile-completion";
import { profileCompletion } from "../domain/profile-completion";
const mock = vi.hoisted(() => ({
  auth: {
    currentUser: { uid: "one", isAnonymous: false, getIdToken: async () => "test-token" },
    authStateReady: async () => {},
  },
}));
vi.mock("./firebase-account", () => ({
  getFirebaseAccountServices: async () => ({ auth: mock.auth }),
}));
afterEach(() => {
  invalidateProfileCompletion();
  vi.unstubAllGlobals();
  mock.auth.currentUser.uid = "one";
  mock.auth.currentUser.isAnonymous = false;
});
it("valida coerência, versão e ordem das etapas", () => {
  const value = profileCompletion({}, "");
  expect(parseProfileCompletion(value)).toEqual(value);
  for (const bad of [
    null,
    { ...value, version: 2 },
    { ...value, complete: true },
    { ...value, completed: 3 },
    { ...value, next: "cover" },
    { ...value, steps: [] },
  ])
    expect(() => parseProfileCompletion(bad)).toThrow();
});
it("deduplica, isola conta e não envia dados de perfil no pedido", async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(profileCompletion({}, ""))),
  );
  vi.stubGlobal("fetch", fetcher);
  await Promise.all([requestProfileCompletion("same"), requestProfileCompletion("same")]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe("/api/olena?action=profile-completion&version=1");
  mock.auth.currentUser.uid = "two";
  await requestProfileCompletion("same");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("descarta resposta antiga após troca de conta", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      mock.auth.currentUser.uid = "other";
      return new Response(JSON.stringify(profileCompletion({}, "")));
    }),
  );
  await expect(requestProfileCompletion("old")).rejects.toThrow("A conta mudou");
});
