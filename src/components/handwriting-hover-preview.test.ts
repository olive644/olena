import { describe, expect, it } from "vitest";
import { canvasPoint, drawHoverPreview } from "./handwriting-canvas";

function fakeContext() {
  const calls: string[] = [];
  const context = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return (...args: unknown[]) => {
          calls.push(`${String(prop)}(${args.join(",")})`);
        };
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { context, calls };
}

describe("prévia da ponta ao pairar", () => {
  it("desenha um círculo no ponto, sem travar em nenhum raio", () => {
    for (const radius of [-5, 0, 2, 40]) {
      const { context, calls } = fakeContext();
      expect(() => drawHoverPreview(context, { x: 10, y: 20, pressure: 0.5 }, radius, "#7c3aed")) //
        .not.toThrow();
      expect(calls.some((call) => call.startsWith("arc(10,20"))).toBe(true);
      expect(calls).toContain("fill()");
      expect(calls).toContain("stroke()");
    }
  });
});

describe("canvasPoint carrega o giro da caneta", () => {
  it("passa o twist adiante quando o evento informa, e omite quando não informa", () => {
    const canvas = document.createElement("canvas");
    canvas.dataset["pageWidth"] = "1200";
    canvas.dataset["pageHeight"] = "1600";
    const bounds = { left: 0, top: 0, width: 1200, height: 1600 } as DOMRect;
    const withTwist = canvasPoint(
      canvas,
      { clientX: 100, clientY: 100, pressure: 0.5, twist: 90 },
      bounds,
    );
    expect(withTwist.twist).toBe(90);
    const withoutTwist = canvasPoint(canvas, { clientX: 100, clientY: 100, pressure: 0.5 }, bounds);
    expect(withoutTwist.twist).toBeUndefined();
  });
});
