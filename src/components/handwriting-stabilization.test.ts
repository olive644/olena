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

// Gerador determinístico: o mesmo tremor em toda execução.
function noise(seed: number) {
  let state = seed >>> 0;
  return (amount: number) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state / 4294967296 - 0.5) * 2 * amount;
  };
}

// Caneta andando em linha reta a `speed` unidades/s, amostrada a 125 Hz.
function straightRun(speed: number, samples: number, jitter = 0, seed = 3) {
  const random = noise(seed);
  const step = (speed * 8) / 1000;
  const raw: HandwritingPoint[] = [];
  const times: number[] = [];
  for (let index = 1; index <= samples; index += 1) {
    raw.push(point(100 + index * step, 200 + random(jitter)));
    times.push(index * 8);
  }
  return { raw, times };
}

describe("zona morta do estabilizador ao vivo", () => {
  it("ignora tremores menores que o raio", () => {
    const stabilizer = createLiveStabilizer(point(100, 100));
    expect(stabilizer.push([point(100.3, 100), point(100, 100.3), point(100.3, 100.3)])).toEqual(
      [],
    );
  });

  it("aceita amostras que saem do raio e mede a partir da última aceita", () => {
    const stabilizer = createLiveStabilizer(point(100, 100));
    expect(stabilizer.push([point(101, 100)])).toHaveLength(1);
    expect(stabilizer.push([point(101.3, 100)])).toEqual([]);
    expect(stabilizer.push([point(102, 100)])).toHaveLength(1);
  });
});

describe("filtro 1€ ao vivo", () => {
  it("mantém pressão equivalente com frequências diferentes", () => {
    function pressureAt(hz: number) {
      const filter = createLiveStabilizer(point(0, 0, { pressure: 0.2 }));
      filter.push([point(1, 0, { pressure: 0.2 })], [0]);
      let pressure = 0.2;
      for (let index = 1; index <= hz / 20; index++) {
        pressure = filter.push([point(index * 10, 0, { pressure: 0.9 })], [(index * 1000) / hz])[0]!
          .pressure;
      }
      return pressure;
    }
    expect(pressureAt(60)).toBeCloseTo(pressureAt(240), 6);
  });
  it("não descarta mudança de pressão com a caneta parada", () => {
    const filter = createLiveStabilizer(point(100, 100, { pressure: 0.2 }));
    const [sample] = filter.push([point(100, 100, { pressure: 0.9 })]);
    expect(sample!.pressure).toBeGreaterThan(0.2);
    expect(sample!.pressure).toBeLessThan(0.9);
    expect(sample!.x).toBe(100);
  });
  it("não cria uma ponta mais grossa ao concluir o traço", () => {
    const filter = createLiveStabilizer(point(0, 0, { pressure: 0.1 }));
    const [sample] = filter.push([point(30, 0, { pressure: 0.9 })]);
    expect(filter.finish().every((tail) => tail.pressure === sample!.pressure)).toBe(true);
  });
  it("reduz o tremor de uma mão lenta", () => {
    const { raw, times } = straightRun(40, 200, 1.5);
    const stabilizer = createLiveStabilizer(point(100, 200));
    const filtered = stabilizer.push(raw, times);
    const rms = (values: number[]) =>
      Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
    const rawError = rms(raw.slice(40).map((p) => p.y - 200));
    const filteredError = rms(filtered.slice(40).map((p) => p.y - 200));
    expect(filteredError).toBeLessThan(rawError * 0.5);
  });

  it.each([150, 500, 1500])(
    "mantém a tinta sob a caneta a %i unidades por segundo, sem atraso",
    (speed) => {
      const { raw, times } = straightRun(speed, 60);
      const stabilizer = createLiveStabilizer(point(100, 200));
      const filtered = stabilizer.push(raw, times);
      // O preditor de velocidade zera o atraso em movimento uniforme.
      expect(Math.abs(raw.at(-1)!.x - filtered.at(-1)!.x)).toBeLessThan(1);
    },
  );

  it("quase não passa da ponta da caneta nem no arranque", () => {
    const { raw, times } = straightRun(600, 40);
    const filtered = createLiveStabilizer(point(100, 200)).push(raw, times);
    filtered.forEach((sample, index) => expect(sample.x).toBeLessThanOrEqual(raw[index]!.x + 3));
  });

  it("preserva o canto fechado em vez de arredondá-lo", () => {
    // Caneta descendo a 900 unidades/s e virando 90° para a direita.
    const step = (900 * 8) / 1000;
    const raw: HandwritingPoint[] = [];
    const times: number[] = [];
    for (let index = 1; index <= 20; index += 1) {
      raw.push(point(100, 100 + index * step));
      times.push(index * 8);
    }
    const cornerY = 100 + 20 * step;
    for (let index = 1; index <= 10; index += 1) {
      raw.push(point(100 + index * step, cornerY));
      times.push((20 + index) * 8);
    }
    const filtered = createLiveStabilizer(point(100, 100)).push(raw, times);
    const afterCorner = filtered[20]!;
    expect(Math.hypot(afterCorner.x - raw[20]!.x, afterCorner.y - raw[20]!.y)).toBeLessThan(0.01);
    // Sem ultrapassar o canto para o lado errado.
    for (const sample of filtered.slice(20)) expect(sample.y).toBeLessThanOrEqual(cornerY + 1);
  });

  it("não trata o ruído de uma mão lenta como canto", () => {
    const { raw, times } = straightRun(60, 250, 2.5, 21);
    const filtered = createLiveStabilizer(point(100, 200)).push(raw, times);
    const worst = Math.max(...filtered.slice(30).map((sample) => Math.abs(sample.y - 200)));
    expect(worst).toBeLessThan(1.2);
  });

  it("segue a mesma trilha com e sem timestamps a 125 Hz", () => {
    const { raw, times } = straightRun(500, 30);
    const withTimes = createLiveStabilizer(point(100, 200)).push(raw, times);
    const without = createLiveStabilizer(point(100, 200)).push(raw);
    expect(without.at(-1)!.x).toBeCloseTo(withTimes.at(-1)!.x, 3);
  });

  it("aguenta timestamps repetidos ou fora de ordem sem gerar NaN", () => {
    const stabilizer = createLiveStabilizer(point(100, 100));
    const filtered = stabilizer.push(
      [point(110, 100), point(120, 100), point(130, 100)],
      [50, 50, 20],
    );
    for (const sample of filtered) {
      expect(Number.isFinite(sample.x)).toBe(true);
      expect(Number.isFinite(sample.y)).toBe(true);
    }
  });

  it("suaviza a pressão sem inventar valores fora da faixa da caneta", () => {
    const stabilizer = createLiveStabilizer(point(100, 100, { pressure: 0.2 }));
    const samples = Array.from({ length: 12 }, (_, index) =>
      point(105 + index * 5, 100, { pressure: 0.8 }),
    );
    const filtered = stabilizer.push(samples);
    const pressures = filtered.map((sample) => sample.pressure);
    expect(pressures[0]!).toBeGreaterThan(0.2);
    expect(pressures[0]!).toBeLessThan(0.8);
    expect(pressures.at(-1)!).toBeGreaterThan(0.75);
    expect(Math.max(...pressures)).toBeLessThanOrEqual(0.8);
    for (let index = 1; index < pressures.length; index += 1) {
      expect(pressures[index]!).toBeGreaterThanOrEqual(pressures[index - 1]!);
    }
  });

  it("mantém a inclinação da amostra real", () => {
    const stabilizer = createLiveStabilizer(point(100, 100));
    const [filtered] = stabilizer.push([point(140, 100, { tiltX: 30, tiltY: -10 })]);
    expect(filtered).toMatchObject({ tiltX: 30, tiltY: -10 });
  });

  it("termina exatamente onde a caneta foi levantada", () => {
    const { raw, times } = straightRun(900, 25);
    const stabilizer = createLiveStabilizer(point(100, 200));
    stabilizer.push(raw, times);
    const tail = stabilizer.finish();
    expect(tail.at(-1)).toMatchObject({ x: raw.at(-1)!.x, y: raw.at(-1)!.y });
    expect(stabilizer.finish()).toEqual([]);
  });

  it("não acrescenta pontos ao terminar quando nada foi aceito", () => {
    expect(createLiveStabilizer(point(100, 100)).finish()).toEqual([]);
  });

  it("usa uma configuração padrão coerente", () => {
    expect(DEFAULT_LIVE_STABILIZER.minCutoff).toBeGreaterThan(0);
    expect(DEFAULT_LIVE_STABILIZER.beta).toBeGreaterThan(0);
    expect(DEFAULT_LIVE_STABILIZER.pressureResponse).toBeGreaterThan(0);
    expect(DEFAULT_LIVE_STABILIZER.pressureResponse).toBeLessThanOrEqual(1);
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
