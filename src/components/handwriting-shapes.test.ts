import { describe, expect, it } from "vitest";
import { recognizeShape } from "./handwriting-shapes";
import type { HandwritingPoint } from "../domain/handwriting";

// Gera pontos ao longo de uma linha poligonal, com um tremor determinístico.
function trace(vertices: [number, number][], wobble = 0, step = 8): HandwritingPoint[] {
  const points: HandwritingPoint[] = [];
  let counter = 0;
  for (let index = 1; index < vertices.length; index += 1) {
    const [x1, y1] = vertices[index - 1]!;
    const [x2, y2] = vertices[index]!;
    const length = Math.hypot(x2 - x1, y2 - y1);
    const count = Math.max(1, Math.round(length / step));
    for (let cursor = 0; cursor < count; cursor += 1) {
      const t = cursor / count;
      counter += 1;
      points.push({
        x: x1 + (x2 - x1) * t + Math.sin(counter * 1.7) * wobble,
        y: y1 + (y2 - y1) * t + Math.cos(counter * 2.3) * wobble,
        pressure: 0.5,
      });
    }
  }
  const [lx, ly] = vertices.at(-1)!;
  points.push({ x: lx, y: ly, pressure: 0.5 });
  return points;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, wobble = 0): HandwritingPoint[] {
  return Array.from({ length: 80 }, (_, index) => {
    const angle = (index / 80) * Math.PI * 2;
    return {
      x: cx + Math.cos(angle) * rx + Math.sin(index * 1.9) * wobble,
      y: cy + Math.sin(angle) * ry + Math.cos(index * 2.7) * wobble,
      pressure: 0.5,
    };
  });
}

describe("reconhecer formas", () => {
  it("uma reta torta vira uma reta de verdade", () => {
    const shape = recognizeShape(
      trace(
        [
          [100, 100],
          [400, 120],
        ],
        2,
      ),
    );
    expect(shape?.kind).toBe("line");
    const start = shape!.points[0]!;
    const end = shape!.points.at(-1)!;
    expect(Math.abs(start.x - 100)).toBeLessThan(5);
    expect(Math.abs(start.y - 100)).toBeLessThan(5);
    expect(end.x).toBeGreaterThan(390);
  });

  it("uma elipse tremida vira uma elipse regular", () => {
    const shape = recognizeShape(ellipse(300, 300, 120, 80, 3));
    expect(shape?.kind).toBe("ellipse");
    const xs = shape!.points.map((point) => point.x);
    expect(Math.min(...xs)).toBeGreaterThan(170);
    expect(Math.max(...xs)).toBeLessThan(430);
  });

  it("um círculo é reconhecido", () => {
    expect(recognizeShape(ellipse(500, 500, 100, 100, 2))?.kind).toBe("ellipse");
  });

  it("um retângulo com cantos arredondados vira retângulo", () => {
    const shape = recognizeShape(
      trace(
        [
          [100, 100],
          [400, 100],
          [400, 300],
          [100, 300],
          [100, 105],
        ],
        3,
      ),
    );
    expect(shape?.kind).toBe("rectangle");
    const xs = shape!.points.map((point) => point.x);
    expect(Math.abs(Math.min(...xs) - 100)).toBeLessThan(6);
    expect(Math.abs(Math.max(...xs) - 400)).toBeLessThan(6);
  });

  it("um triângulo vira triângulo", () => {
    const shape = recognizeShape(
      trace(
        [
          [200, 100],
          [350, 350],
          [50, 350],
          [200, 110],
        ],
        3,
      ),
    );
    expect(shape?.kind).toBe("triangle");
  });

  it("um rabisco, uma letra curta e uma curva aberta não viram forma", () => {
    expect(
      recognizeShape(
        trace([
          [0, 0],
          [20, 10],
          [30, 0],
        ]),
      ),
    ).toBeNull();
    const arc = Array.from({ length: 30 }, (_, index) => ({
      x: 200 + Math.cos(index / 12) * 150,
      y: 200 + Math.sin(index / 12) * 150,
      pressure: 0.5,
    }));
    expect(recognizeShape(arc)).toBeNull();
    expect(
      recognizeShape(
        trace(
          [
            [100, 100],
            [300, 300],
            [120, 320],
            [320, 120],
            [160, 140],
          ],
          1,
        ),
      ),
    ).toBeNull();
  });

  it("o traço gerado é liso e mantém a pressão média", () => {
    const shape = recognizeShape(
      trace(
        [
          [100, 100],
          [400, 100],
        ],
        1,
      ),
    );
    expect(shape!.points.length).toBeGreaterThan(30);
    expect(shape!.points.every((point) => point.pressure === 0.5)).toBe(true);
  });
});
