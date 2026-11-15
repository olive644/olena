import { describe, expect, it } from "vitest";
import type { HandwritingPoint } from "../domain/handwriting";
import { strokeRadii } from "./handwriting-ink";
import {
  hasRealPressure,
  simulatedPressures,
  taperFactors,
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

  it("se o toque mandou pressão real, vale a real", () => {
    const points = [point(0, 0, 0.2), point(5, 0, 0.8), point(9, 0, 0.5)];
    expect(usesSimulatedWidth({ ...base, points })).toBe(false);
  });
});

describe("raio do traço de mouse", () => {
  const points = line(60, 4);
  const mouse = { tool: "pen", brush: "fine", width: 5, dynamics: "simulated" } as const;
  const old = { tool: "pen", brush: "fine", width: 5 } as const;

  it("afina nas pontas e engrossa no meio", () => {
    const radii = strokeRadii(mouse, points);
    expect(radii[0]!).toBeLessThan(radii[30]! * 0.6);
    expect(radii.at(-1)!).toBeLessThan(radii[30]! * 0.6);
  });

  it("o fineliner de mouse mantém a largura média de sempre no meio", () => {
    // Mão num ritmo médio: o meio do traço fica perto do 0,65 antigo.
    const middle = strokeRadii(mouse, line(60, 5))[30]! * 2;
    expect(middle).toBeGreaterThan(5 * 0.65 * 0.8);
    expect(middle).toBeLessThan(5 * 0.65 * 1.35);
  });

  it("traço sem a marca abre exatamente como antes", () => {
    const radii = strokeRadii(old, points);
    expect(new Set(radii.map((r) => r.toFixed(6))).size).toBe(1);
  });

  it("a mesma conta serve à ponta ao vivo e ao traço pronto", () => {
    const full = strokeRadii(mouse, points);
    const partial = strokeRadii(mouse, points.slice(0, 30));
    // Só o raio do penúltimo ponto de um trecho pode mudar (depende do vizinho seguinte) e o
    // afinamento do fim, que depende do comprimento total; o começo do traço é estável.
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
  });

  it("recusa valor desconhecido", () => {
    expect(isHandwritingDocument(document("outra"))).toBe(false);
  });
});
