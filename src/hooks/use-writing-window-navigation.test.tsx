import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { HandwritingWritingWindow } from "../components/handwriting-writing-window";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(
        type: string,
        options: MouseEventInit & { pointerId?: number; pointerType?: string },
      ) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
        this.pointerType = options.pointerType ?? "mouse";
      }
    },
  );
  const onNavigate = vi.fn(),
    onStart = vi.fn(),
    onMove = vi.fn(),
    onFinish = vi.fn();
  render(
    <HandwritingWritingWindow
      canvasRef={createRef()}
      view={{ x: 200, y: 300, zoom: 1 }}
      page={{ width: 1200, height: 1600 }}
      tool="pen"
      onNavigate={onNavigate}
      onStart={onStart}
      onMove={onMove}
      onFinish={onFinish}
    />,
  );
  const canvas = screen.getByLabelText("Área ampliada para escrever com dedo ou caneta");
  canvas.getBoundingClientRect = () => new DOMRect(100, 50, 600, 220);
  Object.defineProperty(canvas, "setPointerCapture", { value: vi.fn(), configurable: true });
  Object.defineProperty(canvas, "hasPointerCapture", { value: () => false, configurable: true });
  return { canvas, onNavigate, onStart, onMove, onFinish };
}

it("Ctrl+scroll mantém o ponto sob o mouse e bloqueia o zoom da página do navegador", () => {
  const { canvas, onNavigate } = setup();
  const event = new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    clientX: 250,
    clientY: 160,
    deltaY: -100,
    ctrlKey: true,
  });
  act(() => {
    canvas.dispatchEvent(event);
  });
  const next = onNavigate.mock.calls.at(-1)![0];
  expect(event.defaultPrevented).toBe(true);
  expect(next.x + (0.25 * 500) / next.zoom).toBeCloseTo(200 + 0.25 * 500);
  expect(next.y + (0.5 * 185) / next.zoom).toBeCloseTo(300 + 0.5 * 185);
});
it("arrastar com o botão do meio move a área sem desenhar", () => {
  const { canvas, onNavigate, onStart, onMove, onFinish } = setup();
  fireEvent.pointerDown(canvas, {
    button: 1,
    buttons: 4,
    pointerId: 1,
    clientX: 300,
    clientY: 150,
  });
  fireEvent.pointerMove(canvas, { buttons: 4, pointerId: 1, clientX: 360, clientY: 172 });
  fireEvent.pointerUp(canvas, { button: 1, pointerId: 1, clientX: 360, clientY: 172 });
  expect(onNavigate.mock.calls.at(-1)![0].x).toBeCloseTo(150);
  expect(onNavigate.mock.calls.at(-1)![0].y).toBeCloseTo(281.5);
  expect(onStart).not.toHaveBeenCalled();
  expect(onMove).not.toHaveBeenCalled();
  expect(onFinish).not.toHaveBeenCalled();
});
it("pinça amplia no centro dos dedos sem criar traços", () => {
  const { canvas, onNavigate, onStart, onMove } = setup();
  fireEvent.pointerDown(canvas, { pointerType: "touch", pointerId: 1, clientX: 300, clientY: 160 });
  fireEvent.pointerDown(canvas, { pointerType: "touch", pointerId: 2, clientX: 500, clientY: 160 });
  fireEvent.pointerMove(canvas, { pointerType: "touch", pointerId: 2, clientX: 600, clientY: 160 });
  const next = onNavigate.mock.calls.at(-1)![0];
  expect(next.zoom).toBeCloseTo(1.5);
  expect(next.x + ((350 / 600) * 500) / next.zoom).toBeCloseTo(200 + 0.5 * 500);
  expect(onStart).not.toHaveBeenCalled();
  expect(onMove).not.toHaveBeenCalled();
});
