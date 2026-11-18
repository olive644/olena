import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("./accessibility-preferences", () => ({ areSoundEffectsEnabled: () => true }));

const stops: number[] = [];
const starts: number[] = [];

beforeEach(() => {
  stops.length = 0;
  starts.length = 0;
  vi.resetModules();
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      currentTime = 1;
      destination = {};
      resume = vi.fn();
      createGain() {
        return {
          connect: vi.fn(),
          gain: {
            value: 0.03,
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            cancelScheduledValues: vi.fn(),
          },
        };
      }
      createOscillator() {
        return {
          type: "",
          frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: (when: number) => starts.push(when),
          stop: (when: number) => stops.push(when),
        };
      }
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

it("a subida do carregamento já nasce com hora de parar, para nunca ficar apitando", async () => {
  const { startPaperHoldSound } = await import("./notebook-paper-sound");
  startPaperHoldSound(700);
  // Parada agendada na criação, sem depender de ninguém chamar a função de parar: 1 + 0,7 + 0,15.
  expect(stops).toHaveLength(1);
  expect(stops[0]).toBeCloseTo(1.85, 6);
});

it("interromper a subida a para na hora e não deixa o tom solto", async () => {
  const { startPaperHoldSound } = await import("./notebook-paper-sound");
  const stop = startPaperHoldSound(700);
  stop();
  stop();
  expect(stops).toHaveLength(2);
  expect(stops[0]).toBeCloseTo(1.85, 6);
  expect(stops[1]).toBeCloseTo(1.08, 6);
});

it("o acorde de conclusão agenda o fim de cada uma das quatro notas", async () => {
  const { playPaperAppliedSound } = await import("./notebook-paper-sound");
  playPaperAppliedSound();
  expect(starts).toHaveLength(4);
  expect(stops).toHaveLength(4);
  stops.forEach((end, index) => expect(end).toBeGreaterThan(starts[index]!));
});
