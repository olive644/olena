import { describe, expect, it } from "vitest";
import { drawStroke } from "./handwriting-canvas";
import type { Stroke } from "./handwriting-types";

// Contexto 2D falso: qualquer método não usado vira um no-op, e propriedades
// (globalAlpha, strokeStyle...) são só guardadas para conferência.
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

const line: Stroke = {
  id: "line",
  tool: "highlighter",
  color: "#facc15",
  width: 20,
  points: [
    { x: 0, y: 0, pressure: 0.5 },
    { x: 100, y: 0, pressure: 0.5 },
  ],
};

describe("opacidade do marca-texto", () => {
  it("usa 30% quando o traço não guarda opacidade (compatibilidade com traços antigos)", () => {
    const context = fakeContext();
    drawStroke(context, line);
    expect(context.globalAlpha).toBe(0.3);
  });

  it("usa a opacidade guardada no traço", () => {
    const context = fakeContext();
    drawStroke(context, { ...line, opacity: 0.6 });
    expect(context.globalAlpha).toBe(0.6);
  });

  it("não afeta a caneta, que continua opaca", () => {
    const context = fakeContext();
    drawStroke(context, { ...line, tool: "pen", opacity: 0.6 });
    expect(context.globalAlpha).toBe(1);
  });
});
