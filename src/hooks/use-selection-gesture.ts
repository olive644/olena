import { pageTextLines } from "../domain/handwriting";
import { snapSelection, type AlignmentGuide } from "../components/handwriting-selection-layout";
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
  alignmentTargets,
  hitsSelected,
  pickAt,
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
import { unionBounds, stickyWidth } from "../components/handwriting-geometry";

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
  remembered?: boolean;
  unitsPerPixel?: number;
  targets?: Box[];
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
    original: SelectionScene;
  };
};

type PointerLike = { pointerId: number; pointerType?: string; shiftKey?: boolean };

type SelectionGestureInput = {
  selectionSnap?: boolean;
  selectionGuides?: boolean;
  scene: SelectionScene;
  rotationSide?: "top" | "left" | "right";
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
  setPageTextSize?: Setter<number>;
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
  let changed = false;
  const next = current.map((item) => {
    const replacement = updated.get(item.id) ?? item;
    if (replacement !== item) changed = true;
    return replacement;
  });
  return changed ? next : current;
}

// O gesto da ferramenta Selecionar: começar (tocar em uma alça, no laço ou em um item), acompanhar
// o ponteiro e terminar escolhendo os itens. O editor só repassa os eventos de ponteiro.
export function useSelectionGesture(input: SelectionGestureInput) {
  const {
    scene,
    rotationSide = "top",
    selectionSnap = true,
    selectionGuides = true,
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
    setPageTextSize,
  } = input;
  const gesture = useRef<Gesture | null>(null);
  const [transforming, setTransforming] = useState(false);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectionPath, setSelectionPath] = useState<HandwritingPoint[] | null>(null);

  function begin(
    event: PointerLike,
    point: HandwritingPoint,
    moveOnly = false,
    unitsPerPixel = 1,
  ): void {
    setGuides([]);
    setTransforming(false);
    const selectedFrame = selectionFrame(scene, selectedIds);
    const picked = pickAt(scene, point, 3 * unitsPerPixel);
    const pickedId = picked.ids.at(-1);
    const activeIds = pickedId && !selectedIds.includes(pickedId) ? [pickedId] : selectedIds;
    const frame = selectionFrame(scene, activeIds);
    const inkFrame = selectionFrame(scene, activeIds, true);
    // Alça maior no toque, para o dedo acertar.
    const grabRadius = (event.pointerType === "touch" ? 22 : 12) * unitsPerPixel;
    const grabbed = selectedFrame
      ? hitSelectionHandle(point, selectedFrame, grabRadius, rotationSide)
      : null;
    if (selectedFrame && grabbed) {
      gesture.current = {
        pointerId: event.pointerId,
        start: point,
        ids: [...selectedIds],
        unitsPerPixel,
        moving: true,
        lasso: false,
        path: [],
        frame: selectedFrame,
        handle: {
          kind: grabbed,
          anchor: grabbed === "rotate" ? point : oppositeCorner(selectedFrame, grabbed),
          center: {
            x: selectedFrame.x + selectedFrame.width / 2,
            y: selectedFrame.y + selectedFrame.height / 2,
          },
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
      : Boolean(pickedId) || Boolean(insideFrame) || hitsSelected(scene, selectedIds, point);
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
      ids: hit ? [...activeIds] : [],
      moving: hit,
      lasso: false,
      path: [],
      frame: unionBounds([
        ...(inkFrame ? [inkFrame] : []),
        ...(activeIds.includes(PAGE_TEXT_SELECTION_ID) ? [scene.pageTextFrame] : []),
      ]),
      originalScene: scene,
      unitsPerPixel,
      targets: alignmentTargets(scene, activeIds),
    };
    if (hit) {
      setSelectedIds([...activeIds]);
      setSelectedCoordinateIds(
        scene.coordinateSystems
          .filter((system) => activeIds.includes(system.id))
          .map((system) => system.id),
      );
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
    if (current.moving && !current.remembered) {
      if (
        Math.hypot(point.x - current.start.x, point.y - current.start.y) <
        2 * (current.unitsPerPixel ?? 1)
      )
        return true;
      remember();
      current.remembered = true;
      setTransforming(true);
    }
    const chosen = new Set(current.ids);
    const apply = (next: SelectionItems) => {
      setStrokes((items) => mergeTransformed(items, next.strokes, chosen));
      setStickies((items) => mergeTransformed(items, next.stickies, chosen));
      setCoordinateSystems((items) => mergeTransformed(items, next.coordinateSystems, chosen));
      setImportedImages((items) => mergeTransformed(items, next.images, chosen));
    };
    const handle = current.handle;
    function resizeText(horizontal: number, vertical: number) {
      if (!handle) return;
      const original = handle.original;
      const proportional = horizontal === vertical;
      if (chosen.has(PAGE_TEXT_SELECTION_ID)) {
        const frame = original.pageTextFrame;
        const size = proportional
          ? Math.min(144, Math.max(16, original.pageTextSize * horizontal))
          : original.pageTextSize;
        const width = Math.max(120, Math.min(page.width, frame.width * horizontal));
        const x = Math.max(
          0,
          Math.min(page.width - width, handle.anchor.x + (frame.x - handle.anchor.x) * horizontal),
        );
        const height =
          proportional || vertical !== 1
            ? Math.max(60, size * 1.5, frame.height * vertical)
            : Math.max(60, pageTextLines(original.pageText, size, width).length * size * (40 / 28));
        const y = Math.max(0, handle.anchor.y + (frame.y - handle.anchor.y) * vertical);
        setPageTextFrame({ ...frame, x, y, width, height: Math.min(page.height - y, height) });
        setPageTextSize?.(size);
      }
      if (horizontal !== 1 && vertical === 1) {
        setStickies((items) =>
          items.map((sticky) => {
            const source = original.stickies.find((item) => item.id === sticky.id);
            if (!source || !chosen.has(sticky.id) || sticky.kind !== "text" || sticky.formula)
              return sticky;
            const size = source.textSize ?? 25;
            const height = Math.max(
              120,
              pageTextLines(sticky.text, size, Math.max(1, stickyWidth(sticky) - 12)).length *
                size *
                1.3 +
                32,
            );
            return { ...sticky, height: Math.min(page.height - sticky.y, height) };
          }),
        );
      }
    }
    if (handle) {
      const horizontal = handle.kind === "e" || handle.kind === "w";
      const vertical = handle.kind === "n" || handle.kind === "s";
      if (horizontal || vertical) {
        const axis = horizontal ? "x" : "y";
        const distance = handle.grab[axis] - handle.anchor[axis];
        const factor = constrainSelectionScale(
          current.frame!,
          handle.anchor,
          Math.max(0.1, (point[axis] - handle.anchor[axis]) / (distance || 1)),
          page,
        );
        apply(
          scaleItems(
            handle.original,
            chosen,
            horizontal ? factor : 1,
            handle.anchor,
            page,
            vertical ? factor : 1,
          ),
        );
        resizeText(horizontal ? factor : 1, vertical ? factor : 1);
        return true;
      }
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
      if (handle.kind !== "rotate") {
        const factor = constrainSelectionScale(
          current.frame!,
          handle.anchor,
          dragScaleFactor(handle.anchor, handle.grab, point),
          page,
        );
        resizeText(factor, factor);
      }
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
        let dx = Math.max(
          -frame.x,
          Math.min(page.width - frame.x - frame.width, point.x - current.start.x),
        );
        let dy = Math.max(
          -frame.y,
          Math.min(page.height - frame.y - frame.height, point.y - current.start.y),
        );
        const snapped = snapSelection(
          { ...frame, x: frame.x + dx, y: frame.y + dy },
          current.targets ?? [],
          selectionSnap ? 6 * (current.unitsPerPixel ?? 1) : 0,
        );
        dx = Math.max(-frame.x, Math.min(page.width - frame.x - frame.width, dx + snapped.dx));
        dy = Math.max(-frame.y, Math.min(page.height - frame.y - frame.height, dy + snapped.dy));
        setGuides(
          (selectionGuides ? snapped.guides : []).filter((guide) =>
            guide.axis === "x"
              ? Math.abs(dx - (point.x - current.start.x + snapped.dx)) < 0.000001
              : Math.abs(dy - (point.y - current.start.y + snapped.dy)) < 0.000001,
          ),
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
    setTransforming(false);
    setGuides([]);
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
    setTransforming(false);
    setGuides([]);
  }

  return {
    transforming,
    guides,
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
