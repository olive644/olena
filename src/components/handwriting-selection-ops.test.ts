import { describe, expect, it } from "vitest";
import {
  PASTE_OFFSET,
  copyItems,
  dragRotation,
  dragScaleFactor,
  hitSelectionHandle,
  oppositeCorner,
  scaleItems,
  selectionHandles,
  lassoContainsStroke,
  mergeSelection,
  pasteItems,
  rotateItems,
  selectionSize,
  type SelectionItems,
} from "./handwriting-selection-ops";
import type { Stroke } from "./handwriting-types";

const stroke = (id: string, points: [number, number][]): Stroke =>
  ({
    id,
    tool: "pen",
    brush: "fine",
    color: "#000",
    width: 4,
    points: points.map(([x, y]) => ({ x, y, pressure: 0.5 })),
  }) as unknown as Stroke;

const items = (): SelectionItems => ({
  strokes: [
    stroke("s1", [
      [100, 100],
      [200, 100],
    ]),
    stroke("s2", [[500, 500]]),
  ],
  stickies: [{ id: "n1", x: 300, y: 300, width: 100, height: 80, color: "yellow", text: "oi" }],
  coordinateSystems: [
    {
      id: "c1",
      origin: { x: 10, y: 10, pressure: 0.5 },
      end: { x: 110, y: 110, pressure: 0.5 },
      step: 1,
      color: "#000",
    },
  ],
  images: [
    { id: "i1", dataUrl: "data:image/png;base64,AA", x: 50, y: 60, width: 200, height: 100 },
  ],
});

describe("copiar e colar", () => {
  it("copia só o selecionado e não guarda referência aos originais", () => {
    const source = items();
    const copy = copyItems(source, new Set(["s1", "n1"]));
    expect(selectionSize(copy)).toBe(2);
    copy.strokes[0]!.points[0]!.x = 999;
    expect(source.strokes[0]!.points[0]!.x).toBe(100);
  });

  it("cola com ids novos, deslocada, e devolve os ids para selecionar", () => {
    let counter = 0;
    const clip = copyItems(items(), new Set(["s1", "n1", "c1", "i1"]));
    const { items: pasted, ids } = pasteItems(clip, PASTE_OFFSET, () => `novo-${(counter += 1)}`);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    expect(pasted.strokes[0]!.id).not.toBe("s1");
    expect(pasted.strokes[0]!.points[0]).toMatchObject({
      x: 100 + PASTE_OFFSET,
      y: 100 + PASTE_OFFSET,
    });
    expect(pasted.stickies[0]).toMatchObject({ x: 300 + PASTE_OFFSET, y: 300 + PASTE_OFFSET });
    expect(pasted.coordinateSystems[0]!.origin).toMatchObject({ x: 10 + PASTE_OFFSET });
    expect(pasted.images[0]).toMatchObject({ x: 50 + PASTE_OFFSET, y: 60 + PASTE_OFFSET });
  });

  it("nunca cola fora da folha", () => {
    const clip = copyItems(
      { ...items(), strokes: [stroke("edge", [[1199, 1599]])] },
      new Set(["edge"]),
    );
    const { items: pasted } = pasteItems(clip, 200, () => "x");
    expect(pasted.strokes[0]!.points[0]).toMatchObject({ x: 1200, y: 1600 });
  });

  it("colar duas vezes gera itens diferentes", () => {
    let counter = 0;
    const clip = copyItems(items(), new Set(["s1"]));
    const first = pasteItems(clip, 36, () => `a${(counter += 1)}`);
    const second = pasteItems(clip, 72, () => `a${(counter += 1)}`);
    expect(first.ids[0]).not.toBe(second.ids[0]);
    expect(clip.strokes[0]!.id).toBe("s1");
  });
});

describe("girar a seleção", () => {
  it("gira um traço em torno do centro e volta ao original em 360 graus", () => {
    const source = items();
    const turned = rotateItems(source, new Set(["s1"]), 90, { x: 150, y: 100 });
    expect(turned.strokes[0]!.points[0]!.x).toBeCloseTo(150, 5);
    expect(turned.strokes[0]!.points[0]!.y).toBeCloseTo(50, 5);
    expect(turned.strokes[1]).toBe(source.strokes[1]);
    const full = rotateItems(source, new Set(["s1"]), 360, { x: 150, y: 100 });
    expect(full.strokes[0]!.points[1]!.x).toBeCloseTo(200, 5);
  });

  it("imagens giram e acumulam a rotação; post-its só orbitam", () => {
    const turned = rotateItems(items(), new Set(["i1", "n1"]), 15, { x: 400, y: 300 });
    expect(turned.images[0]!.rotation).toBe(15);
    expect(turned.stickies[0]!.text).toBe("oi");
    const back = rotateItems(turned, new Set(["i1"]), -15, { x: 400, y: 300 });
    expect(back.images[0]!.rotation).toBe(0);
  });
});

describe("laço", () => {
  const square = [
    { x: 0, y: 0, pressure: 0.5 },
    { x: 300, y: 0, pressure: 0.5 },
    { x: 300, y: 300, pressure: 0.5 },
    { x: 0, y: 300, pressure: 0.5 },
  ];

  it("pega o traço que está quase todo dentro e ignora o que só encosta", () => {
    expect(
      lassoContainsStroke(
        square,
        stroke("in", [
          [10, 10],
          [100, 100],
          [200, 200],
          [500, 500],
        ]),
      ),
    ).toBe(true);
    expect(
      lassoContainsStroke(
        square,
        stroke("edge", [
          [290, 290],
          [400, 400],
          [500, 500],
          [600, 600],
        ]),
      ),
    ).toBe(false);
  });

  it("não seleciona com um laço de menos de três pontos", () => {
    expect(lassoContainsStroke(square.slice(0, 2), stroke("a", [[10, 10]]))).toBe(false);
  });

  it("com Shift soma à seleção sem duplicar; sem Shift troca", () => {
    expect(mergeSelection(["a", "b"], ["b", "c"], true)).toEqual(["a", "b", "c"]);
    expect(mergeSelection(["a", "b"], ["c"], false)).toEqual(["c"]);
  });
});

describe("alças da caixa de seleção", () => {
  const bounds = { x: 100, y: 200, width: 200, height: 100 };

  it("acha o canto tocado, a alça de girar e ignora o resto", () => {
    const handles = selectionHandles(bounds);
    expect(hitSelectionHandle(handles.se, bounds, 20)).toBe("se");
    expect(hitSelectionHandle(handles.nw, bounds, 20)).toBe("nw");
    expect(hitSelectionHandle(handles.rotate, bounds, 20)).toBe("rotate");
    expect(hitSelectionHandle({ x: 200, y: 250 }, bounds, 20)).toBeNull();
  });

  it("o canto oposto é a âncora", () => {
    const handles = selectionHandles(bounds);
    expect(oppositeCorner(bounds, "se")).toEqual(handles.nw);
    expect(oppositeCorner(bounds, "nw")).toEqual(handles.se);
  });

  it("fator de escala: proporcional à distância da âncora, com limites", () => {
    const anchor = { x: 0, y: 0 };
    expect(dragScaleFactor(anchor, { x: 100, y: 0 }, { x: 200, y: 0 })).toBe(2);
    expect(dragScaleFactor(anchor, { x: 100, y: 0 }, { x: 0, y: 0 })).toBe(0.1);
    expect(dragScaleFactor(anchor, { x: 100, y: 0 }, { x: 5000, y: 0 })).toBe(8);
    expect(dragScaleFactor(anchor, { x: 0.2, y: 0 }, { x: 50, y: 0 })).toBe(1);
  });

  it("escala a partir da âncora e engrossa o traço", () => {
    const scaled = scaleItems(items(), new Set(["s1"]), 2, { x: 100, y: 100 });
    expect(scaled.strokes[0]!.points[1]).toMatchObject({ x: 300, y: 100 });
    expect(scaled.strokes[0]!.width).toBe(8);
    const image = scaleItems(items(), new Set(["i1"]), 0.5, { x: 50, y: 60 }).images[0]!;
    expect(image).toMatchObject({ x: 50, y: 60, width: 100, height: 50 });
  });

  it("nunca leva itens para fora da folha", () => {
    const big = scaleItems(items(), new Set(["s2"]), 8, { x: 0, y: 0 });
    expect(big.strokes[1]!.points[0]).toMatchObject({ x: 1200, y: 1600 });
  });

  it("gira pelo arrasto: um quarto de volta e encaixe de 15 graus", () => {
    const center = { x: 0, y: 0 };
    expect(dragRotation(center, { x: 100, y: 0 }, { x: 0, y: 100 }, false)).toBeCloseTo(90, 5);
    expect(dragRotation(center, { x: 100, y: 0 }, { x: 100, y: 20 }, true)).toBe(15);
  });
});
