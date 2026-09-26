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
import type { SelectionMode, Stroke } from "../components/handwriting-types";

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

const at = (x: number, y: number) => ({ x, y, pressure: 0.5 });

function useHarness(mode: SelectionMode = "rectangle") {
  const [strokes, setStrokes] = useState<Stroke[]>([stroke("a", 100, 100), stroke("b", 600, 600)]);
  const [stickies, setStickies] = useState<HandwritingSticky[]>([]);
  const [coordinateSystems, setCoordinateSystems] = useState<HandwritingCoordinateSystem[]>([]);
  const [images, setImportedImages] = useState<HandwritingImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCoordinateIds, setSelectedCoordinateIds] = useState<string[]>([]);
  const remember = useMemo(() => vi.fn(), []);
  const scene: SelectionScene = {
    strokes,
    stickies,
    coordinateSystems,
    images,
    pageText: "",
    pageTextSize: 28,
    pageTextFrame: { x: 0, y: 0, width: 100, height: 100 },
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
  });
  return { gesture, strokes, selectedIds, remember };
}

const pointer = { pointerId: 1, pointerType: "mouse" };

describe("gesto da ferramenta Selecionar", () => {
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

  it("o movimento de outro ponteiro e o de quando não há gesto não são do gesto", () => {
    const { result } = renderHook(() => useHarness("rectangle"));
    expect(result.current.gesture.move(pointer, at(1, 1))).toBe(false);
    act(() => result.current.gesture.begin(pointer, at(80, 80)));
    expect(result.current.gesture.move({ pointerId: 2 }, at(1, 1))).toBe(false);
    act(() => result.current.gesture.cancel());
    expect(result.current.gesture.end()).toBe(false);
  });
});
