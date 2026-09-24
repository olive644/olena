import { describe, expect, it } from "vitest";
import {
  createLiveStabilizer,
  DEFAULT_LIVE_STABILIZER,
  straightenStroke,
  type HandwritingPoint,
} from "./handwriting-stabilization";

function point(x: number, y: number, extra: Partial<HandwritingPoint> = {}): HandwritingPoint {
  return { x, y, pressure: 0.5, ...extra };
}

describe("zona morta do estabilizador ao vivo", () => {
  it("ignora tremores menores que o raio", () => {
    const stabilizer = createLiveStabilizer(point(100, 100));
    expect(stabilizer.push([point(100.5, 100), point(100, 100.5), point(100.5, 100.5)])).toEqual(
      [],
    );
  });

  it("aceita amostras que saem do raio e mede a partir da última aceita", () => {
    const stabilizer = createLiveStabilizer(point(100, 100));
    expect(stabilizer.push([point(110, 100)])).toHaveLength(1);
    expect(stabilizer.push([point(110.5, 100)])).toEqual([]);
    expect(stabilizer.push([point(114, 100)])).toHaveLength(1);
  });
});

describe("inércia do estabilizador ao vivo", () => {
  it("segue a mão com atraso e nunca passa do maior ponto alcançado pela mão", () => {
    const stabilizer = createLiveStabilizer(point(0, 0));
    const positions: number[] = [];
    for (let step = 0; step < 60; step += 1) {
      for (const filtered of stabilizer.push([point(100 + (step % 2) * 3, 0)]))
        positions.push(filtered.x);
    }
    expect(positions.length).toBeGreaterThan(10);
    expect(positions[0]!).toBeLessThan(100);
    expect(Math.max(...positions)).toBeLessThanOrEqual(103);
    expect(positions.at(-1)!).toBeGreaterThan(98);
  });

  it("sobe sem recuar enquanto a mão avança para um alvo mais distante", () => {
    const stabilizer = createLiveStabilizer(point(0, 0));
    const positions: number[] = [];
    for (let step = 1; step <= 20; step += 1) {
      for (const filtered of stabilizer.push([point(200 + step * 3, 0)]))
        positions.push(filtered.x);
    }
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index]!).toBeGreaterThan(positions[index - 1]!);
    }
  });

  it("acompanha um movimento contínuo sempre atrás da mão", () => {
    const stabilizer = createLiveStabilizer(point(0, 0));
    for (let step = 1; step <= 30; step += 1) {
      const [filtered] = stabilizer.push([point(step * 6, 0)]);
      expect(filtered).toBeDefined();
      expect(filtered!.x).toBeLessThan(step * 6);
      expect(filtered!.x).toBeGreaterThan(0);
    }
  });

  it("mantém pressão e inclinação da amostra real", () => {
    const stabilizer = createLiveStabilizer(point(0, 0));
    const [filtered] = stabilizer.push([point(50, 0, { pressure: 0.9, tiltX: 20, tiltY: -10 })]);
    expect(filtered).toMatchObject({ pressure: 0.9, tiltX: 20, tiltY: -10 });
  });

  it("termina exatamente onde a caneta foi levantada", () => {
    const stabilizer = createLiveStabilizer(point(0, 0));
    stabilizer.push([point(40, 10), point(80, 30), point(120, 60)]);
    const tail = stabilizer.finish();
    expect(tail.length).toBeGreaterThan(0);
    expect(tail.at(-1)).toMatchObject({ x: 120, y: 60 });
    expect(stabilizer.finish()).toEqual([]);
  });

  it("não acrescenta pontos ao terminar quando nada foi aceito", () => {
    const stabilizer = createLiveStabilizer(point(10, 10));
    stabilizer.push([point(10.5, 10)]);
    expect(stabilizer.finish()).toEqual([]);
  });

  it("usa resposta padrão rápida sem ultrapassar a ponta", () => {
    expect(DEFAULT_LIVE_STABILIZER.mass).toBeGreaterThan(0);
    const response = (1 - DEFAULT_LIVE_STABILIZER.drag) / DEFAULT_LIVE_STABILIZER.mass;
    expect(response).toBeGreaterThan(0.5);
    expect(response).toBeLessThanOrEqual(1);
  });
});

describe("endireitar traços", () => {
  it("nivela uma linha quase horizontal sem suavizar", () => {
    const line = Array.from({ length: 21 }, (_, index) => point(index * 10, index * 0.8));
    const straightened = straightenStroke(line);
    const before = line.at(-1)!.y - line[0]!.y;
    const after = straightened.at(-1)!.y - straightened[0]!.y;
    expect(Math.abs(after)).toBeLessThan(Math.abs(before));
  });

  it("deixa curvas e traços curtos intactos", () => {
    const curve = Array.from({ length: 21 }, (_, index) => point(index * 10, Math.sin(index) * 40));
    expect(straightenStroke(curve)).toEqual(curve);
    const short = [point(0, 0), point(10, 1)];
    expect(straightenStroke(short)).toEqual(short);
  });
});
