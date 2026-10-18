import { beforeEach, expect, it, vi } from "vitest";
import { requestSupport } from "./support";

const account = vi.hoisted(() => ({
  auth: {
    currentUser: { uid: "alice", isAnonymous: false, getIdToken: vi.fn() } as {
      uid: string;
      isAnonymous: boolean;
      getIdToken: () => Promise<string>;
    } | null,
    authStateReady: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("./firebase-account", () => ({ getFirebaseAccountServices: async () => account }));
beforeEach(() => {
  account.auth.currentUser = {
    uid: "alice",
    isAnonymous: false,
    getIdToken: vi.fn().mockResolvedValue("test-token"),
  };
});
it("sends the credential only in the authorization header", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ staff: false }));
  vi.stubGlobal("fetch", fetcher);
  await requestSupport({ text: "Ajuda", requestId: "request" });
  expect(fetcher.mock.calls[0]?.[0]).toBe("/api/olena?action=support");
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    method: "POST",
    cache: "no-store",
    headers: { Authorization: "Bearer test-token" },
  });
});
it("discards a response if the account changes during the request", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      account.auth.currentUser = null;
      return Response.json({ staff: true });
    }),
  );
  await expect(requestSupport()).rejects.toThrow("A conta mudou");
});
it("does not request support without an account", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  account.auth.currentUser = null;
  await expect(requestSupport()).rejects.toThrow("Entre na conta");
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects malformed server content", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ staff: "true", ticket: {} })));
  await expect(requestSupport()).rejects.toThrow("Resposta inválida");
});
