import { act, renderHook } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSelectionActions } from "./use-selection-actions";
import {
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  type HandwritingCoordinateSystem,
  type HandwritingImage,
  type HandwritingSticky,
} from "../domain/handwriting";
import type { SelectionScene } from "../components/handwriting-selection-scene";
import type { HandwritingTool, Stroke } from "../components/handwriting-types";

const stroke = (id: string, x: number): Stroke =>
  ({
    id,
    tool: "pen",
    brush: "fine",
    color: "#000",
    width: 4,
    points: [
      { x, y: 100, pressure: 0.5 },
      { x: x + 60, y: 140, pressure: 0.5 },
    ],
  }) as unknown as Stroke;

function useHarness() {
  const [strokes, setStrokes] = useState<Stroke[]>([stroke("a", 100), stroke("b", 400)]);
  const [stickies, setStickies] = useState<HandwritingSticky[]>([]);
  const [coordinateSystems, setCoordinateSystems] = useState<HandwritingCoordinateSystem[]>([]);
  const [images, setImportedImages] = useState<HandwritingImage[]>([]);
  const [pageText, setPageText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCoordinateIds, setSelectedCoordinateIds] = useState<string[]>([]);
  const [tool, setTool] = useState<HandwritingTool>("pen");
  const remember = useMemo(() => vi.fn(), []);
  const scene: SelectionScene = {
    strokes,
    stickies,
    coordinateSystems,
    images,
    pageText,
    pageTextSize: 28,
    pageTextFrame: { x: 0, y: 0, width: 100, height: 100 },
    layers: DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  };
  const actions = useSelectionActions({
    scene,
    selectedIds,
    selectedCoordinateIds,
    page: { width: 1200, height: 1600 },
    remember,
    setTool,
    setStrokes,
    setStickies,
    setCoordinateSystems,
    setImportedImages,
    setPageText,
    setSelectedIds,
    setSelectedCoordinateIds,
  });
  return { actions, strokes, selectedIds, setSelectedIds, tool, remember };
}

describe("ações da seleção", () => {
  it("duplicar acrescenta uma cópia deslocada, seleciona a cópia e entra no histórico", () => {
    const { result } = renderHook(useHarness);
    act(() => result.current.setSelectedIds(["a"]));
    act(() => result.current.actions.duplicateSelection());
    expect(result.current.strokes).toHaveLength(3);
    expect(result.current.strokes[2]!.id).not.toBe("a");
    expect(result.current.strokes[2]!.points[0]).toMatchObject({ x: 136, y: 136 });
    expect(result.current.selectedIds).toEqual([result.current.strokes[2]!.id]);
    expect(result.current.remember).toHaveBeenCalledTimes(1);
  });

  it("copiar e colar duas vezes desloca cada colagem um pouco mais", () => {
    const { result } = renderHook(useHarness);
    act(() => result.current.setSelectedIds(["b"]));
    act(() => void result.current.actions.copySelection());
    expect(result.current.actions.canPaste).toBe(true);
    act(() => result.current.actions.pasteSelection());
    act(() => result.current.actions.pasteSelection());
    const first = result.current.strokes[2]!.points[0]!;
    const second = result.current.strokes[3]!.points[0]!;
    expect(first.x).toBe(436);
    expect(second.x).toBe(472);
  });

  it("recortar copia e apaga, e colar traz de volta", () => {
    const { result } = renderHook(useHarness);
    act(() => result.current.setSelectedIds(["a"]));
    act(() => result.current.actions.cutSelection());
    expect(result.current.strokes.map((item) => item.id)).toEqual(["b"]);
    expect(result.current.selectedIds).toEqual([]);
    act(() => result.current.actions.pasteSelection());
    expect(result.current.strokes).toHaveLength(2);
  });

  it("selecionar tudo troca para a ferramenta de seleção", () => {
    const { result } = renderHook(useHarness);
    act(() => result.current.actions.selectAll());
    expect(result.current.tool).toBe("select");
    expect(result.current.selectedIds.sort()).toEqual(["a", "b"]);
  });

  it("aumentar escala em torno do centro e engrossa o traço; sem seleção não faz nada", () => {
    const { result } = renderHook(useHarness);
    act(() => result.current.actions.scaleSelection(2));
    expect(result.current.remember).not.toHaveBeenCalled();
    act(() => result.current.setSelectedIds(["a"]));
    act(() => result.current.actions.scaleSelection(2));
    expect(result.current.strokes[0]!.width).toBe(8);
    expect(result.current.remember).toHaveBeenCalledTimes(1);
  });

  it("girar mantém os itens e alinhar leva os traços à mesma altura média", () => {
    const { result } = renderHook(useHarness);
    act(() => result.current.setSelectedIds(["a", "b"]));
    act(() => result.current.actions.rotateSelection(1));
    expect(result.current.strokes).toHaveLength(2);
    act(() => result.current.actions.alignSelection());
    const heights = result.current.strokes.map((item) => {
      const ys = item.points.map((point) => point.y);
      return (Math.min(...ys) + Math.max(...ys)) / 2;
    });
    expect(Math.abs(heights[0]! - heights[1]!)).toBeLessThan(0.001);
  });
});
