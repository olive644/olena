import { describe, expect, it } from "vitest";
import { compactPoints } from "./handwriting-precision";
import type { HandwritingPoint } from "../domain/handwriting";

function noisyPoints(count: number): HandwritingPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: 100.123456789012 + index * 3.14159265358979,
    y: 200.987654321098 + Math.sin(index / 5) * 40.5555555555,
    pressure: 0.4 + (index % 10) * 0.031415926535,
  }));
}

describe("compactar os pontos de um traço", () => {
  it("arredonda posição e pressão a duas casas", () => {
    const [point] = compactPoints([{ x: 12.3456789, y: 98.7654321, pressure: 0.512345678 }]);
    expect(point).toEqual({ x: 12.35, y: 98.77, pressure: 0.51 });
  });

  it("não move nenhum ponto mais que meio centésimo da folha", () => {
    const original = noisyPoints(200);
    const compact = compactPoints(original);
    expect(compact).toHaveLength(original.length);
    compact.forEach((point, index) => {
      expect(Math.abs(point.x - original[index]!.x)).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(Math.abs(point.y - original[index]!.y)).toBeLessThanOrEqual(0.005 + 1e-9);
    });
  });

  it("reduz o JSON em pelo menos 30%", () => {
    const original = noisyPoints(300);
    const before = JSON.stringify(original).length;
    const after = JSON.stringify(compactPoints(original)).length;
    expect(after).toBeLessThan(before * 0.7);
  });

  it("junta pontos que ficam iguais depois do arredondamento e mantém o último", () => {
    const result = compactPoints([
      { x: 10.001, y: 20.001, pressure: 0.5 },
      { x: 10.002, y: 20.003, pressure: 0.6 },
      { x: 30, y: 40, pressure: 0.5 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ x: 10, y: 20, pressure: 0.6 });
  });

  it("um traço de um ponto só continua com um ponto, e a inclinação vira inteira", () => {
    const result = compactPoints([{ x: 5.5, y: 6.5, pressure: 0.5, tiltX: 10.4, tiltY: -3.6 }]);
    expect(result).toEqual([{ x: 5.5, y: 6.5, pressure: 0.5, tiltX: 10, tiltY: -4 }]);
  });

  it("uma lista vazia continua vazia", () => {
    expect(compactPoints([])).toEqual([]);
  });
});
