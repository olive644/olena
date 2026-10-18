import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSocialFeed } from "./use-social-feed";
import type { SocialFeed } from "../domain/profile-social";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  listener: undefined as ((user: { uid: string; isAnonymous: boolean } | null) => void) | undefined,
}));
vi.mock("../data/profile-social-events", () => ({ subscribeSocialUpdates: () => () => {} }));
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
  act(() => mocks.listener?.(null));
  cleanup();
  mocks.request.mockReset();
  mocks.listener = undefined;
  vi.restoreAllMocks();
});
it("consulta em dez segundos e atualiza ao voltar para uma aba visível", async () => {
  const interval = vi.spyOn(window, "setInterval");
  mocks.request.mockResolvedValue(feed("alice"));
  renderHook(() => useSocialFeed(true));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
  expect(interval.mock.calls.some((call) => call[1] === 10000)).toBe(true);
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11000);
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
});
it("compartilha consulta em andamento entre sino e perfil", async () => {
  let finish: ((value: SocialFeed) => void) | undefined;
  mocks.request.mockImplementation(
    () =>
      new Promise<SocialFeed>((resolve) => {
        finish = resolve;
      }),
  );
  const first = renderHook(() => useSocialFeed(true));
  const second = renderHook(() => useSocialFeed(true));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
  await act(async () => finish?.(feed("alice")));
  expect(first.result.current?.self.username).toBe("alice");
  expect(second.result.current?.self.username).toBe("alice");
});
it("reutiliza números confirmados ao reabrir e não os apaga se a atualização falhar", async () => {
  mocks.request.mockResolvedValueOnce(feed("alice"));
  const first = renderHook(() => useSocialFeed(true));
  await waitFor(() => expect(first.result.current?.self.username).toBe("alice"));
  first.unmount();
  mocks.request.mockRejectedValueOnce(new Error("offline"));
  const second = renderHook(() => useSocialFeed(true));
  await waitFor(() => expect(second.result.current?.self.username).toBe("alice"));
  await act(async () => {
    window.dispatchEvent(new Event("olena:social-changed"));
  });
  expect(second.result.current?.self.username).toBe("alice");
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
it("refaz a consulta se uma alteração ocorrer durante a resposta antiga", async () => {
  let finish: ((value: SocialFeed) => void) | undefined;
  mocks.request
    .mockImplementationOnce(
      () =>
        new Promise<SocialFeed>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(feed("updated"));
  const { result } = renderHook(() => useSocialFeed(true));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
  act(() => window.dispatchEvent(new Event("olena:social-changed")));
  await act(async () => finish?.(feed("old")));
  await waitFor(() => expect(result.current?.self.username).toBe("updated"));
  expect(mocks.request).toHaveBeenCalledTimes(2);
});
it("não consulta quando desativado", () => {
  renderHook(() => useSocialFeed(false));
  expect(mocks.request).not.toHaveBeenCalled();
});
