import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingPoint,
  HandwritingSticky,
} from "../domain/handwriting";
import {
  dragRotation,
  dragScaleFactor,
  hitSelectionHandle,
  mergeSelection,
  oppositeCorner,
  rotateItems,
  scaleItems,
  type HandleKind,
} from "../components/handwriting-selection-ops";
import {
  hitsSelected,
  moveCoordinateSystems,
  moveImages,
  moveStickies,
  moveStrokes,
  pickInBox,
  pickInPolygon,
  selectionFrame,
  type SelectionScene,
} from "../components/handwriting-selection-scene";
import type { SelectionBox, SelectionMode, Stroke } from "../components/handwriting-types";

type Setter<T> = Dispatch<SetStateAction<T>>;

// Um gesto de seleção em andamento: retângulo, laço, arrasto dos itens ou de uma alça.
type Gesture = {
  pointerId: number;
  start: HandwritingPoint;
  origin: HandwritingPoint;
  ids: string[];
  coordinateIds: string[];
  moving: boolean;
  lasso: boolean;
  path: HandwritingPoint[];
  // Com Shift, o laço soma à seleção que já existia.
  previousIds?: string[];
  // Arrasto de uma alça da caixa da seleção: a folha de origem é guardada para cada quadro ser
  // calculado a partir dela, sem acumular erro.
  handle?: {
    kind: HandleKind;
    anchor: { x: number; y: number };
    center: { x: number; y: number };
    grab: { x: number; y: number };
    original: {
      strokes: Stroke[];
      stickies: HandwritingSticky[];
      coordinateSystems: HandwritingCoordinateSystem[];
      images: HandwritingImage[];
    };
  };
};

type PointerLike = { pointerId: number; pointerType?: string; shiftKey?: boolean };

type SelectionGestureInput = {
  scene: SelectionScene;
  selectionMode: SelectionMode;
  selectedIds: readonly string[];
  selectedCoordinateIds: readonly string[];
  page: { width: number; height: number };
  remember: () => void;
  setSelectedIds: Setter<string[]>;
  setSelectedCoordinateIds: Setter<string[]>;
  setStrokes: Setter<Stroke[]>;
  setStickies: Setter<HandwritingSticky[]>;
  setCoordinateSystems: Setter<HandwritingCoordinateSystem[]>;
  setImportedImages: Setter<HandwritingImage[]>;
};

function boxBetween(a: HandwritingPoint, b: HandwritingPoint): SelectionBox {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

// O gesto da ferramenta Selecionar: começar (tocar em uma alça, no laço ou em um item), acompanhar
// o ponteiro e terminar escolhendo os itens. O editor só repassa os eventos de ponteiro.
export function useSelectionGesture(input: SelectionGestureInput) {
  const {
    scene,
    selectionMode,
    selectedIds,
    selectedCoordinateIds,
    page,
    remember,
    setSelectedIds,
    setSelectedCoordinateIds,
    setStrokes,
    setStickies,
    setCoordinateSystems,
    setImportedImages,
  } = input;
  const gesture = useRef<Gesture | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectionPath, setSelectionPath] = useState<HandwritingPoint[] | null>(null);

  function begin(event: PointerLike, point: HandwritingPoint): void {
    const frame = selectionFrame(scene, selectedIds);
    // Alça maior no toque, para o dedo acertar.
    const grabRadius = event.pointerType === "touch" ? 34 : 22;
    const grabbed = frame ? hitSelectionHandle(point, frame, grabRadius) : null;
    if (frame && grabbed) {
      remember();
      gesture.current = {
        pointerId: event.pointerId,
        start: point,
        origin: point,
        ids: [...selectedIds],
        coordinateIds: [...selectedCoordinateIds],
        moving: true,
        lasso: false,
        path: [],
        handle: {
          kind: grabbed,
          anchor: grabbed === "rotate" ? point : oppositeCorner(frame, grabbed),
          center: { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 },
          grab: point,
          original: {
            strokes: [...scene.strokes],
            stickies: [...scene.stickies],
            coordinateSystems: [...scene.coordinateSystems],
            images: [...scene.images],
          },
        },
      };
      return;
    }
    if (selectionMode === "lasso") {
      gesture.current = {
        pointerId: event.pointerId,
        start: point,
        origin: point,
        ids: [],
        coordinateIds: [],
        moving: false,
        lasso: true,
        path: [point],
        previousIds: event.shiftKey ? [...selectedIds] : [],
      };
      if (!event.shiftKey) setSelectedIds([]);
      setSelectionBox(null);
      setSelectionPath([point]);
      return;
    }
    const hit = hitsSelected(scene, selectedIds, point);
    gesture.current = {
      pointerId: event.pointerId,
      start: point,
      origin: point,
      ids: hit ? [...selectedIds] : [],
      coordinateIds: hit ? [...selectedCoordinateIds] : [],
      moving: hit,
      lasso: false,
      path: [],
    };
    if (hit) remember();
    else {
      setSelectedIds([]);
      setSelectedCoordinateIds([]);
      setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  }

  // Devolve true quando o movimento pertence a um gesto de seleção deste ponteiro.
  function move(event: PointerLike, point: HandwritingPoint): boolean {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return false;
    const handle = current.handle;
    if (handle) {
      const chosen = new Set(current.ids);
      const next =
        handle.kind === "rotate"
          ? rotateItems(
              handle.original,
              chosen,
              dragRotation(handle.center, handle.grab, point, Boolean(event.shiftKey)),
              handle.center,
            )
          : scaleItems(
              handle.original,
              chosen,
              dragScaleFactor(handle.anchor, handle.grab, point),
              handle.anchor,
            );
      setStrokes([...next.strokes]);
      setStickies([...next.stickies]);
      setCoordinateSystems([...next.coordinateSystems]);
      setImportedImages([...next.images]);
      return true;
    }
    if (current.lasso) {
      current.path.push(point);
      setSelectionPath([...current.path]);
      return true;
    }
    if (current.moving) {
      const dx = point.x - current.origin.x;
      const dy = point.y - current.origin.y;
      if (dx !== 0 || dy !== 0) {
        setStrokes((items) => moveStrokes(items, current.ids, dx, dy, page));
        setCoordinateSystems((items) => moveCoordinateSystems(items, current.ids, dx, dy, page));
        setStickies((items) => moveStickies(items, current.ids, dx, dy, page));
        setImportedImages((items) => moveImages(items, current.ids, dx, dy, page));
        current.origin = point;
      }
    } else {
      setSelectionBox(boxBetween(current.start, point));
    }
    return true;
  }

  // Termina o gesto (se houver um) escolhendo os itens. `point` é onde o ponteiro foi solto; sem
  // ele vale o ponto em que o gesto começou. Devolve true quando havia um gesto.
  function end(point?: HandwritingPoint): boolean {
    const current = gesture.current;
    if (!current) return false;
    gesture.current = null;
    const at = point ?? current.start;
    if (current.lasso) {
      const picked = pickInPolygon(scene, [...current.path, at]);
      setSelectedIds(
        mergeSelection(
          current.previousIds ?? [],
          picked.ids,
          (current.previousIds?.length ?? 0) > 0,
        ),
      );
      setSelectedCoordinateIds(picked.coordinateIds);
      setSelectionPath(null);
      return true;
    }
    if (!current.moving) {
      const picked = pickInBox(scene, boxBetween(current.start, at));
      setSelectedIds(picked.ids);
      setSelectedCoordinateIds(picked.coordinateIds);
      setSelectionBox(null);
      setSelectionPath(null);
    }
    return true;
  }

  function cancel(): void {
    gesture.current = null;
  }

  return {
    selectionBox,
    setSelectionBox,
    selectionPath,
    setSelectionPath,
    begin,
    move,
    end,
    cancel,
  };
}
