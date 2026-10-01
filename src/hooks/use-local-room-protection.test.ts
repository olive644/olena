import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useLocalRoom } from "./use-local-room";

vi.mock("../data/room-app-check", () => ({
  roomAppCheckToken: () => new Promise<string>(() => {}),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it("libera o loading quando o App Check não responde no prazo", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => useLocalRoom());
  let request: Promise<unknown>;
  act(() => {
    request = result.current.createRoom({
      difficulty: "mixed",
      questionCount: 5,
      roundSeconds: 30,
    });
  });
  expect(result.current.busy).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
    await request;
  });
  expect(result.current.busy).toBe(false);
  expect(result.current.error).toBe("Não foi possível criar a sala.");
  expect(fetchMock).not.toHaveBeenCalled();
});
