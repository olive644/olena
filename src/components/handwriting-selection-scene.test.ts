import { describe, expect, it, vi } from "vitest";
import {
  drawSelectionOverlay,
  hitsSelected,
  moveCoordinateSystems,
  moveImages,
  moveStickies,
  moveStrokes,
  pickInBox,
  pickInPolygon,
  selectionFrame,
  type SelectionScene,
} from "./handwriting-selection-scene";
import { DEFAULT_HANDWRITING_LAYER_VISIBILITY } from "../domain/handwriting";
import { stickyWidth } from "./handwriting-geometry";
import { PAGE_TEXT_SELECTION_ID, type Stroke } from "./handwriting-types";

const stroke = (id: string, points: [number, number][]): Stroke =>
  ({
    id,
    tool: "pen",
    brush: "fine",
    color: "#000",
    width: 4,
    points: points.map(([x, y]) => ({ x, y, pressure: 0.5 })),
  }) as unknown as Stroke;

function scene(overrides: Partial<SelectionScene> = {}): SelectionScene {
  return {
    strokes: [
      stroke("s1", [
        [100, 100],
        [200, 120],
        [300, 100],
        [400, 120],
      ]),
      stroke("s2", [
        [800, 800],
        [850, 820],
      ]),
    ],
    coordinateSystems: [
      {
        id: "c1",
        origin: { x: 500, y: 500, pressure: 0.5 },
        end: { x: 600, y: 600, pressure: 0.5 },
        step: 1,
        color: "#000",
      },
    ],
    stickies: [{ id: "n1", x: 300, y: 300, width: 100, height: 80, color: "yellow", text: "oi" }],
    images: [{ id: "i1", dataUrl: "data:,", x: 50, y: 700, width: 200, height: 100 }],
    pageText: "",
    pageTextSize: 28,
    pageTextFrame: { x: 100, y: 100, width: 800, height: 400 },
    layers: { ...DEFAULT_HANDWRITING_LAYER_VISIBILITY },
    ...overrides,
  };
}

const polygon = (x1: number, y1: number, x2: number, y2: number) => [
  { x: x1, y: y1, pressure: 0.5 },
  { x: x2, y: y1, pressure: 0.5 },
  { x: x2, y: y2, pressure: 0.5 },
  { x: x1, y: y2, pressure: 0.5 },
];

describe("escolher itens", () => {
  it("laço: leva traço quase todo dentro e itens cujo centro está dentro", () => {
    const picked = pickInPolygon(scene(), polygon(0, 0, 700, 700));
    expect(picked.ids).toEqual(expect.arrayContaining(["s1", "c1", "n1"]));
    expect(picked.ids).not.toContain("s2");
    expect(picked.ids).not.toContain("i1");
    expect(picked.coordinateIds).toEqual(["c1"]);
  });

  it("retângulo: qualquer item que toque a área", () => {
    const picked = pickInBox(scene(), { x: 380, y: 100, width: 100, height: 20 });
    expect(picked.ids).toEqual(["s1"]);
    const wide = pickInBox(scene(), { x: 0, y: 0, width: 1200, height: 1600 });
    expect(wide.ids).toEqual(expect.arrayContaining(["s1", "s2", "c1", "n1", "i1"]));
  });

  it("camadas escondidas não são escolhidas, e o texto da folha entra quando visível", () => {
    const layers = { ...DEFAULT_HANDWRITING_LAYER_VISIBILITY, stickies: false, coordinates: false };
    const picked = pickInBox(scene({ layers }), { x: 0, y: 0, width: 1200, height: 1600 });
    expect(picked.ids).not.toContain("n1");
    expect(picked.ids).not.toContain("c1");
    const withText = pickInBox(scene({ pageText: "Olá" }), {
      x: 0,
      y: 0,
      width: 1200,
      height: 1600,
    });
    expect(withText.ids).toContain(PAGE_TEXT_SELECTION_ID);
  });
});

describe("acertar o que já está selecionado", () => {
  it("só conta itens selecionados, com folga em volta", () => {
    expect(hitsSelected(scene(), ["s1"], { x: 200, y: 120, pressure: 0.5 })).toBe(true);
    expect(hitsSelected(scene(), ["s1"], { x: 200, y: 400, pressure: 0.5 })).toBe(false);
    expect(hitsSelected(scene(), [], { x: 200, y: 120, pressure: 0.5 })).toBe(false);
    expect(hitsSelected(scene(), ["n1"], { x: 310, y: 310, pressure: 0.5 })).toBe(true);
  });

  it("respeita as camadas: post-it escondido não recebe o toque", () => {
    const layers = { ...DEFAULT_HANDWRITING_LAYER_VISIBILITY, stickies: false };
    expect(hitsSelected(scene({ layers }), ["n1"], { x: 310, y: 310, pressure: 0.5 })).toBe(false);
  });
});

describe("caixa da seleção", () => {
  it("envolve os selecionados visíveis e é nula sem seleção", () => {
    expect(selectionFrame(scene(), [])).toBeNull();
    const frame = selectionFrame(scene(), ["s1", "n1"])!;
    expect(frame.x).toBe(100);
    expect(frame.y).toBeLessThanOrEqual(100);
    expect(frame.x + frame.width).toBeGreaterThanOrEqual(400);
  });
});

describe("mover", () => {
  const page = { width: 1200, height: 1600 };

  it("desloca só os selecionados e nunca sai da folha", () => {
    const s = scene();
    const moved = moveStrokes(s.strokes, ["s1"], 10, -500, page);
    expect(moved[0]!.points[0]).toMatchObject({ x: 110, y: 0 });
    expect(moved[1]).toBe(s.strokes[1]);
    const far = moveStrokes(s.strokes, ["s2"], 9999, 9999, page);
    expect(far[1]!.points[0]).toMatchObject({ x: 1200, y: 1600 });
  });

  it("sistemas, post-its e imagens acompanham e ficam dentro da folha", () => {
    const s = scene();
    expect(moveCoordinateSystems(s.coordinateSystems, ["c1"], 5, 5, page)[0]!.origin).toMatchObject(
      { x: 505, y: 505 },
    );
    expect(moveStickies(s.stickies, ["n1"], 5000, 0, page)[0]!.x).toBe(
      page.width - stickyWidth(s.stickies[0]!),
    );
    const image = moveImages(s.images, ["i1"], -500, 5000, page)[0]!;
    expect(image.x).toBe(0);
    expect(image.y).toBe(1500);
  });
});

describe("desenhar a seleção", () => {
  function fakeContext() {
    const calls: string[] = [];
    const proxy = new Proxy(
      {},
      {
        get: (_target, name: string) => {
          if (name === "fillStyle" || name === "strokeStyle" || name === "lineWidth") return "";
          return vi.fn(() => void calls.push(name));
        },
        set: () => true,
      },
    );
    return { context: proxy as unknown as CanvasRenderingContext2D, calls };
  }

  it("contorna cada item selecionado e põe as cinco alças na caixa", () => {
    const { context, calls } = fakeContext();
    drawSelectionOverlay(context, scene(), ["s1", "n1"], null, null);
    expect(calls.filter((name) => name === "strokeRect")).toHaveLength(3);
    expect(calls.filter((name) => name === "arc")).toHaveLength(5);
  });

  it("sem seleção não desenha alças, e durante o laço não mostra a caixa", () => {
    const empty = fakeContext();
    drawSelectionOverlay(empty.context, scene(), [], null, null);
    expect(empty.calls).not.toContain("arc");
    const lasso = fakeContext();
    drawSelectionOverlay(lasso.context, scene(), ["s1"], null, polygon(0, 0, 10, 10));
    expect(lasso.calls).not.toContain("arc");
    expect(lasso.calls).toContain("closePath");
  });

  it("o retângulo em andamento é preenchido", () => {
    const { context, calls } = fakeContext();
    drawSelectionOverlay(context, scene(), [], { x: 1, y: 2, width: 30, height: 40 }, null);
    expect(calls).toContain("fillRect");
  });
});
