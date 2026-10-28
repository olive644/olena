import type { NoteAsset } from "../domain/workspace";
import {
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  DEFAULT_HANDWRITING_LAYER_ORDER,
  SHARED_PAGE_PLACEHOLDER,
} from "../domain/handwriting";

/** PNG já salvo da folha, ou vazio quando ela ainda precisa ser desenhada a partir da tinta. */
export function storedPagePreview(asset: NoteAsset): string {
  return asset.dataUrl === SHARED_PAGE_PLACEHOLDER ? "" : asset.dataUrl;
}

async function loadImage(source: string | undefined) {
  if (!source) return undefined;
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

/**
 * Desenha a folha com o mesmo renderizador do editor. A miniatura 2D e a textura do caderno 3D
 * usam esta função, então a folha aparece igual nos dois lugares.
 */
export async function renderPagePreview(asset: NoteAsset, width = 320): Promise<string> {
  const stored = storedPagePreview(asset);
  const document = asset.handwriting;
  if (stored || !document) return stored;
  const { renderPage, sizePageCanvas } = await import("./handwriting-canvas");
  const background = await loadImage(document.background);
  const images = await Promise.all(
    (document.images ?? []).map(async (item) => ({
      image: (await loadImage(item.dataUrl))!,
      frame: item,
      ...(item.rotation !== undefined ? { rotation: item.rotation } : {}),
    })),
  );
  const canvas = window.document.createElement("canvas");
  const size = document.canvasSize ?? { width: 1200, height: 1600 };
  sizePageCanvas(canvas, width / size.width, size.width, size.height);
  renderPage(
    canvas,
    document.strokes,
    document.paper,
    document.paperColor ?? "light",
    document.stickies ?? [],
    false,
    document.pageText ?? "",
    document.pageTextSize ?? 28,
    document.coordinateSystems ?? [],
    background,
    document.backgroundFrame,
    { ...DEFAULT_HANDWRITING_LAYER_VISIBILITY, ...document.layers?.visibility },
    document.layers?.order ?? DEFAULT_HANDWRITING_LAYER_ORDER,
    images,
    document.pageTextFrame,
  );
  return canvas.toDataURL("image/png");
}
