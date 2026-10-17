import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useProfileCompletion } from "./use-profile-completion";
import { profileCompletion } from "../domain/profile-completion";
const mocks = vi.hoisted(() => ({ request: vi.fn(), invalidate: vi.fn() }));
vi.mock("../data/profile-completion", () => ({
  requestProfileCompletion: mocks.request,
  invalidateProfileCompletion: mocks.invalidate,
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mocks.request.mockReset();
  mocks.invalidate.mockReset();
});
it("confere novamente quando uma sincronização lenta finalmente termina", async () => {
  vi.useFakeTimers();
  mocks.request
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(profileCompletion({}, ""));
  const { result, rerender } = renderHook(
    ({ status }) => useProfileCompletion({}, "", true, status),
    { initialProps: { status: "offline" } },
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(result.current).toBe("offline");
  rerender({ status: "synced" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(result.current).toBe("confirmed");
});
it("cancela tentativas anteriores ao recuperar foco e sair da aba", async () => {
  vi.useFakeTimers();
  mocks.request.mockResolvedValue(profileCompletion({}, ""));
  const { unmount } = renderHook(() => useProfileCompletion({ name: "Oli" }, "oli", true));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(mocks.request).toHaveBeenCalledTimes(2);
  unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10000);
  });
  expect(mocks.request).toHaveBeenCalledTimes(2);
});
it("não bloqueia o primeiro render e confirma em segundo plano", async () => {
  vi.useFakeTimers();
  mocks.request.mockResolvedValue(profileCompletion({}, ""));
  const { result } = renderHook(() => useProfileCompletion({}, "", true));
  expect(result.current).toBe("pending");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(result.current).toBe("confirmed");
});
it("aguarda sincronização sem regredir a etapa e revalida após editar", async () => {
  vi.useFakeTimers();
  mocks.request
    .mockResolvedValueOnce(profileCompletion({}, ""))
    .mockResolvedValue(profileCompletion({ name: "Oli" }, "oli"));
  const { result, rerender } = renderHook(
    ({ name }) => useProfileCompletion({ name }, "oli", true),
    { initialProps: { name: "Oli" } },
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(result.current).toBe("pending");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(result.current).toBe("confirmed");
  rerender({ name: "Outro" });
  expect(result.current).toBe("pending");
});
it("não confirma erro de rede e tenta novamente ao recuperar conexão", async () => {
  vi.useFakeTimers();
  mocks.request
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(profileCompletion({}, ""));
  const { result } = renderHook(() => useProfileCompletion({}, "", true));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(result.current).toBe("offline");
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  expect(result.current).toBe("confirmed");
});
it("não consulta em modo convidado ou antes de carregar a conta", async () => {
  vi.useFakeTimers();
  renderHook(() => useProfileCompletion({}, "", false));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10000);
  });
  expect(mocks.request).not.toHaveBeenCalled();
});
