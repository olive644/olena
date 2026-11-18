import type { NoteAsset } from "../domain/workspace";
import type { HandwritingDocument } from "../domain/handwriting";
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

/**
 * PNG novo de uma folha com outro papel e/ou cor, para guardar no lugar do antigo quando o caderno
 * inteiro é trocado. Mesmo renderizador do editor, em até 1600 px no lado maior como a exportação.
 */
export async function renderPageWithPaper(
  asset: NoteAsset,
  change: Partial<Pick<HandwritingDocument, "paper" | "paperColor">>,
): Promise<string | undefined> {
  const document = asset.handwriting;
  if (!document) return undefined;
  const next: HandwritingDocument = {
    ...document,
    ...(change.paper ? { paper: change.paper } : {}),
    ...(change.paperColor ? { paperColor: change.paperColor } : {}),
    // A pauta nova não encolhe nem corta o que já foi escrito (mesma regra do editor).
    ...(change.paper
      ? {
          canvasSize: {
            width: Math.max(3200, document.canvasSize?.width ?? 0),
            height: Math.max(2400, document.canvasSize?.height ?? 0),
          },
        }
      : {}),
  };
  const size = next.canvasSize ?? { width: 1200, height: 1600 };
  const { renderPage, sizePageCanvas } = await import("./handwriting-canvas");
  const { exportPage } = await import("./handwriting-export");
  const background = await loadImage(next.background);
  const images = await Promise.all(
    (next.images ?? []).map(async (item) => ({
      image: (await loadImage(item.dataUrl))!,
      frame: item,
      ...(item.rotation !== undefined ? { rotation: item.rotation } : {}),
    })),
  );
  const canvas = window.document.createElement("canvas");
  sizePageCanvas(
    canvas,
    Math.min(1, 1600 / Math.max(size.width, size.height)),
    size.width,
    size.height,
  );
  renderPage(
    canvas,
    next.strokes,
    next.paper,
    next.paperColor ?? "light",
    next.stickies ?? [],
    false,
    next.pageText ?? "",
    next.pageTextSize ?? 28,
    next.coordinateSystems ?? [],
    background,
    next.backgroundFrame,
    { ...DEFAULT_HANDWRITING_LAYER_VISIBILITY, ...next.layers?.visibility },
    next.layers?.order ?? DEFAULT_HANDWRITING_LAYER_ORDER,
    images,
    next.pageTextFrame,
  );
  return exportPage(canvas);
}
