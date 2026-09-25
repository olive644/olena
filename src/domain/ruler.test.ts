import { describe, expect, it } from "vitest";
import { rulerMeasurement, rulerPoints } from "./ruler";

const start = { x: 100, y: 100, pressure: 0.5 };

describe("instrumentos da régua", () => {
  it("encaixa esquadros nos ângulos técnicos", () => {
    const fortyFive = rulerPoints(start, { x: 160, y: 150, pressure: 0.5 }, "triangle-45");
    expect(fortyFive[1]?.x).toBeCloseTo(fortyFive[1]?.y ?? 0);

    const thirty = rulerPoints(start, { x: 180, y: 125, pressure: 0.5 }, "triangle-30");
    const end = thirty[1];
    expect(end).toBeTruthy();
    expect(Math.atan2((end?.y ?? 0) - 100, (end?.x ?? 0) - 100)).toBeCloseTo(Math.PI / 6);
  });

  it("fecha o gabarito circular e cria uma curva suave", () => {
    const circle = rulerPoints(start, { x: 140, y: 100, pressure: 0.5 }, "circle");
    expect(circle).toHaveLength(49);
    expect(circle.at(-1)?.x).toBeCloseTo(circle[0]?.x ?? 0);
    expect(circle.at(-1)?.y).toBeCloseTo(circle[0]?.y ?? 0);
    expect(rulerPoints(start, { x: 200, y: 100, pressure: 0.5 }, "curve")).toHaveLength(33);
  });

  it("formata a unidade e identifica diâmetros", () => {
    expect(rulerMeasurement(1200, "cm", "straight")).toBe("21.00 cm");
    expect(rulerMeasurement(96, "px", "circle")).toBe("⌀ 96 px");
  });
});
