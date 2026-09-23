import { describe, expect, it } from "vitest";
import type {
  HandwritingCoordinateSystem,
  HandwritingPoint,
  HandwritingSticky,
  HandwritingStroke,
} from "../domain/handwriting";
import {
  coordinateBounds,
  distanceToSegment,
  overlaps,
  pageTextBounds,
  pointDistance,
  pointInPolygon,
  stickyBounds,
  stickyHeight,
  stickyWidth,
  strokeBounds,
  strokeTouches,
  unionBounds,
} from "./handwriting-geometry";

function point(x: number, y: number): HandwritingPoint {
  return { x, y, pressure: 0.5 };
}

function stroke(points: HandwritingPoint[]): HandwritingStroke {
  return { id: "s1", tool: "pen", color: "#000000", width: 4, points };
}

function sticky(overrides: Partial<HandwritingSticky> = {}): HandwritingSticky {
  return { id: "n1", x: 10, y: 20, color: "yellow", text: "", ...overrides };
}

describe("tamanho dos post-its", () => {
  it("usa o tamanho padrão quando o post-it não define largura e altura", () => {
    expect(stickyWidth(sticky())).toBe(260);
    expect(stickyHeight(sticky())).toBe(220);
  });

  it("limita largura e altura aos mínimos e máximos", () => {
    expect(stickyWidth(sticky({ width: 10 }))).toBe(160);
    expect(stickyWidth(sticky({ width: 9000 }))).toBe(520);
    expect(stickyHeight(sticky({ height: 10 }))).toBe(120);
    expect(stickyHeight(sticky({ height: 9000 }))).toBe(420);
  });

  it("monta a caixa do post-it com posição e tamanho já limitados", () => {
    expect(stickyBounds(sticky({ width: 9000, height: 10 }))).toEqual({
      x: 10,
      y: 20,
      width: 520,
      height: 120,
    });
  });
});

describe("caixas delimitadoras", () => {
  it("calcula a caixa de um traço", () => {
    expect(strokeBounds(stroke([point(10, 40), point(30, 5), point(20, 25)]))).toEqual({
      x: 10,
      y: 5,
      width: 20,
      height: 35,
    });
  });

  it("calcula a caixa de um sistema de coordenadas em qualquer direção", () => {
    const system: HandwritingCoordinateSystem = {
      id: "c1",
      origin: point(100, 300),
      end: point(20, 40),
      step: 1,
      color: "#000000",
    };
    expect(coordinateBounds(system)).toEqual({ x: 20, y: 40, width: 80, height: 260 });
  });

  it("limita a altura do texto da folha a 1440 pixels", () => {
    const longText = Array.from({ length: 500 }, () => "linha").join("\n");
    expect(pageTextBounds(longText, 28).height).toBe(1440);
    expect(pageTextBounds("", 28)).toMatchObject({ x: 112, y: 80, width: 980 });
  });

  it("une várias caixas e devolve nulo quando não há nenhuma", () => {
    expect(unionBounds([])).toBeNull();
    expect(
      unionBounds([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 50, y: 20, width: 10, height: 30 },
      ]),
    ).toEqual({ x: 0, y: 0, width: 60, height: 50 });
  });
});

describe("sobreposição e seleção", () => {
  const box = { x: 0, y: 0, width: 10, height: 10 };

  it("considera sobrepostas caixas que se cruzam ou se tocam na borda", () => {
    expect(overlaps(box, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(overlaps(box, { x: 10, y: 0, width: 5, height: 5 })).toBe(true);
  });

  it("não considera sobrepostas caixas separadas", () => {
    expect(overlaps(box, { x: 11, y: 0, width: 5, height: 5 })).toBe(false);
    expect(overlaps(box, { x: 0, y: 11, width: 5, height: 5 })).toBe(false);
  });

  it("detecta pontos dentro e fora de um polígono de laço", () => {
    const triangle = [point(0, 0), point(10, 0), point(0, 10)];
    expect(pointInPolygon(point(2, 2), triangle)).toBe(true);
    expect(pointInPolygon(point(8, 8), triangle)).toBe(false);
    expect(pointInPolygon(point(1, 1), [])).toBe(false);
  });
});

describe("distâncias e borracha", () => {
  it("mede a distância entre dois pontos", () => {
    expect(pointDistance(point(0, 0), point(3, 4))).toBe(5);
  });

  it("mede a distância até um segmento, inclusive fora das pontas", () => {
    expect(distanceToSegment(point(5, 3), point(0, 0), point(10, 0))).toBe(3);
    expect(distanceToSegment(point(-4, 3), point(0, 0), point(10, 0))).toBe(5);
    expect(distanceToSegment(point(13, 4), point(0, 0), point(10, 0))).toBe(5);
  });

  it("trata um segmento de comprimento zero como um ponto", () => {
    expect(distanceToSegment(point(3, 4), point(0, 0), point(0, 0))).toBe(5);
  });

  it("acerta um traço de um único ponto só dentro do raio", () => {
    const dot = stroke([point(10, 10)]);
    expect(strokeTouches(dot, point(13, 14), 5)).toBe(true);
    expect(strokeTouches(dot, point(13, 14), 4)).toBe(false);
  });

  it("acerta um traço com vários pontos quando o raio alcança algum segmento", () => {
    const line = stroke([point(0, 0), point(100, 0)]);
    expect(strokeTouches(line, point(50, 6), 6)).toBe(true);
    expect(strokeTouches(line, point(50, 7), 6)).toBe(false);
  });
});
