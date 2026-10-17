import { describe, expect, it } from "vitest";
import { clampSpaceShift, itemsBelowLine, shiftBelowLine } from "./handwriting-vertical-space";
import { strokeInkBounds } from "./handwriting-geometry";
import type { SelectionScene } from "./handwriting-selection-scene";
import type { Stroke } from "./handwriting-types";

const PAGE = { width: 1200, height: 1600 };
const point = (x: number, y: number) => ({ x, y, pressure: 0.5 });
const stroke = (id: string, ...ys: number[]): Stroke => ({
  id,
  tool: "pen",
  brush: "fine",
  color: "#17151c",
  width: 4,
  points: ys.map((y, index) => point(100 + index * 40, y)),
});

function scene(partial: Partial<SelectionScene> = {}): SelectionScene {
  return {
    strokes: [],
    coordinateSystems: [],
    stickies: [],
    images: [],
    pageText: "",
    pageTextSize: 28,
    pageTextFrame: { x: 112, y: 80, width: 980, height: 1440 },
    layers: { background: true, coordinates: true, strokes: true, text: true, stickies: true },
    ...partial,
  };
}

describe("espaço vertical: o que desce", () => {
  const full = scene({
    strokes: [stroke("above", 100, 120), stroke("below", 500, 520), stroke("cross", 380, 460)],
    stickies: [{ id: "note", x: 50, y: 600, color: "yellow", text: "a" }],
    images: [{ id: "img", dataUrl: "data:,", x: 10, y: 700, width: 100, height: 100 }],
    coordinateSystems: [
      { id: "axes", origin: point(100, 900), end: point(300, 1100), step: 1, color: "#000000" },
    ],
  });

  it("desce o que começa na linha ou abaixo, e deixa o que cruza a linha", () => {
    const items = itemsBelowLine(full, 400);
    expect(items.strokeIds).toEqual(["below"]);
    expect(items.stickyIds).toEqual(["note"]);
    expect(items.imageIds).toEqual(["img"]);
    expect(items.coordinateIds).toEqual(["axes"]);
  });

  it("abre espaço movendo só o que está abaixo, inclusive camadas ocultas", () => {
    const hidden = scene({
      ...full,
      layers: {
        background: false,
        coordinates: false,
        strokes: false,
        text: false,
        stickies: false,
      },
    });
    const result = shiftBelowLine(hidden, 400, 120, PAGE);
    expect(result.shift).toBe(120);
    expect(result.strokes.find((s) => s.id === "above")!.points[0]!.y).toBe(100);
    expect(result.strokes.find((s) => s.id === "cross")!.points[0]!.y).toBe(380);
    expect(result.strokes.find((s) => s.id === "below")!.points[0]!.y).toBe(620);
    expect(result.stickies[0]!.y).toBe(720);
    expect(result.images[0]!.y).toBe(820);
    expect(result.coordinateSystems[0]!.origin.y).toBe(1020);
    expect(result.coordinateSystems[0]!.end.y).toBe(1220);
  });

  it("não altera x nem os pontos do que fica acima", () => {
    const result = shiftBelowLine(full, 400, 60, PAGE);
    expect(result.strokes[0]).toBe(full.strokes[0]);
    expect(result.strokes[1]!.points.map((p) => p.x)).toEqual(
      full.strokes[1]!.points.map((p) => p.x),
    );
  });

  it("move a moldura do texto da folha só quando ela começa abaixo da linha", () => {
    const withText = scene({
      pageText: "olá",
      pageTextFrame: { x: 112, y: 700, width: 500, height: 300 },
    });
    expect(shiftBelowLine(withText, 400, 50, PAGE).pageTextFrame.y).toBe(750);
    expect(shiftBelowLine(withText, 800, 50, PAGE).pageTextFrame.y).toBe(700);
  });
});

describe("espaço vertical: limites", () => {
  const base = scene({ strokes: [stroke("up", 300, 340), stroke("down", 600, 640)] });

  it("abrir espaço pára quando o item mais baixo chega ao fim da folha", () => {
    const shift = clampSpaceShift(base, 450, 5000, PAGE.height);
    expect(shift).toBeGreaterThan(0);
    const bottom = shiftBelowLine(base, 450, 5000, PAGE).strokes[1]!.points[1]!.y;
    expect(bottom).toBeLessThanOrEqual(PAGE.height);
    expect(bottom + 4).toBeGreaterThan(PAGE.height - 5);
  });

  it("fechar espaço só consome o espaço vazio e nunca cobre o que está acima", () => {
    const shift = clampSpaceShift(base, 450, -5000, PAGE.height);
    const moved = shiftBelowLine(base, 450, -5000, PAGE);
    expect(shift).toBeLessThan(0);
    const upBottom = strokeInkBounds(moved.strokes[0]!);
    const downTop = strokeInkBounds(moved.strokes[1]!);
    // Sobe até a linha (450) e pára: nada passa da linha nem cobre o que está acima dela.
    expect(downTop.y).toBeCloseTo(450, 6);
    expect(downTop.y).toBeGreaterThanOrEqual(upBottom.y + upBottom.height);
  });

  it("um item que cruza a linha também segura o fechamento", () => {
    const crossing = scene({ strokes: [stroke("cross", 380, 520), stroke("down", 600, 640)] });
    const moved = shiftBelowLine(crossing, 450, -5000, PAGE);
    const cross = strokeInkBounds(moved.strokes[0]!);
    expect(strokeInkBounds(moved.strokes[1]!).y).toBeCloseTo(cross.y + cross.height, 6);
  });

  it("sem nada abaixo da linha, nada se move", () => {
    expect(clampSpaceShift(base, 900, 200, PAGE.height)).toBe(0);
    expect(clampSpaceShift(scene(), 100, -50, PAGE.height)).toBe(0);
  });

  it("deslocamento zero devolve a folha igual", () => {
    const result = shiftBelowLine(base, 450, 0, PAGE);
    expect(result.strokes.map((s) => s.points.map((p) => p.y))).toEqual(
      base.strokes.map((s) => s.points.map((p) => p.y)),
    );
  });
});
