import { describe, expect, it } from "vitest";
import { MAX_CONTROL_POINTS, dedupeControls, splinePoints } from "./handwriting-spline";

const c = (x: number, y: number) => ({ x, y });
const nearest = (points: { x: number; y: number }[], target: { x: number; y: number }) =>
  Math.min(...points.map((p) => Math.hypot(p.x - target.x, p.y - target.y)));

describe("curva por pontos de controle", () => {
  const controls = [c(100, 300), c(200, 150), c(320, 280), c(450, 120), c(560, 260)];

  it("passa por todos os pontos de controle, do primeiro ao último", () => {
    const points = splinePoints(controls);
    for (const control of controls) expect(nearest(points, control)).toBeLessThan(0.01);
    expect(points[0]).toMatchObject(controls[0]!);
    expect(points.at(-1)).toMatchObject(controls.at(-1)!);
  });

  it("é lisa: nenhuma quina entre amostras vizinhas", () => {
    const points = splinePoints(controls);
    for (let i = 2; i < points.length; i += 1) {
      const a = points[i - 2]!;
      const b = points[i - 1]!;
      const d = points[i]!;
      const turn = Math.abs(Math.atan2(d.y - b.y, d.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x));
      expect(Math.min(turn, Math.PI * 2 - turn)).toBeLessThan((25 * Math.PI) / 180);
    }
  });

  it("amostra a curva com espaçamento parecido com o de um traço normal", () => {
    const points = splinePoints(controls);
    for (let i = 1; i < points.length; i += 1) {
      expect(
        Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y),
      ).toBeLessThan(12);
    }
  });

  it("dois pontos viram uma reta", () => {
    const points = splinePoints([c(50, 50), c(350, 200)]);
    expect(points.length).toBeGreaterThan(5);
    for (const p of points)
      expect(Math.abs((p.y - 50) * 300 - (p.x - 50) * 150)).toBeLessThan(1e-6);
  });

  it("menos de dois pontos distintos não formam curva", () => {
    expect(splinePoints([])).toEqual([]);
    expect(splinePoints([c(10, 10)])).toEqual([]);
    expect(splinePoints([c(10, 10), c(10.5, 10.5)])).toEqual([]);
  });

  it("pontos colados contam como um só", () => {
    expect(dedupeControls([c(10, 10), c(11, 11), c(100, 10), c(100.5, 10)])).toEqual([
      c(10, 10),
      c(100, 10),
    ]);
  });

  it("espaçamento muito irregular não faz laço nem fugir dos pontos", () => {
    const uneven = [c(100, 100), c(104, 100), c(400, 100), c(404, 100), c(700, 100)];
    for (const p of splinePoints(uneven)) expect(Math.abs(p.y - 100)).toBeLessThan(1e-6);
    const bend = [c(100, 100), c(108, 100), c(300, 300)];
    const points = splinePoints(bend);
    const minX = Math.min(...points.map((p) => p.x));
    expect(minX).toBeGreaterThan(95);
  });

  it("usa a pressão pedida e respeita os limites da folha", () => {
    const points = splinePoints([c(-50, 20), c(300, 2000), c(1500, 100)], 0.7, {
      width: 1200,
      height: 1600,
    });
    expect(points.every((p) => p.pressure === 0.7)).toBe(true);
    expect(points.every((p) => p.x >= 0 && p.x <= 1200 && p.y >= 0 && p.y <= 1600)).toBe(true);
  });

  it("limita os pontos de controle, para o traço caber no teto de pontos por traço", () => {
    const many = Array.from({ length: MAX_CONTROL_POINTS + 80 }, (_, i) => c(i * 5, (i % 2) * 40));
    expect(splinePoints(many).length).toBeLessThanOrEqual(5000);
  });
});
