import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HandwritingStudio } from "./handwriting-studio";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("o zoom da folha principal conserva o ponto sob o mouse após o novo layout", () => {
  const { container } = render(
    <HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="zoom-anchor-test" />,
  );
  const viewport = container.querySelector<HTMLElement>(".handwriting-viewport")!;
  const canvas = container.querySelector<HTMLCanvasElement>(".handwriting-canvas")!;
  const shell = container.querySelector<HTMLElement>(".handwriting-page-shell")!;
  viewport.scrollLeft = 80;
  viewport.scrollTop = 100;
  canvas.getBoundingClientRect = () => {
    const width = Number.parseFloat(shell.style.width);
    return new DOMRect(20 - viewport.scrollLeft, 40 - viewport.scrollTop, width, width * 1.4);
  };
  const before = canvas.getBoundingClientRect();
  const point = { x: before.left + before.width * 0.35, y: before.top + before.height * 0.45 };
  const anchor = { x: 0.35, y: 0.45 };
  for (const delta of [-120, -80, 100]) {
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      clientX: point.x,
      clientY: point.y,
      deltaY: delta,
    });
    act(() => {
      viewport.dispatchEvent(wheel);
    });
    const after = canvas.getBoundingClientRect();
    expect(wheel.defaultPrevented).toBe(true);
    expect(after.left + anchor.x * after.width).toBeCloseTo(point.x);
    expect(after.top + anchor.y * after.height).toBeCloseTo(point.y);
  }
});
