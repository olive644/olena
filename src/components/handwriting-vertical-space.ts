import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingSticky,
} from "../domain/handwriting";
import {
  coordinateBounds,
  importedImageBounds,
  pageTextBounds,
  stickyBounds,
  strokeInkBounds,
} from "./handwriting-geometry";
import {
  moveCoordinateSystems,
  moveImages,
  moveStickies,
  moveStrokes,
  moveTextFrame,
  type PageSize,
  type SelectionScene,
  type TextFrame,
} from "./handwriting-selection-scene";
import type { SelectionBox, Stroke } from "./handwriting-types";

// Ferramenta de espaço vertical: uma linha horizontal separa a folha. Arrastar para baixo abre
// espaço (tudo o que está abaixo da linha desce junto), arrastar para cima fecha o espaço vazio.
//
// Regras:
// - Desce o que começa na linha ou abaixo dela. O que cruza a linha fica onde está, para a
//   linha nunca cortar um traço ao meio.
// - Vale para todos os itens da folha, com a camada visível ou não, porque abrir espaço é uma
//   operação da folha inteira; o fundo (imagem ou PDF) não se mexe.
// - Fechar espaço só consome espaço vazio: nada passa por cima do que ficou acima da linha.
// - Abrir espaço pára quando o item mais baixo chega ao fim da folha.
export type SpaceItems = {
  strokeIds: string[];
  coordinateIds: string[];
  stickyIds: string[];
  imageIds: string[];
  moveText: boolean;
};

type Boxed = { box: SelectionBox; below: boolean };

function boxes(scene: SelectionScene, lineY: number) {
  const entries: Boxed[] = [];
  const items: SpaceItems = {
    strokeIds: [],
    coordinateIds: [],
    stickyIds: [],
    imageIds: [],
    moveText: false,
  };
  const add = (box: SelectionBox, onBelow: (below: boolean) => void) => {
    const below = box.y >= lineY;
    entries.push({ box, below });
    onBelow(below);
  };
  for (const stroke of scene.strokes)
    add(strokeInkBounds(stroke), (below) => below && items.strokeIds.push(stroke.id));
  for (const system of scene.coordinateSystems)
    add(coordinateBounds(system), (below) => below && items.coordinateIds.push(system.id));
  for (const sticky of scene.stickies)
    add(stickyBounds(sticky), (below) => below && items.stickyIds.push(sticky.id));
  for (const image of scene.images)
    add(importedImageBounds(image), (below) => below && items.imageIds.push(image.id));
  if (scene.pageText.trim())
    add(
      pageTextBounds(scene.pageText, scene.pageTextSize, scene.pageTextFrame),
      (below) => (items.moveText = below),
    );
  return { entries, items };
}

export function itemsBelowLine(scene: SelectionScene, lineY: number): SpaceItems {
  return boxes(scene, lineY).items;
}

// Limita o deslocamento pedido ao que a folha comporta. Positivo abre espaço, negativo fecha.
export function clampSpaceShift(
  scene: SelectionScene,
  lineY: number,
  requested: number,
  pageHeight: number,
): number {
  const { entries } = boxes(scene, lineY);
  const moved = entries.filter((entry) => entry.below).map((entry) => entry.box);
  if (moved.length === 0) return 0;
  const stayed = entries.filter((entry) => !entry.below).map((entry) => entry.box);
  if (requested >= 0) {
    const lowest = Math.max(...moved.map((box) => box.y + box.height));
    return Math.min(requested, Math.max(0, pageHeight - lowest));
  }
  const highest = Math.min(...moved.map((box) => box.y));
  const floor = Math.max(lineY, ...stayed.map((box) => box.y + box.height));
  return -Math.min(-requested, Math.max(0, highest - floor));
}

export type ShiftedScene = {
  strokes: Stroke[];
  coordinateSystems: HandwritingCoordinateSystem[];
  stickies: HandwritingSticky[];
  images: HandwritingImage[];
  pageTextFrame: TextFrame;
  shift: number;
};

export function shiftBelowLine(
  scene: SelectionScene,
  lineY: number,
  requested: number,
  page: PageSize,
): ShiftedScene {
  const shift = clampSpaceShift(scene, lineY, requested, page.height);
  const items = itemsBelowLine(scene, lineY);
  return {
    strokes: moveStrokes(scene.strokes, items.strokeIds, 0, shift, page),
    coordinateSystems: moveCoordinateSystems(
      scene.coordinateSystems,
      items.coordinateIds,
      0,
      shift,
      page,
    ),
    stickies: moveStickies(scene.stickies, items.stickyIds, 0, shift, page),
    images: moveImages(scene.images, items.imageIds, 0, shift, page),
    pageTextFrame: items.moveText
      ? moveTextFrame(scene.pageTextFrame, 0, shift, page)
      : scene.pageTextFrame,
    shift,
  };
}
