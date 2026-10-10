import { afterEach, expect, it, vi } from "vitest";
import { createMathSound } from "./math-sound";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("unlocks through a gesture, remains usable beyond three minutes and closes on exit", async () => {
  vi.useFakeTimers();
  const start = vi.fn(),
    close = vi.fn().mockResolvedValue(undefined),
    resume = vi.fn().mockResolvedValue(undefined);
  const parameter = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  const context = {
    state: "running",
    currentTime: 0,
    destination: {},
    resume,
    close,
    createGain: () => ({ gain: parameter, connect: vi.fn(), disconnect: vi.fn() }),
    createOscillator: () => ({
      frequency: parameter,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start,
      stop: vi.fn(),
      onended: null,
      type: "triangle",
    }),
  };
  const construct = vi.fn(function () {
    return context;
  });
  vi.stubGlobal("AudioContext", construct);
  const sound = createMathSound();
  sound.play("correct");
  expect(construct).not.toHaveBeenCalled();
  sound.unlock();
  sound.play("start");
  await Promise.resolve();
  expect(start).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(200000);
  sound.play("correct");
  await Promise.resolve();
  expect(start).toHaveBeenCalledTimes(6);
  expect(close).not.toHaveBeenCalled();
  sound.dispose();
  expect(close).toHaveBeenCalledOnce();
  sound.play("xp");
  await Promise.resolve();
  expect(start).toHaveBeenCalledTimes(6);
});
