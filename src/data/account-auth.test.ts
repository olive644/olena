import { expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { accountAuthError, reauthenticateAccount, type AccountServices } from "./account-auth";

function setup(provider: string, time = Date.now()) {
  const credential = vi.fn(() => "credential");
  const popup = vi.fn(async () => ({ user }));
  const revoke = vi.fn(async () => {});
  const reauthenticate = vi.fn(async () => {});
  const services = {
    authApi: {
      revokeAccessToken: revoke,
      EmailAuthProvider: { credential },
      reauthenticateWithCredential: reauthenticate,
      reauthenticateWithPopup: popup,
      OAuthProvider: class {
        constructor(readonly id: string) {}
        static credentialFromResult() {
          return { accessToken: "apple-access-token" };
        }
      },
      GoogleAuthProvider: class {},
    },
  } as unknown as AccountServices;
  const user = {
    email: "learner@example.test",
    getIdToken: vi.fn(async () => "firebase-token"),
    providerData: [{ providerId: "google.com" }],
    getIdTokenResult: vi.fn(async () => ({
      signInProvider: provider,
      authTime: new Date(time).toISOString(),
    })),
  } as unknown as User;
  return { services, user, credential, popup, reauthenticate, revoke };
}
it("reauthenticates the active password method even when Google was linked first", async () => {
  const s = setup("password");
  await reauthenticateAccount(s.services, s.user, "secret-password");
  expect(s.credential).toHaveBeenCalledWith("learner@example.test", "secret-password");
  expect(s.reauthenticate).toHaveBeenCalledWith(s.user, "credential");
  expect(s.popup).not.toHaveBeenCalled();
});
it("uses Apple for an active Apple session", async () => {
  const s = setup("apple.com");
  await reauthenticateAccount(s.services, s.user);
  expect(s.popup).toHaveBeenCalledWith(s.user, expect.objectContaining({ id: "apple.com" }));
  expect(s.popup).toHaveBeenCalledOnce();
  expect(s.revoke).toHaveBeenCalledWith(s.services.auth, "apple-access-token");
});

it("does not proceed when Apple token revocation fails", async () => {
  const s = setup("apple.com");
  s.revoke.mockRejectedValueOnce(new Error("revocation-failed"));
  await expect(reauthenticateAccount(s.services, s.user)).rejects.toThrow("revocation-failed");
});
it("refuses old or future Discord authorizations before deletion", async () => {
  for (const time of [Date.now() - 6 * 60000, Date.now() + 60000]) {
    const s = setup("custom", time);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ recent: false })),
    );
    await expect(reauthenticateAccount(s.services, s.user)).rejects.toThrow(
      "recent-login-required",
    );
  }
  const s = setup("custom");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ recent: true })),
  );
  await expect(reauthenticateAccount(s.services, s.user)).resolves.toBeUndefined();
});
it("does not distinguish unknown emails from wrong passwords", () => {
  expect(accountAuthError({ code: "auth/user-not-found" })).toBe(
    accountAuthError({ code: "auth/wrong-password" }),
  );
});
