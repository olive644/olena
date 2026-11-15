import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({ drawHoverPreview: vi.fn(), drawEraserPreview: vi.fn() }));
// jsdom não implementa canvas 2D: sem um contexto falso, paintLive() nunca chega a
// desenhar nada, então a prévia nunca seria chamada mesmo com a lógica certa.
function fakeContext() {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return () => undefined;
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}
vi.mock("./handwriting-canvas", async (importOriginal) => {
  const original = await importOriginal<typeof import("./handwriting-canvas")>();
  return {
    ...original,
    drawHoverPreview: spies.drawHoverPreview,
    drawEraserPreview: spies.drawEraserPreview,
    pageContext: () => fakeContext(),
  };
});

import { HandwritingStudio } from "./handwriting-studio";
import { NOTEBOOK_PREFERENCES_KEY } from "../data/notebook-preferences";

beforeEach(() => {
  localStorage.clear();
  spies.drawHoverPreview.mockClear();
  spies.drawEraserPreview.mockClear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
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

function renderStudio() {
  const view = render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="hover" />);
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
  return canvas;
}

describe("prévia da caneta ao pairar", () => {
  it("uma caneta pairando (sem tocar) desenha a prévia", () => {
    const canvas = renderStudio();
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawHoverPreview).toHaveBeenCalledTimes(1);
    const point = spies.drawHoverPreview.mock.calls[0]![1] as { x: number; y: number };
    const pageWidth = Number(canvas.dataset["pageWidth"] || 1200);
    expect(point.x).toBeCloseTo((200 / 1200) * pageWidth, 5);
  });

  it("some ao começar a escrever de verdade", () => {
    const canvas = renderStudio();
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawHoverPreview).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(canvas, {
      pointerType: "pen",
      button: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    spies.drawHoverPreview.mockClear();
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 1,
      clientX: 210,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawHoverPreview).not.toHaveBeenCalled();
  });

  it("mouse e toque não mostram prévia", () => {
    const canvas = renderStudio();
    fireEvent.pointerMove(canvas, {
      pointerType: "mouse",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      pointerType: "touch",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 2,
    });
    expect(spies.drawHoverPreview).not.toHaveBeenCalled();
  });

  it("com a preferência desligada, a caneta pairando não mostra nada", () => {
    localStorage.setItem(NOTEBOOK_PREFERENCES_KEY, JSON.stringify({ penHoverPreview: false }));
    const canvas = renderStudio();
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawHoverPreview).not.toHaveBeenCalled();
  });
});

describe("anel da borracha ao pairar", () => {
  function chooseEraser() {
    fireEvent.click(screen.getByRole("button", { name: "Borracha" }));
  }

  it("a caneta pairando com a borracha mostra o anel do tamanho da área apagada", () => {
    const canvas = renderStudio();
    chooseEraser();
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawEraserPreview).toHaveBeenCalledTimes(1);
    const [, point, radius] = spies.drawEraserPreview.mock.calls[0]! as [
      unknown,
      { x: number; y: number },
      number,
    ];
    const pageWidth = Number(canvas.dataset["pageWidth"] || 1200);
    expect(point.x).toBeCloseTo((200 / 1200) * pageWidth, 5);
    // A borracha apaga num raio de três vezes a largura (10 por padrão).
    expect(radius).toBe(30);
    // Com a borracha, a prévia de tinta da caneta não aparece.
    expect(spies.drawHoverPreview).not.toHaveBeenCalled();
  });

  it("o mouse com a borracha também mostra o anel; com a caneta não mostra nada", () => {
    const canvas = renderStudio();
    fireEvent.pointerMove(canvas, {
      pointerType: "mouse",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawEraserPreview).not.toHaveBeenCalled();
    chooseEraser();
    fireEvent.pointerMove(canvas, {
      pointerType: "mouse",
      buttons: 0,
      clientX: 210,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawEraserPreview).toHaveBeenCalledTimes(1);
  });

  it("o anel continua visível enquanto se apaga e depois de soltar", () => {
    const canvas = renderStudio();
    chooseEraser();
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    fireEvent.pointerDown(canvas, {
      pointerType: "pen",
      button: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    // Ao apertar, o anel já aparece no ponto do toque.
    expect(spies.drawEraserPreview).toHaveBeenCalled();
    spies.drawEraserPreview.mockClear();
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 1,
      clientX: 210,
      clientY: 300,
      pointerId: 1,
    });
    // Apagando, o anel acompanha a borracha em vez de sumir.
    expect(spies.drawEraserPreview).toHaveBeenCalled();
    const [, point] = spies.drawEraserPreview.mock.calls.at(-1)!;
    expect(point.x).toBeGreaterThan(200);
    spies.drawEraserPreview.mockClear();
    fireEvent.pointerUp(canvas, {
      pointerType: "pen",
      button: 0,
      clientX: 210,
      clientY: 300,
      pointerId: 1,
    });
    // A caneta continua pairando onde soltou: o anel fica.
    expect(spies.drawEraserPreview).toHaveBeenCalled();
  });

  it("com o dedo o anel some ao soltar, e a preferência de prévia desliga o anel ao apagar", () => {
    const canvas = renderStudio();
    chooseEraser();
    fireEvent.pointerDown(canvas, {
      pointerType: "touch",
      button: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 2,
    });
    spies.drawEraserPreview.mockClear();
    fireEvent.pointerUp(canvas, {
      pointerType: "touch",
      button: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 2,
    });
    // O dedo não paira: depois de soltar não há anel.
    expect(spies.drawEraserPreview).not.toHaveBeenCalled();
  });

  it("sem a prévia ao pairar, apagar também não mostra o anel", () => {
    localStorage.setItem(NOTEBOOK_PREFERENCES_KEY, JSON.stringify({ penHoverPreview: false }));
    const canvas = renderStudio();
    chooseEraser();
    fireEvent.pointerDown(canvas, {
      pointerType: "pen",
      button: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      pointerType: "pen",
      buttons: 1,
      clientX: 210,
      clientY: 300,
      pointerId: 1,
    });
    expect(spies.drawEraserPreview).not.toHaveBeenCalled();
  });
});
