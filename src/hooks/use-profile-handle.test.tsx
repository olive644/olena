import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useProfileHandle } from "./use-profile-handle";
import { PROFILE_HANDLE_CHANGED } from "../data/profile-handle";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  listener: undefined as ((user: { uid: string; isAnonymous: boolean } | null) => void) | undefined,
}));
vi.mock("../data/firebase-account", () => ({
  getFirebaseAccountServices: async () => ({
    auth: {},
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
        mocks.listener = listener;
        return () => {
          mocks.listener = undefined;
        };
      },
    },
  }),
}));
vi.mock("../data/profile-handle", () => ({
  PROFILE_HANDLE_CHANGED: "olena:profile-handle-changed",
  requestProfileHandle: mocks.request,
}));
afterEach(() => {
  mocks.request.mockReset();
  mocks.listener = undefined;
  localStorage.clear();
});
it("não confia no perfil legado e só concede CREKS após resposta autenticada", async () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ username: "oliver644", creks: true }));
  mocks.request
    .mockResolvedValueOnce({ username: "", creks: false, preferredUsername: "oliver644" })
    .mockResolvedValueOnce({ username: "oliver644", creks: true });
  const { result } = renderHook(() => useProfileHandle(false));
  expect(result.current.handle).toEqual({ username: "", creks: false });
  await waitFor(() => expect(mocks.listener).toBeTypeOf("function"));
  act(() => mocks.listener?.({ uid: "owner", isAnonymous: false }));
  await waitFor(() =>
    expect(result.current.handle).toEqual({ username: "oliver644", creks: true }),
  );
  expect(mocks.request).toHaveBeenLastCalledWith("POST", "oliver644");
});
it("resposta atrasada após sair não vaza @ e evento de edição refaz leitura", async () => {
  let finish: ((value: { username: string; creks: boolean }) => void) | undefined;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = renderHook(() => useProfileHandle(false));
  await waitFor(() => expect(mocks.listener).toBeTypeOf("function"));
  act(() => mocks.listener?.({ uid: "a", isAnonymous: false }));
  act(() => mocks.listener?.(null));
  await act(async () => finish?.({ username: "antigo", creks: true }));
  expect(result.current.handle).toEqual({ username: "", creks: false });
  act(() => window.dispatchEvent(new Event(PROFILE_HANDLE_CHANGED)));
  await waitFor(() => expect(mocks.listener).toBeTypeOf("function"));
  mocks.request.mockResolvedValueOnce({ username: "novo", creks: false });
  act(() => mocks.listener?.({ uid: "b", isAnonymous: false }));
  await waitFor(() => expect(result.current.handle.username).toBe("novo"));
});
