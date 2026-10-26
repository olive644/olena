import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  redirect: vi.fn(async () => ({ user: { uid: "owner" } })),
  persistence: vi.fn(async () => {}),
}));
vi.mock("firebase/app", () => ({
  getApps: () => [{ name: "helena-account" }],
  initializeApp: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  getRedirectResult: mocks.redirect,
  setPersistence: mocks.persistence,
  browserLocalPersistence: {},
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});
it("shares initialization so concurrent consumers cannot consume the OAuth result twice", async () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "test-key");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "project.firebaseapp.com");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
  const { getFirebaseAccountServices } = await import("./firebase-account");
  const [first, second] = await Promise.all([
    getFirebaseAccountServices(),
    getFirebaseAccountServices(),
  ]);
  expect(mocks.redirect).toHaveBeenCalledOnce();
  expect(mocks.persistence).toHaveBeenCalledOnce();
  expect(first).toBe(second);
  expect(first.redirectResult?.user.uid).toBe("owner");
});
