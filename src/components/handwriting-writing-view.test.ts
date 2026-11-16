import { describe, expect, it } from "vitest";
import { navigateWritingView, writingViewSize } from "./handwriting-writing-view";

describe("zoom ancorado na janela", () => {
  const page = { width: 1200, height: 1600 };
  const view = { x: 200, y: 300, zoom: 1 };
  it.each([0.25, 0.5, 0.8])("mantém o ponto de mira na posição relativa %s", (fraction) => {
    const point = { x: fraction, y: 0.65 };
    for (const zoom of [0.7, 1.5, 3]) {
      const next = navigateWritingView(view, page, point, point, zoom);
      const before = writingViewSize(view.zoom),
        after = writingViewSize(next.zoom);
      expect(next.x + point.x * after.width).toBeCloseTo(view.x + point.x * before.width);
      expect(next.y + point.y * after.height).toBeCloseTo(view.y + point.y * before.height);
    }
  });
  it("combina zoom e deslocamento do centro dos dedos", () => {
    const from = { x: 0.4, y: 0.4 },
      to = { x: 0.55, y: 0.6 };
    const next = navigateWritingView(view, page, from, to, 2);
    const before = writingViewSize(1),
      after = writingViewSize(2);
    expect(next.x + to.x * after.width).toBeCloseTo(view.x + from.x * before.width);
    expect(next.y + to.y * after.height).toBeCloseTo(view.y + from.y * before.height);
  });
  it("mantém a janela dentro dos limites da folha", () => {
    for (const zoom of [0.01, 0.5, 10]) {
      const next = navigateWritingView(view, page, { x: 100, y: -100 }, { x: 0, y: 0 }, zoom);
      const size = writingViewSize(next.zoom);
      expect(next.x).toBeGreaterThanOrEqual(0);
      expect(next.y).toBeGreaterThanOrEqual(0);
      expect(next.x + size.width).toBeLessThanOrEqual(page.width);
      expect(next.y + size.height).toBeLessThanOrEqual(page.height);
    }
  });
});

it("ajustar a proporção da janela preserva o centro e a escala da tinta", () => {
  const view = { x: 200, y: 300, zoom: 1 };
  const next = navigateWritingView(
    view,
    { width: 1200, height: 1600 },
    { x: 0.5, y: 0.5 },
    { x: 0.5, y: 0.5 },
    1,
    1.5,
  );
  const before = writingViewSize(view.zoom),
    after = writingViewSize(next.zoom, next.aspect);
  expect(next.x + after.width / 2).toBeCloseTo(view.x + before.width / 2);
  expect(next.y + after.height / 2).toBeCloseTo(view.y + before.height / 2);
  expect(after.width / after.height).toBeCloseTo(1.5);
});
