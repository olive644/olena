import { describe, expect, it } from "vitest";
import { resizeWritingWindow, type WritingResizeEdge } from "./handwriting-writing-window-resize";

describe("redimensionar a janela por todas as bordas", () => {
  const area = { x: 40, y: 30, width: 1400, height: 900 };
  const box = { x: 200, y: 180, width: 600, height: 260 };
  it.each(["n", "ne", "e", "se", "s", "sw", "w", "nw"] as WritingResizeEdge[])(
    "%s respeita os limites e mantém as bordas opostas fixas",
    (edge) => {
      for (const delta of [-2000, -100, 100, 2000]) {
        const next = resizeWritingWindow(box, edge, delta, delta, area);
        expect(next.width).toBeGreaterThanOrEqual(280);
        expect(next.height).toBeGreaterThanOrEqual(160);
        expect(next.width).toBeLessThanOrEqual(1200);
        expect(next.height).toBeLessThanOrEqual(600);
        expect(next.x).toBeGreaterThanOrEqual(area.x);
        expect(next.y).toBeGreaterThanOrEqual(area.y);
        expect(next.x + next.width).toBeLessThanOrEqual(area.x + area.width);
        expect(next.y + next.height).toBeLessThanOrEqual(area.y + area.height);
        if (edge.includes("w")) expect(next.x + next.width).toBe(box.x + box.width);
        else expect(next.x).toBe(box.x);
        if (edge.includes("n")) expect(next.y + next.height).toBe(box.y + box.height);
        else expect(next.y).toBe(box.y);
      }
    },
  );
  it("adapta o mínimo a uma área menor que 280 × 160", () => {
    const small = { x: 10, y: 20, width: 240, height: 130 };
    expect(resizeWritingWindow(box, "se", 10000, 10000, small)).toEqual({ ...small });
  });
});
