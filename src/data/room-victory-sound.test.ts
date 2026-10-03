import { afterEach, describe, expect, it, vi } from "vitest";
import {
  playRoomFeedbackSound,
  playRoomVictorySound,
  prepareRoomFeedbackSound,
} from "./room-feedback-sound";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("celebração sonora local", () => {
  it("reaproveita o contexto habilitado na resposta até celebrar a vitória", async () => {
    const tones = Array.from({ length: 5 }, () => ({
      type: "",
      frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    }));
    let index = 0;
    const context = {
      state: "running",
      currentTime: 10,
      destination: {},
      close: vi.fn(),
      resume: vi.fn().mockResolvedValue(undefined),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      })),
      createOscillator: vi.fn(() => tones[index++]!),
    };
    const constructor = vi.fn(function () {
      return context;
    });
    vi.stubGlobal("AudioContext", constructor);
    const prepared = prepareRoomFeedbackSound();
    playRoomFeedbackSound(false, prepared);
    await Promise.resolve();
    tones[0]!.onended?.();
    expect(tones[0]!.disconnect).toHaveBeenCalledOnce();
    expect(context.close).not.toHaveBeenCalled();
    playRoomVictorySound();
    expect(constructor).toHaveBeenCalledOnce();
    expect(tones[4]!.frequency.value).toBe(1046.5);
    tones[4]!.onended?.();
    expect(context.close).toHaveBeenCalledOnce();
  });
  it("libera contexto ocioso após três minutos, sem criar um por resposta", () => {
    vi.useFakeTimers();
    const context = {
      state: "running",
      close: vi.fn(),
      resume: vi.fn().mockResolvedValue(undefined),
    };
    const constructor = vi.fn(function () {
      return context;
    });
    vi.stubGlobal("AudioContext", constructor);
    prepareRoomFeedbackSound();
    vi.advanceTimersByTime(1000);
    prepareRoomFeedbackSound();
    vi.advanceTimersByTime(179999);
    expect(constructor).toHaveBeenCalledOnce();
    expect(context.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(context.close).toHaveBeenCalledOnce();
  });
  it("fecha contexto bloqueado sem tentar contornar autoplay", () => {
    const context = { state: "suspended", close: vi.fn(), resume: vi.fn() };
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        return context;
      }),
    );
    playRoomVictorySound();
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.resume).not.toHaveBeenCalled();
  });
  it("agenda quatro notas suaves e libera o contexto ao terminar", () => {
    const tones = Array.from({ length: 4 }, () => ({
      type: "",
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    }));
    let index = 0;
    const context = {
      state: "running",
      currentTime: 10,
      destination: {},
      close: vi.fn(),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      })),
      createOscillator: vi.fn(() => tones[index++]!),
    };
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        return context;
      }),
    );
    playRoomVictorySound();
    expect(tones.map((tone) => tone.frequency.value)).toEqual([523.25, 659.25, 783.99, 1046.5]);
    expect(tones[0]!.start).toHaveBeenCalledWith(10);
    expect(tones[3]!.stop).toHaveBeenCalledWith(10 + 0.27 + 0.36);
    expect(context.close).not.toHaveBeenCalled();
    tones[3]!.onended?.();
    expect(context.close).toHaveBeenCalledOnce();
  });
  it("não impede o resultado quando áudio não está disponível", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(() => playRoomVictorySound()).not.toThrow();
  });
});
