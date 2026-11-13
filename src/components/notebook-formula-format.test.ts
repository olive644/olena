import { describe, expect, it, vi } from "vitest";
import {
  drawNotebookFormula,
  layoutNotebookFormula,
  parseNotebookFormula,
} from "./notebook-formula-format";

describe("fórmulas na folha", () => {
  it("empilha numerador e denominador com barra entre eles", () => {
    const layout = layoutNotebookFormula(parseNotebookFormula(String.raw`\frac{1}{2}`));
    const top = layout.items.find((item) => item.kind === "text" && item.text === "1");
    const bottom = layout.items.find((item) => item.kind === "text" && item.text === "2");
    const bar = layout.items.find((item) => item.kind === "line");
    expect(top!.y).toBeLessThan(bar!.y);
    expect(bottom!.y).toBeGreaterThan(bar!.y);
    expect(layout.height).toBeGreaterThan(2);
  });
  it("preserva comandos desconhecidos e limita entradas malformadas", () => {
    expect(JSON.stringify(parseNotebookFormula(String.raw`\unknown{x}`))).toContain("unknown");
    const layout = layoutNotebookFormula(parseNotebookFormula(String.raw`\sqrt{\frac{x^{3}}{2}}`));
    expect(layout.items.filter((item) => item.kind === "line")).toHaveLength(2);
    expect(Number.isFinite(layout.width + layout.height)).toBe(true);
    expect(() => parseNotebookFormula("\\sqrt{".repeat(1000))).not.toThrow();
  });
  it("exporta a mesma fração com barra e textos em posições distintas", () => {
    const fillText = vi.fn(),
      fillRect = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      fillText,
      fillRect,
    } as unknown as CanvasRenderingContext2D;
    drawNotebookFormula(context, String.raw`\frac{1}{2}`, 10, 20, 100, 100);
    expect(fillRect).toHaveBeenCalledOnce();
    expect(fillText).toHaveBeenCalledTimes(2);
    expect(fillText.mock.calls[0]![2]).toBeLessThan(fillText.mock.calls[1]![2]);
  });
});
