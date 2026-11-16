import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { HandwritingWritingWindow } from "./handwriting-writing-window";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it.each(["pointerUp", "pointerCancel"] as const)("redimensiona pelo canto e trata %s", (end) => {
  vi.stubGlobal("ResizeObserver", undefined);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number }) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
      }
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.parentElement;
  });
  const { container } = render(
    <div>
      <div className="handwriting-viewport" />
      <HandwritingWritingWindow
        canvasRef={createRef()}
        view={{ x: 100, y: 110, zoom: 1 }}
        page={{ width: 1200, height: 1600 }}
        tool="pen"
        onNavigate={vi.fn()}
        onStart={vi.fn()}
        onMove={vi.fn()}
        onFinish={vi.fn()}
      />
    </div>,
  );
  const root = container.querySelector<HTMLElement>(".handwriting-writing-window")!;
  const parent = root.parentElement!;
  const viewport = container.querySelector<HTMLElement>(".handwriting-viewport")!;
  viewport.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 700);
  parent.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 700);
  Object.defineProperty(root, "offsetParent", { configurable: true, get: () => parent });
  Object.defineProperty(root, "offsetWidth", {
    configurable: true,
    get: () => Number.parseFloat(root.style.width) || 600,
  });
  Object.defineProperty(root, "offsetHeight", {
    configurable: true,
    get: () => Number.parseFloat(root.style.height) || 260,
  });
  root.getBoundingClientRect = () =>
    new DOMRect(
      Number.parseFloat(root.style.left) || 200,
      Number.parseFloat(root.style.top) || 200,
      root.offsetWidth,
      root.offsetHeight,
    );
  fireEvent(window, new Event("resize"));
  const handle = screen.getByRole("button", { name: "Redimensionar janela SE" });
  Object.defineProperty(handle, "setPointerCapture", { configurable: true, value: vi.fn() });
  Object.defineProperty(handle, "hasPointerCapture", { configurable: true, value: () => false });
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 800, clientY: 460 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 900, clientY: 510 });
  expect(root.style.width).toBe("700px");
  expect(root.style.height).toBe("310px");
  fireEvent[end](handle, { pointerId: 1, clientX: 900, clientY: 510 });
  expect(root.style.width).toBe(end === "pointerCancel" ? "600px" : "700px");
  expect(root.style.height).toBe(end === "pointerCancel" ? "260px" : "310px");
});
