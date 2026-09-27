import { createEvent, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({ predictedTail: vi.fn(), withPredictedTail: vi.fn() }));
vi.mock("./handwriting-prediction", async (importOriginal) => {
  const original = await importOriginal<typeof import("./handwriting-prediction")>();
  spies.predictedTail.mockImplementation(original.predictedTail);
  spies.withPredictedTail.mockImplementation(original.withPredictedTail);
  return {
    ...original,
    predictedTail: spies.predictedTail,
    withPredictedTail: spies.withPredictedTail,
  };
});

import { HandwritingStudio } from "./handwriting-studio";
import { NOTEBOOK_PREFERENCES_KEY } from "../data/notebook-preferences";

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  localStorage.clear();
  spies.predictedTail.mockClear();
  spies.withPredictedTail.mockClear();
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function draw(predicted: { clientX: number; clientY: number }[]) {
  const view = render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="pred" />);
  const canvas = view.container.querySelector<HTMLCanvasElement>("canvas.handwriting-canvas")!;
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 1200,
    height: 1600,
    right: 1200,
    bottom: 1600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
  const move = createEvent.pointerMove(canvas, { clientX: 130, clientY: 100, pointerId: 1 });
  Object.defineProperty(move, "getPredictedEvents", {
    value: () => predicted.map((point) => ({ ...point, pressure: 0.5 })),
  });
  fireEvent(canvas, move);
  // Pinta o quadro pendente, como o navegador faria.
  for (const frame of frames.splice(0)) frame(0);
}

describe("previsão da ponta da caneta na tela", () => {
  it("pede a ponta prevista ao navegador e a usa para desenhar o traço ao vivo", () => {
    // Sem o filtro de suavização o fim do traço acompanha o ponteiro, e a previsão fica ligada a ele.
    localStorage.setItem(NOTEBOOK_PREFERENCES_KEY, JSON.stringify({ stabilization: false }));
    draw([
      { clientX: 140, clientY: 100 },
      { clientX: 150, clientY: 100 },
    ]);
    expect(spies.predictedTail).toHaveBeenCalled();
    const samples = spies.predictedTail.mock.calls.at(-1)![1] as { x: number; y: number }[];
    // As posições chegam em unidades da folha (a largura depende do papel).
    const pageWidth = Number(
      document.querySelector<HTMLCanvasElement>("canvas.handwriting-canvas")!.dataset[
        "pageWidth"
      ] || 1200,
    );
    expect(samples).toHaveLength(2);
    expect(samples[0]!.x).toBeCloseTo((140 / 1200) * pageWidth, 5);
    expect(samples[1]!.x).toBeGreaterThan(samples[0]!.x);
    // A ponta escolhida existe (o desenho em si depende do canvas, que o jsdom não tem).
    const tail = spies.predictedTail.mock.results.at(-1)!.value as unknown[];
    expect(tail.length).toBeGreaterThan(0);
  });

  it("com a preferência desligada não prevê nada", () => {
    localStorage.setItem(NOTEBOOK_PREFERENCES_KEY, JSON.stringify({ inkPrediction: false }));
    draw([{ clientX: 140, clientY: 100 }]);
    expect(spies.predictedTail).not.toHaveBeenCalled();
  });
});
