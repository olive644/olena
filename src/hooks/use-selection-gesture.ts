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
  constrainSelectionScale,
  hitSelectionHandle,
  mergeSelection,
  oppositeCorner,
  rotateItems,
  scaleItems,
  type HandleKind,
  type Box,
  type SelectionItems,
} from "../components/handwriting-selection-ops";
import {
  hitsSelected,
  moveCoordinateSystems,
  moveImages,
  moveStickies,
  moveStrokes,
  moveTextFrame,
  pickInBox,
  pickInPolygon,
  selectionFrame,
  type SelectionScene,
} from "../components/handwriting-selection-scene";
import {
  PAGE_TEXT_SELECTION_ID,
  type SelectionBox,
  type SelectionMode,
  type Stroke,
} from "../components/handwriting-types";
import { unionBounds } from "../components/handwriting-geometry";

type Setter<T> = Dispatch<SetStateAction<T>>;

// Um gesto de seleção em andamento: retângulo, laço, arrasto dos itens ou de uma alça.
type Gesture = {
  pointerId: number;
  start: HandwritingPoint;
  ids: string[];
  moving: boolean;
  lasso: boolean;
  path: HandwritingPoint[];
  originalScene?: SelectionScene;
  frame?: Box | null;
  shiftKey?: boolean;
  // Com Shift, o laço soma à seleção que já existia.
  previousIds?: string[];
  // Arrasto de uma alça da caixa da seleção: a folha de origem é guardada para cada quadro ser
  // calculado a partir dela, sem acumular erro.
  handle?: {
    kind: HandleKind;
    anchor: { x: number; y: number };
    center: { x: number; y: number };
    grab: { x: number; y: number };
    original: SelectionItems;
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
  setPageTextFrame: Setter<{ x: number; y: number; width: number; height: number }>;
};

function boxBetween(a: HandwritingPoint, b: HandwritingPoint): SelectionBox {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function mergeTransformed<T extends { id: string }>(
  current: T[],
  transformed: readonly T[],
  ids: ReadonlySet<string>,
): T[] {
  const updated = new Map(
    transformed.filter((item) => ids.has(item.id)).map((item) => [item.id, item]),
  );
  return current.map((item) => updated.get(item.id) ?? item);
}

// O gesto da ferramenta Selecionar: começar (tocar em uma alça, no laço ou em um item), acompanhar
// o ponteiro e terminar escolhendo os itens. O editor só repassa os eventos de ponteiro.
export function useSelectionGesture(input: SelectionGestureInput) {
  const {
    scene,
    selectionMode,
    selectedIds,
    page,
    remember,
    setSelectedIds,
    setSelectedCoordinateIds,
    setStrokes,
    setStickies,
    setCoordinateSystems,
    setImportedImages,
    setPageTextFrame,
  } = input;
  const gesture = useRef<Gesture | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectionPath, setSelectionPath] = useState<HandwritingPoint[] | null>(null);

  function begin(
    event: PointerLike,
    point: HandwritingPoint,
    moveOnly = false,
    unitsPerPixel = 1,
  ): void {
    const frame = selectionFrame(scene, selectedIds);
    const inkFrame = selectionFrame(scene, selectedIds, true);
    // Alça maior no toque, para o dedo acertar.
    const grabRadius = (event.pointerType === "touch" ? 20 : 12) * unitsPerPixel;
    const grabbed = frame ? hitSelectionHandle(point, frame, grabRadius) : null;
    if (frame && grabbed) {
      remember();
      gesture.current = {
        pointerId: event.pointerId,
        start: point,
        ids: [...selectedIds],
        moving: true,
        lasso: false,
        path: [],
        frame: inkFrame,
        handle: {
          kind: grabbed,
          anchor: grabbed === "rotate" ? point : oppositeCorner(frame, grabbed),
          center: { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 },
          grab: point,
          original: scene,
        },
      };
      return;
    }
    const insideFrame =
      frame &&
      point.x >= frame.x &&
      point.x <= frame.x + frame.width &&
      point.y >= frame.y &&
      point.y <= frame.y + frame.height;
    const hit = moveOnly
      ? selectedIds.length > 0
      : Boolean(insideFrame) || hitsSelected(scene, selectedIds, point);
    if (selectionMode === "lasso" && !hit) {
      gesture.current = {
        pointerId: event.pointerId,
        start: point,
        ids: [],
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
    gesture.current = {
      pointerId: event.pointerId,
      start: point,
      ids: hit ? [...selectedIds] : [],
      moving: hit,
      lasso: false,
      path: [],
      frame: unionBounds([
        ...(inkFrame ? [inkFrame] : []),
        ...(selectedIds.includes(PAGE_TEXT_SELECTION_ID) ? [scene.pageTextFrame] : []),
      ]),
      originalScene: scene,
    };
    if (hit) {
      remember();
      setSelectionBox(null);
      setSelectionPath(null);
    } else {
      setSelectedIds([]);
      setSelectedCoordinateIds([]);
      setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  }

  // Devolve true quando o movimento pertence a um gesto de seleção deste ponteiro.
  function move(event: PointerLike, point: HandwritingPoint): boolean {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return false;
    current.shiftKey = Boolean(event.shiftKey);
    const chosen = new Set(current.ids);
    const apply = (next: SelectionItems) => {
      setStrokes((items) => mergeTransformed(items, next.strokes, chosen));
      setStickies((items) => mergeTransformed(items, next.stickies, chosen));
      setCoordinateSystems((items) => mergeTransformed(items, next.coordinateSystems, chosen));
      setImportedImages((items) => mergeTransformed(items, next.images, chosen));
    };
    const handle = current.handle;
    if (handle) {
      const next =
        handle.kind === "rotate"
          ? rotateItems(
              handle.original,
              chosen,
              dragRotation(handle.center, handle.grab, point, Boolean(event.shiftKey)),
              handle.center,
              page,
            )
          : scaleItems(
              handle.original,
              chosen,
              constrainSelectionScale(
                current.frame!,
                handle.anchor,
                dragScaleFactor(handle.anchor, handle.grab, point),
                page,
              ),
              handle.anchor,
              page,
            );
      apply(next);
      return true;
    }
    if (current.lasso) {
      current.path.push(point);
      setSelectionPath([...current.path]);
      return true;
    }
    if (current.moving) {
      const original = current.originalScene;
      const frame = current.frame;
      if (original && frame) {
        const dx = Math.max(
          -frame.x,
          Math.min(page.width - frame.x - frame.width, point.x - current.start.x),
        );
        const dy = Math.max(
          -frame.y,
          Math.min(page.height - frame.y - frame.height, point.y - current.start.y),
        );
        apply({
          strokes: moveStrokes(original.strokes, current.ids, dx, dy, page),
          coordinateSystems: moveCoordinateSystems(
            original.coordinateSystems,
            current.ids,
            dx,
            dy,
            page,
          ),
          stickies: moveStickies(original.stickies, current.ids, dx, dy, page),
          images: moveImages(original.images, current.ids, dx, dy, page),
        });
        if (current.ids.includes(PAGE_TEXT_SELECTION_ID))
          setPageTextFrame(moveTextFrame(original.pageTextFrame, dx, dy, page));
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
    if (point && current.moving)
      move(
        {
          pointerId: current.pointerId,
          ...(current.shiftKey === undefined ? {} : { shiftKey: current.shiftKey }),
        },
        point,
      );
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
