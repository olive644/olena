import { act, renderHook } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSelectionGesture } from "./use-selection-gesture";
import {
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  type HandwritingCoordinateSystem,
  type HandwritingImage,
  type HandwritingSticky,
} from "../domain/handwriting";
import type { SelectionScene } from "../components/handwriting-selection-scene";
import { selectionHandles } from "../components/handwriting-selection-ops";
import {
  PAGE_TEXT_SELECTION_ID,
  type SelectionMode,
  type Stroke,
} from "../components/handwriting-types";

const stroke = (id: string, x: number, y: number): Stroke =>
  ({
    id,
    tool: "pen",
    brush: "fine",
    color: "#000",
    width: 4,
    points: [
      { x, y, pressure: 0.5 },
      { x: x + 100, y: y + 40, pressure: 0.5 },
    ],
  }) as unknown as Stroke;

const closedRectangleStroke = (id: string): Stroke =>
  ({
    id,
    tool: "pen",
    brush: "fine",
    color: "#000",
    width: 4,
    points: [at(100, 100), at(300, 100), at(300, 300), at(100, 300), at(100, 100)],
  }) as unknown as Stroke;

const at = (x: number, y: number) => ({ x, y, pressure: 0.5 });

function useHarness(
  mode: SelectionMode = "rectangle",
  withText = false,
  withObjects = false,
  initialStrokes: Stroke[] = [stroke("a", 100, 100), stroke("b", 600, 600)],
) {
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [stickies, setStickies] = useState<HandwritingSticky[]>(
    withObjects
      ? [
          { id: "sticky", x: 300, y: 300, color: "yellow", text: "Nota" },
          {
            id: "formula",
            x: 300,
            y: 600,
            color: "yellow",
            kind: "text",
            formula: true,
            text: "y = x",
          },
        ]
      : [],
  );
  const [coordinateSystems, setCoordinateSystems] = useState<HandwritingCoordinateSystem[]>(
    withObjects
      ? [{ id: "axes", origin: at(600, 400), end: at(800, 200), step: 1, color: "#000" }]
      : [],
  );
  const [images, setImportedImages] = useState<HandwritingImage[]>(
    withObjects
      ? [{ id: "image", dataUrl: "data:,", x: 400, y: 700, width: 100, height: 100 }]
      : [],
  );
  const [pageTextFrame, setPageTextFrame] = useState({ x: 700, y: 900, width: 300, height: 200 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCoordinateIds, setSelectedCoordinateIds] = useState<string[]>([]);
  const remember = useMemo(() => vi.fn(), []);
  const scene: SelectionScene = {
    strokes,
    stickies,
    coordinateSystems,
    images,
    pageText: withText ? "Anotação" : "",
    pageTextSize: 28,
    pageTextFrame,
    layers: DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  };
  const gesture = useSelectionGesture({
    scene,
    selectionMode: mode,
    selectedIds,
    selectedCoordinateIds,
    page: { width: 1200, height: 1600 },
    remember,
    setSelectedIds,
    setSelectedCoordinateIds,
    setStrokes,
    setStickies,
    setCoordinateSystems,
    setImportedImages,
    setPageTextFrame,
  });
  return {
    gesture,
    strokes,
    selectedIds,
    remember,
    pageTextFrame,
    stickies,
    images,
    coordinateSystems,
    setStrokes,
    setSelectedIds,
  };
}

const pointer = { pointerId: 1, pointerType: "mouse" };

describe("gesto da ferramenta Selecionar", () => {
  it.each(["mouse", "pen", "touch"])(
    "preserva a forma nas bordas e aplica a posição final com %s",
    (pointerType) => {
      const { result } = renderHook(() =>
        useHarness("rectangle", false, false, [closedRectangleStroke("box")]),
      );
      act(() => result.current.setSelectedIds(["box"]));
      const event = { pointerId: 4, pointerType };
      act(() => result.current.gesture.begin(event, at(200, 200)));
      act(() => void result.current.gesture.move(event, at(9000, 9000)));
      let points = result.current.strokes[0]!.points;
      expect(points[1]!.x - points[0]!.x).toBe(200);
      expect(points[2]!.y - points[1]!.y).toBe(200);
      act(() => void result.current.gesture.move(event, at(200, 200)));
      expect(result.current.strokes[0]!.points[0]).toMatchObject({ x: 100, y: 100 });
      act(() => void result.current.gesture.end(at(240, 220)));
      points = result.current.strokes[0]!.points;
      expect(points[0]).toMatchObject({ x: 140, y: 120 });
      expect(result.current.remember).toHaveBeenCalledTimes(1);
    },
  );

  it("redimensiona no modo Mover mantendo o canto oposto e a proporção na borda", () => {
    const { result } = renderHook(() =>
      useHarness("rectangle", false, false, [closedRectangleStroke("box")]),
    );
    act(() => result.current.setSelectedIds(["box"]));
    const corner = selectionHandles({ x: 100, y: 100, width: 200, height: 200 }).se;
    act(() => result.current.gesture.begin(pointer, at(corner.x, corner.y), true));
    act(() => void result.current.gesture.end(at(5000, 5000)));
    const points = result.current.strokes[0]!.points;
    expect(points[0]).toMatchObject({ x: 100, y: 100 });
    expect(points[1]!.x).toBeLessThanOrEqual(1200);
    expect(points[1]!.x - points[0]!.x).toBeCloseTo(points[2]!.y - points[1]!.y);
    expect(points[1]!.x - points[0]!.x).toBeGreaterThan(200);
  });

  it.each(["mouse", "pen", "touch"])(
    "Move uma forma arrastando o interior da caixa com %s, sem exigir tocar no traço",
    (pointerType) => {
      const { result } = renderHook(() =>
        useHarness("rectangle", false, false, [closedRectangleStroke("box")]),
      );
      act(() => result.current.setSelectedIds(["box"]));
      const event = { pointerId: 9, pointerType };
      act(() => result.current.gesture.begin(event, at(200, 200)));
      act(() => void result.current.gesture.move(event, at(240, 220)));
      act(() => void result.current.gesture.end(at(240, 220)));
      expect(result.current.strokes[0]!.points[0]).toMatchObject({ x: 140, y: 120 });
      expect(result.current.selectedIds).toEqual(["box"]);
    },
  );

  it.each(["mouse", "pen", "touch"])(
    "Mover transporta todos os tipos juntos com %s",
    (pointerType) => {
      const { result } = renderHook(() => useHarness("rectangle", true, true));
      const event = { pointerId: 7, pointerType };
      act(() => result.current.gesture.begin(event, at(0, 0)));
      act(() => void result.current.gesture.end(at(1190, 1500)));
      expect(result.current.selectedIds).toHaveLength(7);
      act(() => result.current.gesture.begin(event, at(1100, 1300), true));
      act(() => void result.current.gesture.move(event, at(1140, 1320)));
      act(() => void result.current.gesture.end(at(1140, 1320)));
      expect(result.current.strokes[0]!.points[0]).toMatchObject({ x: 140, y: 120 });
      expect(result.current.stickies[0]).toMatchObject({ x: 340, y: 320 });
      expect(result.current.stickies[1]).toMatchObject({ x: 340, y: 620 });
      expect(result.current.coordinateSystems[0]!.origin).toMatchObject({ x: 640, y: 420 });
      expect(result.current.images[0]).toMatchObject({ x: 440, y: 720 });
      expect(result.current.pageTextFrame).toMatchObject({ x: 740, y: 920 });
      expect(result.current.remember).toHaveBeenCalledTimes(1);
    },
  );

  it("arrasta a seleção feita com laço sem apagá-la", () => {
    const { result } = renderHook(() => useHarness("lasso"));
    act(() => result.current.gesture.begin(pointer, at(0, 0)));
    for (const point of [at(300, 0), at(300, 300), at(0, 300)])
      act(() => void result.current.gesture.move(pointer, point));
    act(() => void result.current.gesture.end(at(0, 0)));
    act(() => result.current.gesture.begin(pointer, at(150, 120)));
    act(() => void result.current.gesture.move(pointer, at(190, 140)));
    act(() => void result.current.gesture.end(at(190, 140)));
    expect(result.current.selectedIds).toEqual(["a"]);
    expect(result.current.strokes[0]!.points[0]).toMatchObject({ x: 140, y: 120 });
  });
  it("retângulo: mostra a área ao arrastar e escolhe o que toca ao soltar", () => {
    const { result } = renderHook(() => useHarness("rectangle"));
    act(() => result.current.gesture.begin(pointer, at(80, 80)));
    act(() => void result.current.gesture.move(pointer, at(260, 200)));
    expect(result.current.gesture.selectionBox).toEqual({ x: 80, y: 80, width: 180, height: 120 });
    act(() => void result.current.gesture.end(at(260, 200)));
    expect(result.current.selectedIds).toEqual(["a"]);
    expect(result.current.gesture.selectionBox).toBeNull();
  });

  it("laço: acompanha o caminho e, com Shift, soma à seleção anterior", () => {
    const { result } = renderHook(() => useHarness("lasso"));
    act(() => result.current.gesture.begin(pointer, at(0, 0)));
    for (const point of [at(300, 0), at(300, 300), at(0, 300)])
      act(() => void result.current.gesture.move(pointer, point));
    expect(result.current.gesture.selectionPath).toHaveLength(4);
    act(() => void result.current.gesture.end(at(0, 300)));
    expect(result.current.selectedIds).toEqual(["a"]);
    act(() => result.current.gesture.begin({ ...pointer, shiftKey: true }, at(500, 500)));
    for (const point of [at(800, 500), at(800, 800), at(500, 800)])
      act(() => void result.current.gesture.move(pointer, point));
    act(() => void result.current.gesture.end(at(500, 800)));
    expect(result.current.selectedIds.sort()).toEqual(["a", "b"]);
  });

  it("arrastar um item selecionado o move e entra no histórico uma vez", () => {
    const { result } = renderHook(() => useHarness("rectangle"));
    act(() => result.current.gesture.begin(pointer, at(80, 80)));
    act(() => void result.current.gesture.end(at(260, 200)));
    expect(result.current.selectedIds).toEqual(["a"]);
    act(() => result.current.gesture.begin(pointer, at(150, 120)));
    expect(result.current.remember).toHaveBeenCalledTimes(1);
    act(() => void result.current.gesture.move(pointer, at(170, 140)));
    act(() => void result.current.gesture.end(at(170, 140)));
    expect(result.current.strokes[0]!.points[0]).toMatchObject({ x: 120, y: 120 });
    expect(result.current.selectedIds).toEqual(["a"]);
  });

  it("arrastar o canto da caixa redimensiona pela folha original", () => {
    const { result } = renderHook(() => useHarness("rectangle"));
    act(() => result.current.gesture.begin(pointer, at(80, 80)));
    act(() => void result.current.gesture.end(at(260, 200)));
    const frame = { x: 100, y: 100, width: 100, height: 40 };
    const corner = selectionHandles(frame).se;
    act(() => result.current.gesture.begin(pointer, at(corner.x, corner.y)));
    act(() => void result.current.gesture.move(pointer, at(corner.x + 100, corner.y + 40)));
    const widthAfter =
      result.current.strokes[0]!.points[1]!.x - result.current.strokes[0]!.points[0]!.x;
    expect(widthAfter).toBeGreaterThan(100);
    act(() => void result.current.gesture.end(at(corner.x + 100, corner.y + 40)));
    expect(result.current.selectedIds).toEqual(["a"]);
  });

  it("o texto da folha selecionado também se move, sem sair da folha", () => {
    const { result } = renderHook(() => useHarness("rectangle", true));
    act(() => result.current.gesture.begin(pointer, at(690, 890)));
    act(() => void result.current.gesture.end(at(1010, 1110)));
    expect(result.current.selectedIds).toContain(PAGE_TEXT_SELECTION_ID);
    act(() => result.current.gesture.begin(pointer, at(725, 915)));
    act(() => void result.current.gesture.move(pointer, at(775, 945)));
    act(() => void result.current.gesture.end(at(775, 945)));
    expect(result.current.pageTextFrame).toMatchObject({ x: 750, y: 930 });
    act(() => result.current.gesture.begin(pointer, at(765, 945)));
    act(() => void result.current.gesture.move(pointer, at(9000, 9000)));
    expect(result.current.pageTextFrame).toMatchObject({ x: 900, y: 1400 });
  });

  it("o movimento de outro ponteiro e o de quando não há gesto não são do gesto", () => {
    const { result } = renderHook(() => useHarness("rectangle"));
    expect(result.current.gesture.move(pointer, at(1, 1))).toBe(false);
    act(() => result.current.gesture.begin(pointer, at(80, 80)));
    expect(result.current.gesture.move({ pointerId: 2 }, at(1, 1))).toBe(false);
    act(() => result.current.gesture.cancel());
    expect(result.current.gesture.end()).toBe(false);
  });
});
