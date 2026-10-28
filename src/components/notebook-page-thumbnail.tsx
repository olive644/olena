import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useState } from "react";
import type { NoteAsset } from "../domain/workspace";
import { renderPagePreview, storedPagePreview } from "./notebook-page-preview";

// Uma folha recebida ao vivo ainda não tem PNG local. Usa o mesmo desenho do editor.
export function NotebookPageThumbnail({ asset }: { asset: NoteAsset }) {
  useLanguage();

  const [preview, setPreview] = useState("");
  const document = asset.handwriting;
  const storedPreview = storedPagePreview(asset);
  const serialized = document ? JSON.stringify(document) : "";
  useEffect(() => {
    if (storedPreview || !document) return;
    let cancelled = false;
    renderPagePreview(asset)
      .then((url) => {
        if (!cancelled) setPreview(url);
      })
      .catch(() => {
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
    <span aria-hidden="true">{uiText(703)}</span>
  );
}
