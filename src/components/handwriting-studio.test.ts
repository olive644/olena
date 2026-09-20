import { describe, expect, it } from "vitest";
import { stabilizeHandwriting, type HandwritingPoint } from "./handwriting-stabilization";

function point(x: number, y: number): HandwritingPoint {
  return { x, y, pressure: 0.5 };
}

describe("stabilizeHandwriting", () => {
  it("reduces small hand jitter without moving the stroke endpoints", () => {
    const original = [point(0, 40), point(20, 51), point(40, 32), point(60, 48), point(80, 40)];

    const stabilized = stabilizeHandwriting(original);

    expect(stabilized[0]).toEqual(original[0]);
    expect(stabilized.at(-1)).toEqual(original.at(-1));
    expect(Math.abs((stabilized[1]?.y ?? 0) - 40)).toBeLessThan(11);
    expect(Math.abs((stabilized[2]?.y ?? 0) - 40)).toBeLessThan(8);
  });

  it("partially straightens a long line with a slight accidental tilt", () => {
    const original = [point(0, 100), point(50, 105), point(100, 111), point(150, 117)];

    const stabilized = stabilizeHandwriting(original);
    const originalSlope = Math.abs(original[3]!.y - original[0]!.y);
    const stabilizedSlope = Math.abs(stabilized[3]!.y - stabilized[0]!.y);

    expect(stabilizedSlope).toBeLessThan(originalSlope * 0.4);
  });

  it("keeps intentionally diagonal writing diagonal", () => {
    const original = [point(0, 0), point(40, 40), point(80, 80), point(120, 120)];

    const stabilized = stabilizeHandwriting(original);

    expect(stabilized[0]).toEqual(original[0]);
    expect(stabilized.at(-1)).toEqual(original.at(-1));
  });

  it("smooths a curved stroke without incorrectly making it horizontal", () => {
    const original = [
      point(0, 100),
      point(30, 108),
      point(60, 125),
      point(90, 107),
      point(120, 100),
    ];
    const stabilized = stabilizeHandwriting(original);

    expect(stabilized[2]?.y).toBeGreaterThan(112);
    expect(stabilized[2]?.y).toBeLessThan(125);
  });
});
