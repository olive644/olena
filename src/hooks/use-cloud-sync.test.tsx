import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
import { useCloudSync } from "./use-cloud-sync";

vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITEST", "");
  vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "auth.example");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("mantém alteração pendente após falha e permite tentar a sincronização novamente", async () => {
  const user = {
    uid: "user-1",
    displayName: "Helena",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  const signOut = vi.fn(async () => undefined);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut,
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);

  let writeCount = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") return new Response("null", { status: 200 });
      writeCount += 1;
      if (writeCount === 2) return new Response("failure", { status: 503 });
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  act(() => writeSyncedStorage("helena.soloProgress", "3"));
  await waitFor(() => expect(result.current.status).toBe("offline"));
  expect(writeCount).toBe(2);

  act(() => result.current.syncNow?.());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(writeCount).toBe(3);

  await act(async () => result.current.signOut?.());
  expect(signOut).toHaveBeenCalledOnce();
  expect(localStorage.getItem("helena.soloProgress")).toBeNull();
});
