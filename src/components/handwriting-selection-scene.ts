import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingLayerVisibility,
  HandwritingPoint,
  HandwritingSticky,
} from "../domain/handwriting";
import {
  coordinateBounds,
  importedImageBounds,
  overlaps,
  pageTextBounds,
  pointInPolygon,
  stickyBounds,
  stickyHeight,
  stickyWidth,
  strokeBounds,
  strokeTouches,
  unionBounds,
} from "./handwriting-geometry";
import { lassoContainsStroke, selectionHandles, SELECTION_PAD } from "./handwriting-selection-ops";
import { PAGE_TEXT_SELECTION_ID, type SelectionBox, type Stroke } from "./handwriting-types";

// A folha vista pela seleção: tudo o que pode ser escolhido, com as camadas visíveis. As regras de
// escolher, acertar, mover e desenhar a seleção ficam aqui, fora do editor, para poderem ser
// testadas sem o navegador.
export type SelectionScene = {
  strokes: readonly Stroke[];
  coordinateSystems: readonly HandwritingCoordinateSystem[];
  stickies: readonly HandwritingSticky[];
  images: readonly HandwritingImage[];
  pageText: string;
  pageTextSize: number;
  pageTextFrame: { x: number; y: number; width: number; height: number };
  layers: HandwritingLayerVisibility;
};

export type Picked = { ids: string[]; coordinateIds: string[] };

function center(box: SelectionBox): HandwritingPoint {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 };
}

function collect(
  scene: SelectionScene,
  strokeMatches: (stroke: Stroke) => boolean,
  boxMatches: (box: SelectionBox) => boolean,
): Picked {
  const strokes = scene.strokes.filter(strokeMatches).map((stroke) => stroke.id);
  const coordinateIds = scene.layers.coordinates
    ? scene.coordinateSystems
        .filter((system) => boxMatches(coordinateBounds(system)))
        .map((system) => system.id)
    : [];
  const stickies = scene.layers.stickies
    ? scene.stickies.filter((sticky) => boxMatches(stickyBounds(sticky))).map((sticky) => sticky.id)
    : [];
  const text =
    scene.layers.text &&
    scene.pageText &&
    boxMatches(pageTextBounds(scene.pageText, scene.pageTextSize, scene.pageTextFrame))
      ? [PAGE_TEXT_SELECTION_ID]
      : [];
  const images = scene.layers.background
    ? scene.images
        .filter((image) => boxMatches(importedImageBounds(image)))
        .map((image) => image.id)
    : [];
  return { ids: [...strokes, ...coordinateIds, ...stickies, ...text, ...images], coordinateIds };
}

// Laço: um traço entra quando a maior parte dele está dentro; os demais itens, quando o centro está.
export function pickInPolygon(scene: SelectionScene, polygon: readonly HandwritingPoint[]): Picked {
  return collect(
    scene,
    (stroke) => lassoContainsStroke(polygon, stroke),
    (box) => pointInPolygon(center(box), polygon),
  );
}

// Retângulo: qualquer item cuja caixa toque o retângulo.
export function pickInBox(scene: SelectionScene, area: SelectionBox): Picked {
  return collect(
    scene,
    (stroke) => overlaps(strokeBounds(stroke), area),
    (box) => overlaps(box, area),
  );
}

// O ponto está sobre algum item já selecionado (com folga de `radius` unidades da folha)?
export function hitsSelected(
  scene: SelectionScene,
  selectedIds: readonly string[],
  point: HandwritingPoint,
  radius = 24,
): boolean {
  const selected = new Set(selectedIds);
  const around = {
    x: point.x - radius,
    y: point.y - radius,
    width: radius * 2,
    height: radius * 2,
  };
  return (
    scene.strokes.some(
      (stroke) => selected.has(stroke.id) && strokeTouches(stroke, point, radius),
    ) ||
    (scene.layers.coordinates &&
      scene.coordinateSystems.some(
        (system) => selected.has(system.id) && overlaps(coordinateBounds(system), around),
      )) ||
    (scene.layers.stickies &&
      scene.stickies.some(
        (sticky) => selected.has(sticky.id) && overlaps(stickyBounds(sticky), around),
      )) ||
    (scene.layers.text &&
      Boolean(scene.pageText) &&
      selected.has(PAGE_TEXT_SELECTION_ID) &&
      overlaps(pageTextBounds(scene.pageText, scene.pageTextSize, scene.pageTextFrame), around)) ||
    (scene.layers.background &&
      scene.images.some(
        (image) => selected.has(image.id) && overlaps(importedImageBounds(image), around),
      ))
  );
}

// Caixa que envolve os itens selecionados e visíveis (o texto da folha fica de fora: ele tem a
// própria moldura). É a que recebe as alças de redimensionar e girar.
export function selectionFrame(
  scene: SelectionScene,
  selectedIds: readonly string[],
): SelectionBox | null {
  const selected = new Set(selectedIds);
  return unionBounds([
    ...scene.strokes.filter((stroke) => selected.has(stroke.id)).map(strokeBounds),
    ...(scene.layers.coordinates
      ? scene.coordinateSystems.filter((system) => selected.has(system.id)).map(coordinateBounds)
      : []),
    ...(scene.layers.stickies
      ? scene.stickies.filter((sticky) => selected.has(sticky.id)).map(stickyBounds)
      : []),
    ...(scene.layers.background
      ? scene.images.filter((image) => selected.has(image.id)).map(importedImageBounds)
      : []),
  ]);
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

export type PageSize = { width: number; height: number };

export type TextFrame = { x: number; y: number; width: number; height: number };

// A moldura do texto da folha acompanha o arrasto e não sai da folha.
export function moveTextFrame(frame: TextFrame, dx: number, dy: number, page: PageSize): TextFrame {
  return {
    ...frame,
    x: clamp(frame.x + dx, Math.max(0, page.width - frame.width)),
    y: clamp(frame.y + dy, Math.max(0, page.height - frame.height)),
  };
}

export function moveStrokes(
  strokes: readonly Stroke[],
  ids: readonly string[],
  dx: number,
  dy: number,
  page: PageSize,
): Stroke[] {
  return strokes.map((stroke) =>
    ids.includes(stroke.id)
      ? {
          ...stroke,
          points: stroke.points.map((item) => ({
            ...item,
            x: clamp(item.x + dx, page.width),
            y: clamp(item.y + dy, page.height),
          })),
        }
      : stroke,
  );
}

export function moveCoordinateSystems(
  systems: readonly HandwritingCoordinateSystem[],
  ids: readonly string[],
  dx: number,
  dy: number,
  page: PageSize,
): HandwritingCoordinateSystem[] {
  const shift = (point: HandwritingPoint): HandwritingPoint => ({
    ...point,
    x: clamp(point.x + dx, page.width),
    y: clamp(point.y + dy, page.height),
  });
  return systems.map((system) =>
    ids.includes(system.id)
      ? { ...system, origin: shift(system.origin), end: shift(system.end) }
      : system,
  );
}

export function moveStickies(
  stickies: readonly HandwritingSticky[],
  ids: readonly string[],
  dx: number,
  dy: number,
  page: PageSize,
): HandwritingSticky[] {
  return stickies.map((sticky) =>
    ids.includes(sticky.id)
      ? {
          ...sticky,
          x: clamp(sticky.x + dx, page.width - stickyWidth(sticky)),
          y: clamp(sticky.y + dy, page.height - stickyHeight(sticky)),
        }
      : sticky,
  );
}

export function moveImages(
  images: readonly HandwritingImage[],
  ids: readonly string[],
  dx: number,
  dy: number,
  page: PageSize,
): HandwritingImage[] {
  return images.map((image) =>
    ids.includes(image.id)
      ? {
          ...image,
          x: clamp(image.x + dx, page.width - image.width),
          y: clamp(image.y + dy, page.height - image.height),
        }
      : image,
  );
}

const SELECTION_COLOR = "#7433e0";
const SELECTION_FILL = "#7433e026";

// Desenha, sobre a folha, o contorno de cada item selecionado, a caixa com as alças e o
// retângulo ou laço em andamento.
export function drawSelectionOverlay(
  context: CanvasRenderingContext2D,
  scene: SelectionScene,
  selectedIds: readonly string[],
  selectionBox: SelectionBox | null,
  selectionPath: readonly HandwritingPoint[] | null,
): void {
  const selected = new Set(selectedIds);
  context.save();
  context.setLineDash([14, 9]);
  context.strokeStyle = SELECTION_COLOR;
  context.lineWidth = 3;
  const outline = (box: SelectionBox, pad: number) =>
    context.strokeRect(box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2);
  for (const stroke of scene.strokes) if (selected.has(stroke.id)) outline(strokeBounds(stroke), 8);
  if (scene.layers.coordinates) {
    for (const system of scene.coordinateSystems)
      if (selected.has(system.id)) outline(coordinateBounds(system), 12);
  }
  if (scene.layers.stickies) {
    for (const sticky of scene.stickies)
      if (selected.has(sticky.id)) outline(stickyBounds(sticky), 8);
  }
  if (scene.layers.text && scene.pageText && selected.has(PAGE_TEXT_SELECTION_ID)) {
    outline(pageTextBounds(scene.pageText, scene.pageTextSize, scene.pageTextFrame), 8);
  }
  if (scene.layers.background) {
    for (const image of scene.images)
      if (selected.has(image.id)) outline(importedImageBounds(image), 8);
  }

  const frame = selectionFrame(scene, selectedIds);
  if (frame && !selectionBox && !selectionPath) {
    const handles = selectionHandles(frame);
    context.save();
    context.setLineDash([10, 8]);
    context.strokeRect(
      frame.x - SELECTION_PAD,
      frame.y - SELECTION_PAD,
      frame.width + SELECTION_PAD * 2,
      frame.height + SELECTION_PAD * 2,
    );
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(handles.rotate.x, handles.rotate.y);
    context.lineTo(handles.rotate.x, frame.y - SELECTION_PAD);
    context.stroke();
    context.fillStyle = "#ffffff";
    for (const kind of ["nw", "ne", "se", "sw", "rotate"] as const) {
      const handle = handles[kind];
      context.beginPath();
      context.arc(handle.x, handle.y, kind === "rotate" ? 13 : 11, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.restore();
  }
  if (selectionBox) {
    context.fillStyle = SELECTION_FILL;
    context.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
    context.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
  }
  if (selectionPath && selectionPath.length > 1) {
    context.beginPath();
    context.moveTo(selectionPath[0]!.x, selectionPath[0]!.y);
    for (const point of selectionPath.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.fillStyle = SELECTION_FILL;
    context.fill();
    context.stroke();
  }
  context.restore();
}
