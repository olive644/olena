import { afterEach, expect, it, vi } from "vitest";
import { createMathSound } from "./math-sound";
import { initializeAccessibility, updateAccessibility } from "./accessibility-preferences";
afterEach(() => {
  localStorage.clear();
  initializeAccessibility()();
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
  updateAccessibility({ soundEffects: false });
  sound.play("wrong");
  await Promise.resolve();
  expect(start).toHaveBeenCalledTimes(6);
  expect(close).not.toHaveBeenCalled();
  updateAccessibility({ soundEffects: true });
  const celebration = createMathSound();
  celebration.unlock();
  expect(construct).toHaveBeenCalledOnce();
  sound.dispose();
  expect(close).not.toHaveBeenCalled();
  celebration.play("achievementCommon");
  await Promise.resolve();
  expect(start).toHaveBeenCalledTimes(9);
  celebration.dispose();
  expect(close).toHaveBeenCalledOnce();
  sound.play("xp");
  await Promise.resolve();
  expect(start).toHaveBeenCalledTimes(9);
});
it("gives arcane opening and tarot reveal their own timbre and note sequences", async () => {
  const tones: { type: string; frequency: { setValueAtTime: ReturnType<typeof vi.fn> } }[] = [];
  const parameter = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  const context = {
    state: "running",
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: () => ({ gain: parameter, connect: vi.fn(), disconnect: vi.fn() }),
    createOscillator: () => {
      const tone = {
        type: "triangle",
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      tones.push(tone);
      return tone;
    },
  };
  vi.stubGlobal(
    "AudioContext",
    vi.fn(function () {
      return context;
    }),
  );
  const sound = createMathSound();
  sound.unlock();
  sound.play("chestOpen");
  await Promise.resolve();
  expect(tones).toHaveLength(4);
  expect(tones.every((tone) => tone.type === "triangle")).toBe(true);
  sound.play("arcaneOpen");
  await Promise.resolve();
  expect(tones.slice(4)).toHaveLength(6);
  expect(tones.slice(4).every((tone) => tone.type === "sine")).toBe(true);
  sound.play("tarotReveal");
  await Promise.resolve();
  expect(tones.slice(10)).toHaveLength(5);
  expect(tones[10]!.frequency.setValueAtTime).toHaveBeenCalledWith(523, 0);
  const sequences: number[][] = [];
  for (const cue of [
    "achievementCommon",
    "achievementUncommon",
    "achievementRare",
    "achievementPlace",
  ] as const) {
    const offset = tones.length;
    sound.play(cue);
    await Promise.resolve();
    sequences.push(
      tones.slice(offset).map((tone) => tone.frequency.setValueAtTime.mock.calls[0]![0] as number),
    );
  }
  expect(new Set(sequences.map((sequence) => JSON.stringify(sequence))).size).toBe(4);
  expect(sequences[2]).toHaveLength(6);
  const beforeMute = tones.length;
  updateAccessibility({ soundEffects: false });
  sound.play("achievementRare");
  await Promise.resolve();
  expect(tones).toHaveLength(beforeMute);
  sound.dispose();
});
