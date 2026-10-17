import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSocialFeed } from "./use-social-feed";
import type { SocialFeed } from "../domain/profile-social";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  listener: undefined as ((user: { uid: string; isAnonymous: boolean } | null) => void) | undefined,
}));
vi.mock("../data/profile-social", () => ({
  requestSocial: mocks.request,
  SOCIAL_CHANGED: "olena:social-changed",
}));
vi.mock("../data/firebase-account", () => ({
  getFirebaseAccountServices: async () => ({
    auth: {},
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
        mocks.listener = listener;
        listener?.({ uid: "a", isAnonymous: false });
        return () => {};
      },
    },
  }),
}));
const feed = (username: string): SocialFeed => ({
  self: {
    username,
    name: username,
    photoUrl: "/profile-avatars/helena.webp",
    followers: 0,
    following: 0,
    followsYou: false,
    followed: false,
    shared: false,
  },
  notifications: [],
});
afterEach(() => {
  cleanup();
  mocks.request.mockReset();
  mocks.listener = undefined;
});
it("troca de conta limpa o feed anterior e ignora resposta atrasada", async () => {
  let finishA: ((value: SocialFeed) => void) | undefined;
  mocks.request
    .mockImplementationOnce(
      () =>
        new Promise<SocialFeed>((resolve) => {
          finishA = resolve;
        }),
    )
    .mockResolvedValueOnce(feed("bob"));
  const { result } = renderHook(() => useSocialFeed(true));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
  act(() => mocks.listener?.({ uid: "b", isAnonymous: false }));
  await waitFor(() => expect(result.current?.self.username).toBe("bob"));
  await act(async () => finishA?.(feed("alice")));
  expect(result.current?.self.username).toBe("bob");
  act(() => mocks.listener?.(null));
  expect(result.current).toBeUndefined();
});
it("não consulta quando desativado", () => {
  renderHook(() => useSocialFeed(false));
  expect(mocks.request).not.toHaveBeenCalled();
});
