import { describe, expect, it } from "vitest";
import type { HandwritingPoint } from "../domain/handwriting";
import { strokeRadii } from "./handwriting-ink";
import {
  hasRealPressure,
  penPressures,
  PEN_TAPER_FLOOR,
  simulatedPressureRange,
  simulatedPressures,
  taperFactors,
  usesPenDynamics,
  usesSimulatedWidth,
} from "./handwriting-ink-dynamics";
import { isHandwritingDocument } from "../data/local-workspace";

const point = (x: number, y: number, pressure = 0.5): HandwritingPoint => ({ x, y, pressure });
// Linha horizontal com passo constante (quanto maior o passo, mais rápida a mão).
const line = (count: number, step: number, pressure = 0.5) =>
  Array.from({ length: count }, (_, index) => point(100 + index * step, 200, pressure));

describe("pressão real ou não", () => {
  it("mouse e dedo mandam sempre a mesma pressão", () => {
    expect(hasRealPressure(line(10, 3, 0.5))).toBe(false);
    expect(hasRealPressure([])).toBe(false);
  });

  it("caneta com pressão que varia conta como real", () => {
    const points = [point(0, 0, 0.2), point(5, 0, 0.6), point(10, 0, 0.4)];
    expect(hasRealPressure(points)).toBe(true);
  });

  it("variação mínima, de arredondamento, não conta", () => {
    expect(hasRealPressure([point(0, 0, 0.5), point(5, 0, 0.51)])).toBe(false);
  });
});

describe("pressão simulada pela velocidade", () => {
  it("começa na pressão de sempre (0,5) e fica sempre na faixa estreita", () => {
    const pressures = simulatedPressures(line(80, 7), 10);
    expect(pressures[0]).toBe(0.5);
    for (const value of pressures) {
      expect(value).toBeGreaterThanOrEqual(0.3);
      expect(value).toBeLessThanOrEqual(0.8);
    }
  });

  it("mão rápida afina e mão devagar engrossa", () => {
    const slow = simulatedPressures(line(60, 0.8), 10).at(-1)!;
    const fast = simulatedPressures(line(60, 12), 10).at(-1)!;
    expect(slow).toBeGreaterThan(0.7);
    expect(fast).toBeLessThan(0.4);
    expect(slow).toBeGreaterThan(fast);
  });

  it("é causal: os primeiros pontos não mudam quando o traço cresce", () => {
    // Garante o mesmo desenho ao vivo e depois de pronto.
    const full = line(50, 4);
    const partial = simulatedPressures(full.slice(0, 20), 10);
    expect(simulatedPressures(full, 10).slice(0, 20)).toEqual(partial);
  });

  it("não quebra com pontos repetidos, um ponto só ou tamanho zero", () => {
    expect(simulatedPressures([], 10)).toEqual([]);
    expect(simulatedPressures([point(1, 1)], 10)).toEqual([0.5]);
    const still = simulatedPressures([point(1, 1), point(1, 1), point(1, 1)], 0);
    expect(still.every(Number.isFinite)).toBe(true);
  });
});

describe("faixa da pressão simulada por pincel", () => {
  it("a Caneta-tinteiro tem faixa estreita para não empoçar em gota ao desacelerar", () => {
    const [low, high] = simulatedPressureRange("ink");
    expect(high - low).toBeLessThan(0.2);
    expect(low).toBeLessThanOrEqual(0.5);
    expect(high).toBeGreaterThanOrEqual(0.5);
    const [defaultLow, defaultHigh] = simulatedPressureRange("calligraphy");
    expect(defaultHigh - defaultLow).toBeCloseTo(0.5, 5);
  });

  it("a faixa limita a pressão, devagar e rápido", () => {
    const range = simulatedPressureRange("ink");
    for (const step of [0.2, 3, 30]) {
      for (const value of simulatedPressures(line(80, step), 10, range)) {
        expect(value).toBeGreaterThanOrEqual(range[0] - 1e-9);
        expect(value).toBeLessThanOrEqual(range[1] + 1e-9);
      }
    }
  });

  it("com a faixa estreita o traço engorda menos ao desacelerar que antes", () => {
    const slow = line(60, 0.5);
    const ink = { tool: "pen", brush: "ink", width: 5, dynamics: "simulated" } as const;
    const calligraphy = { ...ink, brush: "calligraphy" } as const;
    const slowInk = strokeRadii(ink, slow)[40]!;
    const fastInk = strokeRadii(ink, line(60, 12))[40]!;
    // a razão devagar/rápido da tinteiro é bem menor que a de uma faixa larga (0,8 contra 0,3)
    expect(slowInk / fastInk).toBeLessThan((0.5 + 0.8 * 3) / (0.5 + 0.3 * 3));
    expect(strokeRadii(calligraphy, slow)).toHaveLength(60);
  });
});

describe("pontas que afinam", () => {
  it("afina as duas pontas e deixa o meio inteiro", () => {
    const factors = taperFactors(line(60, 3), 30);
    expect(factors[0]).toBeCloseTo(0.25, 5);
    expect(factors.at(-1)).toBeCloseTo(0.25, 5);
    expect(factors[30]).toBe(1);
  });

  it("é simétrica e sobe sem degrau", () => {
    const factors = taperFactors(line(61, 3), 30);
    for (let index = 0; index < factors.length; index += 1)
      expect(factors[index]).toBeCloseTo(factors[factors.length - 1 - index]!, 5);
    for (let index = 1; index <= 10; index += 1)
      expect(factors[index]!).toBeGreaterThanOrEqual(factors[index - 1]!);
  });

  it("traço curto divide o comprimento ao meio e nunca zera", () => {
    const factors = taperFactors(line(5, 2), 100);
    expect(Math.min(...factors)).toBeGreaterThanOrEqual(0.25);
    expect(factors[2]).toBe(1);
  });

  it("dá para ligar só uma das pontas (o traço em andamento não afina o fim)", () => {
    const noEnd = taperFactors(line(60, 3), 30, { end: false });
    expect(noEnd[0]).toBeCloseTo(0.25, 5);
    expect(noEnd.at(-1)).toBe(1);
    const noStart = taperFactors(line(60, 3), 30, { start: false });
    expect(noStart[0]).toBe(1);
    expect(noStart.at(-1)).toBeCloseTo(0.25, 5);
  });

  it("sem pontos suficientes ou comprimento nulo, não mexe na largura", () => {
    expect(taperFactors([point(0, 0)], 10)).toEqual([1]);
    expect(taperFactors([point(0, 0), point(0, 0)], 10)).toEqual([1, 1]);
    expect(taperFactors(line(5, 2), 0)).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("quem usa a largura simulada", () => {
  const base = { tool: "pen", points: line(5, 3), dynamics: "simulated" } as const;

  it("só traço de caneta marcado como simulado", () => {
    expect(usesSimulatedWidth(base)).toBe(true);
    expect(usesSimulatedWidth({ tool: "pen", points: base.points })).toBe(false);
    expect(usesSimulatedWidth({ ...base, tool: "highlighter" })).toBe(false);
  });

  it("tracejado, borracha de fundo e traço de um ponto ficam de fora", () => {
    expect(usesSimulatedWidth({ ...base, dash: "dashed" })).toBe(false);
    expect(usesSimulatedWidth({ ...base, cover: true })).toBe(false);
    expect(usesSimulatedWidth({ ...base, points: [point(0, 0)] })).toBe(false);
  });

  it("Fineliner e Esferográfica, as canetas de escrever, ficam de fora", () => {
    expect(usesSimulatedWidth({ ...base, brush: "fine" })).toBe(false);
    expect(usesSimulatedWidth({ ...base, brush: "ballpoint" })).toBe(false);
    for (const brush of ["ink", "soft", "calligraphy", "pencil"])
      expect(usesSimulatedWidth({ ...base, brush })).toBe(true);
  });

  it("se o toque mandou pressão real, vale a real", () => {
    const points = [point(0, 0, 0.2), point(5, 0, 0.8), point(9, 0, 0.5)];
    expect(usesSimulatedWidth({ ...base, points })).toBe(false);
  });
});

describe("raio do traço de mouse nos pincéis de desenho", () => {
  const points = line(60, 4);
  const mouse = { tool: "pen", brush: "pencil", width: 5, dynamics: "simulated" } as const;
  const old = { tool: "pen", brush: "pencil", width: 5 } as const;

  it("afina nas pontas e engrossa no meio", () => {
    const radii = strokeRadii(mouse, points);
    expect(radii[0]!).toBeLessThan(radii[30]! * 0.6);
    expect(radii.at(-1)!).toBeLessThan(radii[30]! * 0.6);
  });

  it("ao vivo só a ponta do começo afina: a do fim é a posição atual da caneta", () => {
    const live = strokeRadii(mouse, points, { live: true });
    const done = strokeRadii(mouse, points);
    expect(live[0]!).toBeLessThan(live[30]! * 0.6);
    // o fim ao vivo fica na espessura do meio (sem agulha), e o traço pronto afina
    expect(live.at(-1)!).toBeGreaterThan(live[30]! * 0.85);
    expect(done.at(-1)!).toBeLessThan(done[30]! * 0.6);
  });

  it("traço sem a marca abre exatamente como antes", () => {
    const radii = strokeRadii(old, points);
    expect(new Set(radii.map((r) => r.toFixed(6))).size).toBe(1);
  });

  it("a mesma conta serve à ponta ao vivo e ao traço pronto", () => {
    const full = strokeRadii(mouse, points);
    const partial = strokeRadii(mouse, points.slice(0, 30), { live: true });
    // o começo do traço é estável: crescer o traço não muda os primeiros raios
    expect(partial.slice(0, 3)).toEqual(full.slice(0, 3));
  });

  it("caneta com pressão real não muda", () => {
    const pen = points.map((p, index) => point(p.x, p.y, 0.2 + (index % 5) * 0.15));
    expect(strokeRadii(mouse, pen)).toEqual(strokeRadii(old, pen));
  });
});

describe("validação do documento", () => {
  const document = (dynamics: unknown) => ({
    version: 1,
    paper: "ruled",
    strokes: [
      {
        id: "a",
        tool: "pen",
        color: "#111111",
        width: 4,
        ...(dynamics === undefined ? {} : { dynamics }),
        points: [{ x: 1, y: 1, pressure: 0.5 }],
      },
    ],
  });

  it("aceita traço sem a marca e com a marca simulada", () => {
    expect(isHandwritingDocument(document(undefined))).toBe(true);
    expect(isHandwritingDocument(document("simulated"))).toBe(true);
    expect(isHandwritingDocument(document("pen"))).toBe(true);
  });

  it("recusa valor desconhecido", () => {
    expect(isHandwritingDocument(document("outra"))).toBe(false);
  });
});

describe("todos os pincéis da caneta", () => {
  const points = line(60, 4);
  it.each(["ink", "soft", "calligraphy", "pencil"] as const)(
    "%s: a ponta do começo afina no traço de mouse",
    (brush) => {
      const live = strokeRadii({ tool: "pen", brush, width: 5, dynamics: "simulated" }, points, {
        live: true,
      });
      expect(live[0]!).toBeLessThan(live[30]! * 0.7);
    },
  );

  // As canetas de escrever não viram pincelada: largura igual do começo ao fim, com ou sem a marca.
  it.each(["fine", "ballpoint"] as const)("%s: largura constante no traço de mouse", (brush) => {
    const marked = strokeRadii({ tool: "pen", brush, width: 5, dynamics: "simulated" }, points);
    const plain = strokeRadii({ tool: "pen", brush, width: 5 }, points);
    expect(marked).toEqual(plain);
    expect(new Set(marked.map((r) => r.toFixed(6))).size).toBe(1);
  });

  it("lápis varia com a velocidade: devagar engrossa, rápido afina", () => {
    const mark = { tool: "pen", brush: "pencil", width: 5, dynamics: "simulated" } as const;
    const slow = strokeRadii(mark, line(60, 0.8))[40]!;
    const fast = strokeRadii(mark, line(60, 12))[40]!;
    expect(slow).toBeGreaterThan(fast);
  });
});

describe("caneta e mesa digitalizadora", () => {
  it("o traço nasce leve mesmo quando o primeiro ponto chega com pressão alta", () => {
    const pressures = penPressures(line(30, 3, 0.9), 6);
    expect(pressures[0]).toBeLessThanOrEqual(0.3);
    // E cresce até perto do que a mão pediu, sem ficar preso no começo.
    expect(pressures.at(-1)!).toBeGreaterThan(0.75);
    expect(pressures[5]!).toBeLessThan(pressures[25]!);
  });

  it("o tremor da leitura do hardware vira variação suave de largura", () => {
    const noisy = Array.from({ length: 60 }, (_, index) =>
      point(100 + index * 3, 200, index % 2 === 0 ? 0.35 : 0.65),
    );
    const pressures = penPressures(noisy, 6);
    const rawJump = 0.3;
    const smoothJump = Math.max(
      ...pressures.slice(20).map((value, index) => Math.abs(value - pressures[19 + index]!)),
    );
    expect(smoothJump).toBeLessThan(rawJump / 2);
  });

  it("toque leve ainda deixa um fio visível e a pressão fica entre 0 e 1", () => {
    const light = penPressures(line(40, 3, 0.1), 6);
    expect(light.at(-1)!).toBeGreaterThan(0.12);
    for (const value of penPressures(line(10, 3, 5), 6)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("é causal: o traço ao vivo recebe os mesmos números do traço pronto", () => {
    const points = line(40, 3, 0.7);
    const full = penPressures(points, 6);
    const partial = penPressures(points.slice(0, 25), 6);
    expect(partial).toEqual(full.slice(0, 25));
  });

  it("vale só para traços de caneta marcados e nos pincéis de largura variável", () => {
    const base = { tool: "pen" as const, points: line(5, 3), dynamics: "pen" as const };
    expect(usesPenDynamics(base)).toBe(true);
    expect(usesPenDynamics({ ...base, brush: "ink" })).toBe(true);
    expect(usesPenDynamics({ ...base, brush: "ballpoint" })).toBe(true);
    expect(usesPenDynamics({ ...base, brush: "fine" })).toBe(false);
    expect(usesPenDynamics({ ...base, brush: "calligraphy" })).toBe(false);
    expect(usesPenDynamics({ ...base, dash: "dashed" })).toBe(false);
    expect(usesPenDynamics({ ...base, cover: true })).toBe(false);
    expect(usesPenDynamics({ tool: "pen", points: base.points })).toBe(false);
    expect(usesPenDynamics({ ...base, dynamics: "simulated" })).toBe(false);
  });

  it("as pontas da caneta afinam, sem sumir", () => {
    const stroke = { tool: "pen" as const, width: 6, dynamics: "pen" as const };
    const points = line(80, 3, 0.6);
    const radii = strokeRadii(stroke, points);
    const middle = radii[40]!;
    expect(radii[0]!).toBeLessThan(middle * 0.8);
    expect(radii.at(-1)!).toBeLessThan(middle * 0.8);
    expect(radii.at(-1)!).toBeGreaterThan(middle * PEN_TAPER_FLOOR * 0.8);
  });

  it("ao vivo só o começo afina: o fim é a posição da caneta", () => {
    const stroke = { tool: "pen" as const, width: 6, dynamics: "pen" as const };
    const points = line(80, 3, 0.6);
    const live = strokeRadii(stroke, points, { live: true });
    expect(live.at(-1)!).toBeGreaterThan(live[0]! * 1.2);
  });

  it("traço de caneta antigo, sem marca, abre exatamente como antes", () => {
    const old = { tool: "pen" as const, width: 6 };
    const marked = { ...old, dynamics: "pen" as const };
    const points = line(60, 3, 0.6);
    expect(strokeRadii(marked, points)).not.toEqual(strokeRadii(old, points));
    // Sem a marca, a pressão crua continua dando a largura: pontas iguais ao meio.
    const radii = strokeRadii(old, points);
    expect(radii[0]).toBeCloseTo(radii[30]!, 1);
  });

  it("lápis inclinado deixa o traço mais largo", () => {
    const upright = line(40, 3, 0.6);
    const tilted = upright.map((p) => ({ ...p, tiltX: 60, tiltY: 0 }));
    const stroke = {
      tool: "pen" as const,
      brush: "pencil" as const,
      width: 6,
      dynamics: "pen" as const,
    };
    expect(strokeRadii(stroke, tilted)[20]!).toBeGreaterThan(
      strokeRadii(stroke, upright)[20]! * 1.2,
    );
  });
});
