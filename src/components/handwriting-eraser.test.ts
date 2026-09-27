import { expect, it } from "vitest";
import { eraseInkArea, eraseStrokeArea } from "./handwriting-eraser";
import type { Stroke } from "./handwriting-types";

const point = (x: number, y: number, pressure = 0.5) => ({ x, y, pressure });
const line: Stroke = {
  id: "line",
  tool: "pen",
  color: "#17151c",
  width: 4,
  points: [point(0, 100, 0.2), point(300, 100, 0.8)],
};
let id = 0;
const nextId = () => `fragment-${++id}`;

it("apaga somente o trecho tocado, inclusive em linhas com apenas dois pontos", () => {
  const result = eraseStrokeArea(line, [point(150, 100)], 20, nextId);
  expect(result).toHaveLength(2);
  expect(result[0]!.points[0]).toEqual(line.points[0]);
  expect(result[0]!.points.at(-1)!.x).toBeCloseTo(127.68, 2);
  expect(result[1]!.points[0]!.x).toBeCloseTo(172.32, 2);
  expect(result[1]!.points.at(-1)).toEqual(line.points.at(-1));
  expect(result[0]!.points.at(-1)!.pressure).toBeGreaterThan(0.2);
  expect(new Set(result.map((stroke) => stroke.id)).size).toBe(2);
  expect(result.every((stroke) => stroke.color === line.color)).toBe(true);
  expect(line.points).toHaveLength(2);
});

it("varre a área entre eventos distantes sem apagar o resto do traço", () => {
  const result = eraseStrokeArea(line, [point(150, 0), point(150, 200)], 20, nextId);
  expect(result).toHaveLength(2);
  expect(result[0]!.points.at(-1)!.x).toBeLessThan(131);
  expect(result[1]!.points[0]!.x).toBeGreaterThan(169);
});

it("mantém referências e IDs quando a área não atinge tinta", () => {
  const strokes = [line];
  expect(eraseInkArea(strokes, [point(500, 500)], 20, nextId)).toBe(strokes);
});

it("recorta vários cruzamentos e mantém pontas, pressão e inclinação", () => {
  const stroke = {
    ...line,
    points: [point(0, 100), { ...point(300, 100), tiltX: 40 }, point(0, 200), point(300, 200)],
  };
  const fragments = eraseStrokeArea(stroke, [point(150, 50), point(150, 250)], 15, nextId);
  expect(fragments).toHaveLength(4);
  expect(fragments.flatMap((fragment) => fragment.points).some((p) => p.tiltX && p.tiltX > 0)).toBe(
    true,
  );
  for (const fragment of fragments)
    expect(fragment.points.every((p) => p.x < 135 || p.x > 165)).toBe(true);
});

it("remove um ponto isolado e um traço coberto por inteiro", () => {
  expect(
    eraseStrokeArea({ ...line, points: [point(150, 100)] }, [point(150, 100)], 20, nextId),
  ).toEqual([]);
  expect(eraseStrokeArea(line, [point(0, 100), point(300, 100)], 20, nextId)).toEqual([]);
});
