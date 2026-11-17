import { describe, expect, it } from "vitest";
import type { HandwritingPoint } from "../domain/handwriting";
import { denoiseMousePath } from "./handwriting-denoise";

const SCALE = 1200 / 760; // unidades da folha por pixel de tela
const pt = (x: number, y: number, pressure = 0.5): HandwritingPoint => ({ x, y, pressure });

// O que o mouse faz: um caminho liso arredondado para pixels inteiros da tela.
function quantizedLine(angle: number, pixelsLong: number, stepPixels: number) {
  const points: HandwritingPoint[] = [];
  for (let d = 0; d <= pixelsLong; d += stepPixels) {
    points.push(
      pt(
        Math.round(100 + Math.cos(angle) * d) * SCALE,
        Math.round(200 + Math.sin(angle) * d) * SCALE,
      ),
    );
  }
  return points;
}
function worstOffLine(points: HandwritingPoint[], angle: number) {
  let worst = 0;
  for (const p of points.slice(2, -2))
    worst = Math.max(
      worst,
      Math.abs(Math.sin(angle) * (p.x - 100 * SCALE) - Math.cos(angle) * (p.y - 200 * SCALE)),
    );
  return worst;
}

describe("alisar posições do mouse", () => {
  it.each([0.12, 0.47, 0.785])(
    "tira o degrau de pixel de uma reta (ângulo %s), devagar e rápido",
    (angle) => {
      for (const step of [0.6, 2, 5]) {
        const raw = quantizedLine(angle, 220, step);
        const smooth = denoiseMousePath(raw, SCALE);
        expect(worstOffLine(smooth, angle)).toBeLessThan(worstOffLine(raw, angle) * 0.6);
      }
    },
  );

  it("mantém a quantidade de pontos, a ordem e os outros campos", () => {
    const raw = quantizedLine(0.47, 160, 1).map((p, index) => ({
      ...p,
      pressure: 0.2 + index * 0.001,
      tiltX: index,
    }));
    const smooth = denoiseMousePath(raw, SCALE);
    expect(smooth).toHaveLength(raw.length);
    smooth.forEach((p, index) => {
      expect(p.pressure).toBe(raw[index]!.pressure);
      expect(p.tiltX).toBe(raw[index]!.tiltX);
    });
  });

  it("não mexe nos extremos", () => {
    const raw = quantizedLine(0.3, 120, 1);
    const smooth = denoiseMousePath(raw, SCALE);
    expect(smooth[0]).toEqual(raw[0]);
    expect(smooth.at(-1)).toEqual(raw.at(-1));
  });

  it("deixa um canto vivo: a quina de um L não arredonda", () => {
    const raw: HandwritingPoint[] = [];
    for (let x = 0; x <= 60; x += 1) raw.push(pt((100 + x) * SCALE, 200 * SCALE));
    for (let y = 1; y <= 60; y += 1) raw.push(pt(160 * SCALE, (200 + y) * SCALE));
    const smooth = denoiseMousePath(raw, SCALE);
    const corner = raw.findIndex((p) => p.x === 160 * SCALE && p.y === 200 * SCALE);
    expect(smooth[corner]).toEqual(raw[corner]);
    // e os trechos retos continuam retos, sem encostar no canto de outro lado
    expect(smooth[corner - 10]!.y).toBeCloseTo(200 * SCALE, 6);
    expect(smooth[corner + 10]!.x).toBeCloseTo(160 * SCALE, 6);
  });

  it("não achata uma curva: um laço pequeno continua com quase o mesmo tamanho", () => {
    const radius = 14;
    const raw: HandwritingPoint[] = [];
    for (let i = 0; i <= 80; i += 1) {
      const a = (i / 80) * Math.PI * 2;
      raw.push(
        pt(
          Math.round(300 + (Math.cos(a) * radius) / SCALE) * SCALE,
          Math.round(300 + (Math.sin(a) * radius) / SCALE) * SCALE,
        ),
      );
    }
    const smooth = denoiseMousePath(raw, SCALE);
    const meanRadius = (points: HandwritingPoint[]) =>
      points.reduce((sum, p) => sum + Math.hypot(p.x - 300 * SCALE, p.y - 300 * SCALE), 0) /
      points.length;
    expect(meanRadius(smooth)).toBeGreaterThan(meanRadius(raw) * 0.9);
  });

  it("não faz nada com poucos pontos ou escala inválida", () => {
    const few = [pt(0, 0), pt(5, 1), pt(10, 0)];
    expect(denoiseMousePath(few, SCALE)).toEqual(few);
    const raw = quantizedLine(0.3, 100, 1);
    expect(denoiseMousePath(raw, 0)).toEqual(raw);
    expect(denoiseMousePath(raw, Number.NaN)).toEqual(raw);
  });
});
