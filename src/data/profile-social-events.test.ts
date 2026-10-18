import { afterEach, expect, it, vi } from "vitest";
import { subscribeSocialUpdates } from "./profile-social-events";

const mocks = vi.hoisted(() => ({
  user: { uid: "b", isAnonymous: false, getIdToken: vi.fn(async () => "test-token") },
}));
vi.mock("./firebase-account", () => ({
  getFirebaseAccountServices: async () => ({
    auth: {
      authStateReady: async () => {},
      get currentUser() {
        return mocks.user;
      },
    },
  }),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("recebe mudança por streaming sem aguardar polling e compartilha uma conexão", async () => {
  let send: ReadableStreamDefaultController<Uint8Array> | undefined;
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            send = controller;
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  const changed = vi.fn();
  window.addEventListener("olena:social-changed", changed);
  const stopA = subscribeSocialUpdates("b");
  const stopB = subscribeSocialUpdates("b");
  try {
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    send!.enqueue(new TextEncoder().encode('data: {"type":"changed"}\n\n'));
    await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/profile-social?stream=1");
    stopA();
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    stopB(true);
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  } finally {
    stopA();
    stopB();
    window.removeEventListener("olena:social-changed", changed);
  }
});
