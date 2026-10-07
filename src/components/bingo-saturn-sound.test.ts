import { afterEach, expect, it, vi } from "vitest";
import { createSaturnSound } from "./bingo-saturn-sound";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("toca efeitos distintos com envelopes suaves, pausa a mistura e libera o áudio", async () => {
  const frequencies: number[] = [];
  const sourceStop = vi.fn();
  const close = vi.fn().mockResolvedValue(undefined);
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
  });
  const source = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: sourceStop,
    onended: null,
  });
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      currentTime = 0;
      sampleRate = 1000;
      destination = {};
      close = close;
      resume = vi.fn();
      createGain() {
        return { gain: param(), connect: vi.fn(), disconnect: vi.fn() };
      }
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      createBufferSource() {
        return source();
      }
      createBiquadFilter() {
        return { ...source(), frequency: param(), Q: param() };
      }
      createOscillator() {
        const frequency = param();
        frequency.setValueAtTime = vi.fn((n) => frequencies.push(n));
        return { ...source(), frequency };
      }
    },
  );
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const sound = createSaturnSound();
  sound.mix();
  expect(frequencies).toEqual([]);
  expect(await sound.unlock()).toBe(true);
  sound.mix();
  expect(frequencies).toHaveLength(10);
  sourceStop.mockClear();
  sound.stop();
  expect(sourceStop).toHaveBeenCalledTimes(21);
  frequencies.length = 0;
  sound.exit();
  expect(frequencies).toEqual([420, 250, 195, 150]);
  frequencies.length = 0;
  sound.reveal();
  expect(frequencies).toEqual([523.25, 659.25, 783.99, 1046.5, 1568]);
  frequencies.length = 0;
  sound.land();
  expect(frequencies).toEqual([150]);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  frequencies.length = 0;
  sound.reveal();
  expect(frequencies).toEqual([]);
  sound.dispose();
  expect(close).toHaveBeenCalledOnce();
});
