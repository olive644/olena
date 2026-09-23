import { describe, expect, it } from "vitest";
import { coordinateStats, formatCoordinateNumber } from "./coordinate-math";

describe("coordinate math", () => {
  it("converte o vetor desenhado em variações e distância", () => {
    const stats = coordinateStats({
      origin: { x: 100, y: 200, pressure: 0.5 },
      end: { x: 196, y: 104, pressure: 0.5 },
      step: 2,
    });
    expect(stats.deltaX).toBe(4);
    expect(stats.deltaY).toBe(4);
    expect(stats.distance).toBeCloseTo(Math.sqrt(32));
    expect(stats.slope).toBe(1);
    expect(stats.angle).toBe(45);
  });

  it("representa eixo vertical sem dividir por zero", () => {
    const stats = coordinateStats({
      origin: { x: 100, y: 200, pressure: 0.5 },
      end: { x: 100, y: 104, pressure: 0.5 },
      step: 5,
    });
    expect(stats.slope).toBeNull();
    expect(formatCoordinateNumber(stats.deltaY)).toBe("10");
  });
});
