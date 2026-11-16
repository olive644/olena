import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HandwritingStudio } from "./handwriting-studio";
import { NOTEBOOK_SHORTCUTS_KEY } from "../data/notebook-shortcuts";

beforeEach(() => {
  localStorage.clear();
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
  const view = render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="spen" />);
  const canvas = view.container.querySelector<HTMLCanvasElement>("canvas.handwriting-canvas")!;
  const studio = view.container.querySelector<HTMLElement>(".handwriting-studio")!;
  return { canvas, studio };
}

describe("botão lateral da S Pen", () => {
  it("executa a ação do botão lateral mesmo quando é apertado antes de encostar na tela", () => {
    localStorage.setItem(NOTEBOOK_SHORTCUTS_KEY, JSON.stringify({ penSide: "select" }));
    const { canvas, studio } = renderStudio();
    expect(studio.dataset["tool"]).toBe("pen");
    // O navegador manda button 0 e buttons 3 (toque + botão lateral).
    fireEvent.pointerDown(canvas, {
      pointerType: "pen",
      button: 0,
      buttons: 3,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    expect(studio.dataset["tool"]).toBe("select");
  });

  it("um toque comum da caneta, sem o botão, não muda de ferramenta", () => {
    localStorage.setItem(NOTEBOOK_SHORTCUTS_KEY, JSON.stringify({ penSide: "select" }));
    const { canvas, studio } = renderStudio();
    fireEvent.pointerDown(canvas, {
      pointerType: "pen",
      button: 0,
      buttons: 1,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    expect(studio.dataset["tool"]).toBe("pen");
  });
});

it.each(["pointerUp", "pointerCancel"] as const)(
  "a bolinha pertence ao cursor s� durante o tra�o e some em %s",
  (end) => {
    const { canvas } = renderStudio();
    fireEvent.pointerMove(canvas, {
      pointerType: "mouse",
      buttons: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    expect(canvas.style.cursor).toBe("");
    fireEvent.pointerDown(canvas, {
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    expect(canvas.style.cursor).toContain("circle");
    expect(canvas.style.cursor).toContain("6 21");
    fireEvent[end](canvas, {
      pointerType: "mouse",
      button: 0,
      buttons: 0,
      clientX: 130,
      clientY: 110,
      pointerId: 1,
    });
    expect(canvas.style.cursor).toBe("");
  },
);
