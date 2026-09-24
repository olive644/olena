import { describe, expect, it } from "vitest";
import type { HandwritingPoint } from "../domain/handwriting";
import {
  bristleLines,
  predictedTip,
  strokeOutline,
  strokeRadii,
  tiltShading,
  traceOutline,
} from "./handwriting-ink";

function point(x: number, y: number, pressure = 0.5): HandwritingPoint {
  return { x, y, pressure };
}

function line(count: number, step = 3, pressure = 0.5): HandwritingPoint[] {
  return Array.from({ length: count }, (_, index) => point(100 + index * step, 200, pressure));
}

const ink = { tool: "pen", brush: "ink", width: 4 } as const;
const soft = { tool: "pen", brush: "soft", width: 6 } as const;
const fine = { tool: "pen", brush: "fine", width: 3 } as const;

function signedArea(polygon: { x: number; y: number }[]): number {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

describe("raio do traço", () => {
  it("cresce com a pressão", () => {
    const light = strokeRadii(soft, line(20, 3, 0.2)).at(-1)!;
    const heavy = strokeRadii(soft, line(20, 3, 1)).at(-1)!;
    expect(heavy).toBeGreaterThan(light);
  });

  it("muda de largura em rampa, sem degrau, quando a pressão muda de repente", () => {
    const points = [...line(15, 3, 0.2), ...line(15, 3, 1).map((p) => ({ ...p, x: p.x + 45 }))];
    const radii = strokeRadii(soft, points);
    let biggestJump = 0;
    for (let index = 1; index < radii.length; index += 1) {
      biggestJump = Math.max(biggestJump, Math.abs(radii[index]! - radii[index - 1]!));
    }
    const total = Math.abs(radii.at(-1)! - radii[0]!);
    expect(total).toBeGreaterThan(2);
    expect(biggestJump).toBeLessThan(total * 0.6);
  });

  it("dá o mesmo raio à ponta ao vivo e ao traço pronto", () => {
    const points = Array.from({ length: 40 }, (_, index) =>
      point(100 + index * 3, 200 + Math.sin(index / 4) * 30, 0.3 + (index % 7) / 10),
    );
    const partial = strokeRadii(ink, points.slice(0, 30));
    const full = strokeRadii(ink, points);
    for (let index = 0; index < 29; index += 1) {
      expect(partial[index]).toBeCloseTo(full[index]!, 12);
    }
  });

  it("mantém o fineliner quase uniforme e usa 0,7 de pressão fora da caneta", () => {
    const radii = strokeRadii(fine, line(20, 3, 0.5));
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(1e-9);
    const marker = strokeRadii({ tool: "highlighter", brush: "ink", width: 4 }, line(4, 3, 0.1));
    // Linha horizontal: o ângulo da ponta caligráfica vale 0,35 + 0,65 * |sen(-45°)|.
    const angleFactor = 0.35 + 0.65 * Math.SQRT1_2;
    expect(marker[0]).toBeCloseTo((4 * (0.5 + 0.7 * 3) * angleFactor) / 2, 6);
  });

  it("nunca produz valor inválido, nem com pontos repetidos", () => {
    const radii = strokeRadii(ink, [point(10, 10), point(10, 10), point(10, 10), point(20, 10)]);
    for (const radius of radii) {
      expect(Number.isFinite(radius)).toBe(true);
      expect(radius).toBeGreaterThan(0);
    }
  });

  it("aplica a inclinação como ponta caligráfica", () => {
    expect(tiltShading(point(0, 0))).toBe(1);
    expect(tiltShading({ ...point(0, 0), tiltX: 90, tiltY: 0 })).toBeCloseTo(1.6, 5);
  });
});

describe("contorno do traço", () => {
  it("cerca a linha reta com a largura certa dos dois lados", () => {
    const points = line(10);
    const outline = strokeOutline(points, Array<number>(10).fill(2));
    expect(outline.left).toHaveLength(10);
    expect(outline.right).toHaveLength(10);
    outline.left.forEach((left, index) => {
      const right = outline.right[index]!;
      expect(Math.hypot(left.x - right.x, left.y - right.y)).toBeCloseTo(4, 9);
      expect((left.y + right.y) / 2).toBeCloseTo(200, 9);
    });
  });

  it("orienta o polígono como os arcos do canvas, para a regra nonzero unir e não furar", () => {
    const forward = strokeOutline(line(12), Array<number>(12).fill(2));
    const backward = strokeOutline([...line(12)].reverse(), Array<number>(12).fill(2));
    const curve = Array.from({ length: 40 }, (_, index) =>
      point(150 + Math.cos(index / 6) * 50, 150 + Math.sin(index / 6) * 50),
    );
    const bent = strokeOutline(curve, Array<number>(40).fill(2));
    for (const outline of [forward, backward, bent]) {
      const polygon = [...outline.left, ...[...outline.right].reverse()];
      expect(signedArea(polygon)).toBeGreaterThan(0);
    }
  });

  it("coloca discos nas pontas e só nas juntas realmente fechadas", () => {
    const smooth = strokeOutline(line(10), Array<number>(10).fill(2));
    expect(smooth.discs).toHaveLength(2);
    const zigzag = strokeOutline(
      [
        point(0, 0),
        point(10, 0),
        point(20, 0),
        point(10, 8),
        point(0, 16),
        point(10, 16),
        point(20, 16),
      ],
      Array<number>(7).fill(2),
    );
    expect(zigzag.discs.length).toBeGreaterThan(2);
  });

  it("limita o disco da junta ao menor raio vizinho", () => {
    const outline = strokeOutline([point(0, 0), point(10, 0), point(0, 1)], [1, 9, 2]);
    const corner = outline.discs.find((disc) => disc.x === 10 && disc.y === 0);
    expect(corner?.r).toBe(1);
  });

  it("transforma um único ponto em um disco", () => {
    const outline = strokeOutline([point(5, 5)], [3]);
    expect(outline.left).toHaveLength(0);
    expect(outline.discs).toEqual([{ x: 5, y: 5, r: 3 }]);
  });

  it("devolve vazio sem pontos", () => {
    expect(strokeOutline([], [])).toEqual({ left: [], right: [], discs: [] });
  });

  it("desenha um único caminho fechado com um arco por disco", () => {
    const calls: string[] = [];
    const context = new Proxy(
      {},
      { get: (_target, name: string) => () => calls.push(name) },
    ) as unknown as CanvasRenderingContext2D;
    const outline = strokeOutline(line(8), Array<number>(8).fill(2));
    traceOutline(context, outline);
    expect(calls.filter((call) => call === "beginPath")).toHaveLength(1);
    expect(calls.filter((call) => call === "closePath")).toHaveLength(1);
    expect(calls.filter((call) => call === "arc")).toHaveLength(outline.discs.length);
  });
});

describe("fios do pincel macio", () => {
  it("gera uma linha por posição, com um ponto por ponto do traço", () => {
    const points = line(8);
    const outline = strokeOutline(points, Array<number>(8).fill(4));
    const lines = bristleLines(points, outline, [-0.9, 0, 0.9]);
    expect(lines).toHaveLength(3);
    for (const bristle of lines) expect(bristle).toHaveLength(8);
    expect(lines[1]![3]!.y).toBeCloseTo(200, 9);
    expect(bristleLines([point(0, 0)], strokeOutline([point(0, 0)], [1]), [0])).toEqual([]);
  });
});

describe("ponta prevista", () => {
  it("não prevê com poucos pontos nem com a mão parada", () => {
    expect(predictedTip([point(0, 0), point(5, 0)])).toBeUndefined();
    expect(predictedTip([point(0, 0), point(0.2, 0), point(0.4, 0)])).toBeUndefined();
  });

  it("estende o último segmento na mesma direção", () => {
    const tip = predictedTip([point(0, 0), point(5, 0), point(10, 0)])!;
    expect(tip.x).toBeCloseTo(15, 9);
    expect(tip.y).toBeCloseTo(0, 9);
  });

  it("limita a distância prevista", () => {
    const tip = predictedTip([point(0, 0), point(50, 0), point(100, 0)], 4)!;
    expect(tip.x - 100).toBeLessThanOrEqual(18 + 1e-9);
  });

  it("não prevê depois de uma curva fechada", () => {
    expect(predictedTip([point(0, 0), point(10, 0), point(10, 10)])).toBeUndefined();
  });

  it("mantém a pressão da última amostra", () => {
    const tip = predictedTip([point(0, 0), point(5, 0), point(10, 0, 0.9)])!;
    expect(tip.pressure).toBe(0.9);
  });
});
