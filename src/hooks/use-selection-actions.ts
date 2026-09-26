import { useState, useRef, type Dispatch, type SetStateAction } from "react";
import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingPoint,
  HandwritingSticky,
} from "../domain/handwriting";
import { strokeId } from "../components/handwriting-draft";
import {
  coordinateBounds,
  importedImageBounds,
  pageTextBounds,
  stickyBounds,
  strokeBounds,
  unionBounds,
} from "../components/handwriting-geometry";
import {
  PASTE_OFFSET,
  copyItems,
  pasteItems,
  rotateItems,
  selectionSize,
  type SelectionClipboard,
} from "../components/handwriting-selection-ops";
import type { SelectionScene } from "../components/handwriting-selection-scene";
import {
  PAGE_TEXT_SELECTION_ID,
  type HandwritingTool,
  type SelectionBox,
  type Stroke,
} from "../components/handwriting-types";

// Área de transferência da seleção. Fica fora do gancho para valer entre folhas na mesma sessão.
let selectionClipboard: SelectionClipboard | null = null;

type Setter<T> = Dispatch<SetStateAction<T>>;

type SelectionActionsInput = {
  scene: SelectionScene;
  selectedIds: readonly string[];
  selectedCoordinateIds: readonly string[];
  page: { width: number; height: number };
  remember: () => void;
  setTool: (tool: HandwritingTool) => void;
  setStrokes: Setter<Stroke[]>;
  setStickies: Setter<HandwritingSticky[]>;
  setCoordinateSystems: Setter<HandwritingCoordinateSystem[]>;
  setImportedImages: Setter<HandwritingImage[]>;
  setPageText: Setter<string>;
  setSelectedIds: Setter<string[]>;
  setSelectedCoordinateIds: Setter<string[]>;
};

// Ações sobre o que está selecionado: apagar, copiar, recortar, colar, duplicar, selecionar tudo,
// girar, mudar de tamanho e alinhar. Saiu do editor sem mudar o comportamento.
export function useSelectionActions(input: SelectionActionsInput) {
  const {
    scene,
    selectedIds,
    selectedCoordinateIds,
    page,
    remember,
    setTool,
    setStrokes,
    setStickies,
    setCoordinateSystems,
    setImportedImages,
    setPageText,
    setSelectedIds,
    setSelectedCoordinateIds,
  } = input;
  const { strokes, stickies, coordinateSystems, images, pageText, pageTextSize, pageTextFrame } =
    scene;
  const layerVisibility = scene.layers;
  const [canPaste, setCanPaste] = useState(() => selectionClipboard !== null);
  const pasteCount = useRef(0);

  function deleteSelection() {
    if (!selectedIds.length && !selectedCoordinateIds.length) return;
    remember();
    setStrokes((current) => current.filter((stroke) => !selectedIds.includes(stroke.id)));
    setCoordinateSystems((current) => current.filter((system) => !selectedIds.includes(system.id)));
    setStickies((current) => current.filter((sticky) => !selectedIds.includes(sticky.id)));
    setImportedImages((current) => current.filter((image) => !selectedIds.includes(image.id)));
    if (selectedIds.includes(PAGE_TEXT_SELECTION_ID)) setPageText("");
    setSelectedIds([]);
    setSelectedCoordinateIds([]);
  }

  // Caixa dos itens selecionados, com o texto da folha (usada para escalar, girar e alinhar).
  function selectionBounds(): SelectionBox | null {
    return unionBounds([
      ...strokes.filter((stroke) => selectedIds.includes(stroke.id)).map(strokeBounds),
      ...coordinateSystems
        .filter((system) => selectedIds.includes(system.id))
        .map(coordinateBounds),
      ...stickies.filter((sticky) => selectedIds.includes(sticky.id)).map(stickyBounds),
      ...images.filter((image) => selectedIds.includes(image.id)).map(importedImageBounds),
      ...(pageText && selectedIds.includes(PAGE_TEXT_SELECTION_ID)
        ? [pageTextBounds(pageText, pageTextSize, pageTextFrame)]
        : []),
    ]);
  }

  function scaleSelection(factor: number) {
    const bounds = selectionBounds();
    if (!bounds || (bounds.width < 1 && bounds.height < 1)) return;
    remember();
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const scalePoint = (point: HandwritingPoint): HandwritingPoint => ({
      ...point,
      x: Math.max(0, Math.min(page.width, center.x + (point.x - center.x) * factor)),
      y: Math.max(0, Math.min(page.height, center.y + (point.y - center.y) * factor)),
    });
    setStrokes((current) =>
      current.map((stroke) =>
        selectedIds.includes(stroke.id)
          ? { ...stroke, points: stroke.points.map(scalePoint), width: stroke.width * factor }
          : stroke,
      ),
    );
    setCoordinateSystems((current) =>
      current.map((system) =>
        selectedIds.includes(system.id)
          ? { ...system, origin: scalePoint(system.origin), end: scalePoint(system.end) }
          : system,
      ),
    );
    setImportedImages((current) =>
      current.map((image) => {
        if (!selectedIds.includes(image.id)) return image;
        const width = Math.max(40, Math.min(page.width, image.width * factor));
        const height = Math.max(40, Math.min(page.height, image.height * factor));
        return {
          ...image,
          x: Math.max(0, Math.min(page.width - width, center.x - width / 2)),
          y: Math.max(0, Math.min(page.height - height, center.y - height / 2)),
          width,
          height,
        };
      }),
    );
  }

  function selectedItems() {
    const ids = new Set(selectedIds);
    return {
      ids,
      copy: copyItems({ strokes, stickies, coordinateSystems, images }, ids),
    };
  }

  function copySelection(): boolean {
    const { copy } = selectedItems();
    if (selectionSize(copy) === 0) return false;
    selectionClipboard = copy;
    pasteCount.current = 0;
    setCanPaste(true);
    return true;
  }

  function cutSelection() {
    if (!copySelection()) return;
    deleteSelection();
  }

  function addPasted(clipboard: SelectionClipboard, offset: number) {
    remember();
    const { items, ids } = pasteItems(clipboard, offset, strokeId);
    setStrokes((current) => [...current, ...items.strokes]);
    setStickies((current) => [...current, ...items.stickies]);
    setCoordinateSystems((current) => [...current, ...items.coordinateSystems]);
    setImportedImages((current) => [...current, ...items.images]);
    setSelectedIds(ids);
    setSelectedCoordinateIds(items.coordinateSystems.map((system) => system.id));
  }

  function pasteSelection() {
    if (!selectionClipboard) return;
    pasteCount.current += 1;
    addPasted(selectionClipboard, PASTE_OFFSET * pasteCount.current);
  }

  function duplicateSelection() {
    const { copy } = selectedItems();
    if (selectionSize(copy) === 0) return;
    addPasted(copy, PASTE_OFFSET);
  }

  function selectAll() {
    setTool("select");
    setSelectedIds([
      ...strokes.map((stroke) => stroke.id),
      ...(layerVisibility.coordinates ? coordinateSystems.map((system) => system.id) : []),
      ...(layerVisibility.stickies ? stickies.map((sticky) => sticky.id) : []),
      ...(layerVisibility.text && pageText ? [PAGE_TEXT_SELECTION_ID] : []),
      ...(layerVisibility.background ? images.map((image) => image.id) : []),
    ]);
    setSelectedCoordinateIds(coordinateSystems.map((system) => system.id));
  }

  function rotateSelection(direction: -1 | 1) {
    const bounds = selectionBounds();
    if (!bounds) return;
    remember();
    const rotated = rotateItems(
      { strokes, stickies, coordinateSystems, images },
      new Set(selectedIds),
      direction * 15,
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    );
    setStrokes([...rotated.strokes]);
    setStickies([...rotated.stickies]);
    setCoordinateSystems([...rotated.coordinateSystems]);
    setImportedImages([...rotated.images]);
  }

  function alignSelection() {
    if (!selectedIds.length) return;
    remember();
    const chosen = strokes.filter((stroke) => selectedIds.includes(stroke.id));
    const target =
      chosen.reduce((sum, stroke) => {
        const box = strokeBounds(stroke);
        return sum + box.y + box.height / 2;
      }, 0) / chosen.length;
    setStrokes((current) =>
      current.map((stroke) => {
        if (!selectedIds.includes(stroke.id)) return stroke;
        const box = strokeBounds(stroke);
        const delta = target - (box.y + box.height / 2);
        return {
          ...stroke,
          points: stroke.points.map((point) => ({
            ...point,
            y: Math.max(0, Math.min(page.height, point.y + delta)),
          })),
        };
      }),
    );
  }

  return {
    canPaste,
    deleteSelection,
    selectionBounds,
    scaleSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    duplicateSelection,
    selectAll,
    rotateSelection,
    alignSelection,
  };
}
