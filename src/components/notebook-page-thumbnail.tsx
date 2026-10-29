import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useState } from "react";
import type { NoteAsset } from "../domain/workspace";
import { renderPagePreview, storedPagePreview } from "./notebook-page-preview";

/**
 * Imagem da folha: o PNG já salvo ou, quando a folha chegou ao vivo e ainda não tem PNG local, o
 * mesmo desenho do editor. Devolve vazio enquanto não está pronta.
 */
export function useNotebookPagePreview(asset: NoteAsset | undefined): string {
  const [preview, setPreview] = useState("");
  const document = asset?.handwriting;
  const storedPreview = asset ? storedPagePreview(asset) : "";
  const serialized = document ? JSON.stringify(document) : "";
  useEffect(() => {
    if (!asset || storedPreview || !document) return;
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
  return storedPreview || preview;
}

export function NotebookPageThumbnail({ asset }: { asset: NoteAsset }) {
  useLanguage();

  const url = useNotebookPagePreview(asset);
  return url ? (
    <img draggable={false} src={url} alt="" />
  ) : (
    <span aria-hidden="true">{uiText(703)}</span>
  );
}
