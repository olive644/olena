import { afterEach, expect, it, vi } from "vitest";
import { createNotebookSound } from "./notebook-sound";
import { initializeAccessibility, updateAccessibility } from "./accessibility-preferences";

afterEach(() => {
  localStorage.clear();
  initializeAccessibility()();
  vi.unstubAllGlobals();
});

function fakeAudio() {
  const parameter = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 };
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const started = vi.fn();
  const context = {
    state: "running",
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => ({ ...node(), buffer: null, start: started, onended: null }),
    createBiquadFilter: () => ({ ...node(), type: "", frequency: parameter, Q: { value: 0 } }),
    createGain: () => ({ ...node(), gain: parameter }),
  };
  const construct = vi.fn(function () {
    return context;
  });
  vi.stubGlobal("AudioContext", construct);
  return { context, construct, started };
}

it("só toca depois de um gesto e respeita a preferência de efeitos sonoros", () => {
  const { construct, started, context } = fakeAudio();
  const sound = createNotebookSound();
  expect(sound.play("turn")).toBe(false);
  expect(construct).not.toHaveBeenCalled();
  sound.unlock();
  expect(sound.play("turn")).toBe(true);
  expect(started).toHaveBeenCalledTimes(2);
  updateAccessibility({ soundEffects: false });
  expect(sound.play("cover")).toBe(false);
  updateAccessibility({ soundEffects: true });
  sound.dispose();
  expect(context.close).toHaveBeenCalled();
  expect(sound.play("tab")).toBe(false);
});

it("folhear em sequência não empilha estalos no mesmo instante", () => {
  const { context } = fakeAudio();
  const sound = createNotebookSound();
  sound.unlock();
  expect(sound.play("riffle")).toBe(true);
  expect(sound.play("riffle")).toBe(false);
  context.currentTime = 0.1;
  expect(sound.play("riffle")).toBe(true);
  sound.dispose();
});

it("não cria áudio quando os efeitos estão desligados", () => {
  const { construct } = fakeAudio();
  updateAccessibility({ soundEffects: false });
  const sound = createNotebookSound();
  sound.unlock();
  expect(construct).not.toHaveBeenCalled();
});
