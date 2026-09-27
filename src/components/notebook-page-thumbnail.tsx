import { useEffect, useState } from "react";
import type { NoteAsset } from "../domain/workspace";
import {
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  DEFAULT_HANDWRITING_LAYER_ORDER,
  SHARED_PAGE_PLACEHOLDER,
} from "../domain/handwriting";

// Uma folha recebida ao vivo ainda não tem PNG local. Usa o mesmo desenho do editor.
export function NotebookPageThumbnail({ asset }: { asset: NoteAsset }) {
  const [preview, setPreview] = useState("");
  const document = asset.handwriting;
  const storedPreview = asset.dataUrl === SHARED_PAGE_PLACEHOLDER ? "" : asset.dataUrl;
  const serialized = document ? JSON.stringify(document) : "";
  useEffect(() => {
    if (storedPreview || !document) return;
    let cancelled = false;
    const load = async (source: string | undefined) => {
      if (!source) return undefined;
      const image = new Image();
      image.src = source;
      await image.decode();
      return image;
    };
    void (async () => {
      const { renderPage, sizePageCanvas } = await import("./handwriting-canvas");
      const background = await load(document.background);
      const images = await Promise.all(
        (document.images ?? []).map(async (item) => ({
          image: (await load(item.dataUrl))!,
          frame: item,
          ...(item.rotation !== undefined ? { rotation: item.rotation } : {}),
        })),
      );
      if (cancelled) return;
      const canvas = window.document.createElement("canvas");
      const size = document.canvasSize ?? { width: 1200, height: 1600 };
      sizePageCanvas(canvas, 320 / size.width, size.width, size.height);
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
      setPreview(canvas.toDataURL("image/png"));
    })().catch(() => {
      /* A folha continua disponível para abrir mesmo sem miniatura. */
    });
    return () => {
      cancelled = true;
    };
    // Uma nova revisão sem alteração de tinta não refaz a miniatura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedPreview, serialized]);
  return storedPreview || preview ? (
    <img draggable={false} src={storedPreview || preview} alt="" />
  ) : (
    <span aria-hidden="true">Prévia da folha</span>
  );
}
