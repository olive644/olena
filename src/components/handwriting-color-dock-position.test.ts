import { describe, expect, it } from "vitest";
import {
  nearestColorDockEdge,
  placeColorDock,
  type ColorDockBox,
  type ColorDockEdge,
} from "./handwriting-color-dock-position";

describe("encaixe da paleta", () => {
  const area = { x: 140, y: 0, width: 900, height: 700 };
  it.each([
    ["left", 142, 350],
    ["right", 1038, 350],
    ["top", 550, 2],
    ["bottom", 550, 698],
  ] as const)("seleciona a borda %s pela posição de soltura", (edge, x, y) => {
    expect(nearestColorDockEdge(x, y, area)).toBe(edge);
  });
  it.each(["left", "right", "top", "bottom"] as ColorDockEdge[])(
    "fica na borda %s mesmo quando solta no centro",
    (edge) => {
      const horizontal = edge === "top" || edge === "bottom";
      const size = horizontal ? { width: 420, height: 52 } : { width: 52, height: 420 };
      const point = placeColorDock(area, size, edge, 0.5);
      expect(point.x).toBeGreaterThanOrEqual(area.x);
      expect(point.y).toBeGreaterThanOrEqual(area.y);
      expect(point.x + size.width).toBeLessThanOrEqual(area.x + area.width);
      expect(point.y + size.height).toBeLessThanOrEqual(area.y + area.height);
      if (edge === "left") expect(point.x).toBe(area.x + 8);
      if (edge === "right") expect(point.x).toBe(area.x + area.width - size.width - 8);
      if (edge === "top") expect(point.y).toBe(area.y + 8);
      if (edge === "bottom") expect(point.y).toBe(area.y + area.height - size.height - 8);
    },
  );
  it.each([320, 900])("evita a seta roxa com viewport de %s px", (width) => {
    const viewport = { x: 0, y: 0, width, height: 500 };
    const obstacle = { x: -10, y: 220, width: 40, height: 44 };
    const size = { width: 52, height: 400 };
    const point = placeColorDock(viewport, size, "left", 0.5, obstacle);
    const overlaps =
      point.x < obstacle.x + obstacle.width &&
      point.x + size.width > obstacle.x &&
      point.y < obstacle.y + obstacle.height &&
      point.y + size.height > obstacle.y;
    expect(overlaps).toBe(false);
    expect(point.x + size.width).toBeLessThanOrEqual(width);
  });
  it("desvia da seta pela posição livre mais próxima na mesma borda", () => {
    const obstacle: ColorDockBox = { x: 135, y: 300, width: 40, height: 44 };
    const point = placeColorDock(area, { width: 52, height: 200 }, "left", 0.5, obstacle);
    expect(point.x).toBe(area.x + 8);
    expect(point.y).toBe(obstacle.y + obstacle.height + 8);
  });
});

it("desvia da seta direita quando a paleta ocupa quase toda a altura", () => {
  const area = { x: 0, y: 0, width: 900, height: 500 };
  const arrow = { x: 872, y: 225, width: 28, height: 44 };
  const point = placeColorDock(area, { width: 52, height: 420 }, "right", 0.5, [arrow]);
  expect(point.x + 52 + 8).toBeLessThanOrEqual(arrow.x);
});
it("considera as duas setas e o folheamento juntos", () => {
  const area = { x: 0, y: 0, width: 900, height: 700 };
  const arrows = [
    { x: 0, y: 300, width: 28, height: 44 },
    { x: 872, y: 300, width: 28, height: 44 },
    { x: 420, y: 650, width: 44, height: 44 },
  ];
  for (const edge of ["left", "right", "top", "bottom"] as const) {
    const size =
      edge === "top" || edge === "bottom" ? { width: 420, height: 52 } : { width: 52, height: 420 };
    const point = placeColorDock(area, size, edge, 0.5, arrows);
    expect(
      arrows.some(
        (a) =>
          point.x < a.x + a.width &&
          point.x + size.width > a.x &&
          point.y < a.y + a.height &&
          point.y + size.height > a.y,
      ),
    ).toBe(false);
  }
});
