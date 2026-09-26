import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingPoint,
  HandwritingSticky,
} from "../domain/handwriting";
import { pointInPolygon } from "./handwriting-geometry";
import { PAGE_HEIGHT, PAGE_WIDTH, type Stroke } from "./handwriting-types";

// Operações puras da seleção (copiar, colar, duplicar, girar e laço). O editor só liga botões e
// atalhos a elas, o que mantém a regra testável fora do navegador.

export type SelectionItems = {
  strokes: readonly Stroke[];
  stickies: readonly HandwritingSticky[];
  coordinateSystems: readonly HandwritingCoordinateSystem[];
  images: readonly HandwritingImage[];
};

export type SelectionClipboard = {
  strokes: Stroke[];
  stickies: HandwritingSticky[];
  coordinateSystems: HandwritingCoordinateSystem[];
  images: HandwritingImage[];
};

// Deslocamento de cada colagem seguida, para o item colado não ficar escondido sobre o original.
export const PASTE_OFFSET = 36;

export function selectionSize(items: Partial<SelectionItems>): number {
  return (
    (items.strokes?.length ?? 0) +
    (items.stickies?.length ?? 0) +
    (items.coordinateSystems?.length ?? 0) +
    (items.images?.length ?? 0)
  );
}

export function copyItems(items: SelectionItems, ids: ReadonlySet<string>): SelectionClipboard {
  return structuredClone({
    strokes: items.strokes.filter((item) => ids.has(item.id)),
    stickies: items.stickies.filter((item) => ids.has(item.id)),
    coordinateSystems: items.coordinateSystems.filter((item) => ids.has(item.id)),
    images: items.images.filter((item) => ids.has(item.id)),
  });
}

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

// Cópia com ids novos, deslocada e mantida dentro da folha. Devolve também os ids criados, para o
// editor selecionar o que acabou de colar.
export function pasteItems(
  clipboard: SelectionClipboard,
  offset: number,
  newId: () => string,
): { items: SelectionClipboard; ids: string[] } {
  const ids: string[] = [];
  const fresh = () => {
    const id = newId();
    ids.push(id);
    return id;
  };
  const move = (point: HandwritingPoint): HandwritingPoint => ({
    ...point,
    x: clamp(point.x + offset, PAGE_WIDTH),
    y: clamp(point.y + offset, PAGE_HEIGHT),
  });
  const copy = structuredClone(clipboard);
  return {
    items: {
      strokes: copy.strokes.map((stroke) => ({
        ...stroke,
        id: fresh(),
        points: stroke.points.map(move),
      })),
      stickies: copy.stickies.map((sticky) => ({
        ...sticky,
        id: fresh(),
        x: clamp(sticky.x + offset, PAGE_WIDTH - (sticky.width ?? 0)),
        y: clamp(sticky.y + offset, PAGE_HEIGHT - (sticky.height ?? 0)),
        ...(sticky.checklist
          ? { checklist: sticky.checklist.map((entry) => ({ ...entry, id: newId() })) }
          : {}),
      })),
      coordinateSystems: copy.coordinateSystems.map((system) => ({
        ...system,
        id: fresh(),
        origin: move(system.origin),
        end: move(system.end),
      })),
      images: copy.images.map((image) => ({
        ...image,
        id: fresh(),
        x: clamp(image.x + offset, PAGE_WIDTH - image.width),
        y: clamp(image.y + offset, PAGE_HEIGHT - image.height),
      })),
    },
    ids,
  };
}

// Gira os itens em torno de um centro. Traços e sistemas de coordenadas giram os pontos; imagens
// giram em torno do próprio centro e orbitam o centro da seleção; post-its só orbitam, porque o
// texto deles continua na horizontal.
export function rotateItems(
  items: SelectionItems,
  ids: ReadonlySet<string>,
  degrees: number,
  center: { x: number; y: number },
): SelectionItems {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const spin = (x: number, y: number) => ({
    x: center.x + (x - center.x) * cos - (y - center.y) * sin,
    y: center.y + (x - center.x) * sin + (y - center.y) * cos,
  });
  const rotatePoint = (point: HandwritingPoint): HandwritingPoint => {
    const next = spin(point.x, point.y);
    return { ...point, x: clamp(next.x, PAGE_WIDTH), y: clamp(next.y, PAGE_HEIGHT) };
  };
  return {
    strokes: items.strokes.map((stroke) =>
      ids.has(stroke.id) ? { ...stroke, points: stroke.points.map(rotatePoint) } : stroke,
    ),
    coordinateSystems: items.coordinateSystems.map((system) =>
      ids.has(system.id)
        ? { ...system, origin: rotatePoint(system.origin), end: rotatePoint(system.end) }
        : system,
    ),
    stickies: items.stickies.map((sticky) => {
      if (!ids.has(sticky.id)) return sticky;
      const width = sticky.width ?? 0;
      const height = sticky.height ?? 0;
      const next = spin(sticky.x + width / 2, sticky.y + height / 2);
      return {
        ...sticky,
        x: clamp(next.x - width / 2, PAGE_WIDTH - width),
        y: clamp(next.y - height / 2, PAGE_HEIGHT - height),
      };
    }),
    images: items.images.map((image) => {
      if (!ids.has(image.id)) return image;
      const next = spin(image.x + image.width / 2, image.y + image.height / 2);
      return {
        ...image,
        x: clamp(next.x - image.width / 2, PAGE_WIDTH - image.width),
        y: clamp(next.y - image.height / 2, PAGE_HEIGHT - image.height),
        rotation: ((((image.rotation ?? 0) + degrees) % 360) + 360) % 360,
      };
    }),
  };
}

// Um traço entra no laço quando a maior parte dele está dentro. Antes valia só o centro da caixa,
// então um traço comprido que cruzava o laço só na ponta era pego, e uma letra curva cujo centro
// caía fora do desenho era perdida.
export const LASSO_MIN_INSIDE = 0.5;

export function lassoContainsStroke(polygon: readonly HandwritingPoint[], stroke: Stroke): boolean {
  if (polygon.length < 3 || stroke.points.length === 0) return false;
  const inside = stroke.points.filter((point) => pointInPolygon(point, polygon)).length;
  return inside / stroke.points.length >= LASSO_MIN_INSIDE;
}

// Com Shift, o laço soma à seleção que já existe em vez de trocá-la.
export function mergeSelection(
  previous: readonly string[],
  picked: readonly string[],
  additive: boolean,
): string[] {
  return additive ? [...new Set([...previous, ...picked])] : [...picked];
}
