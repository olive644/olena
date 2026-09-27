import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { StudyNote } from "../domain/workspace";
import { NotebookToolIcon } from "./notebook-tool-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import { NotebookPageThumbnail } from "./notebook-page-thumbnail";

type NotebookPageIndexProps = {
  pages: readonly StudyNote[];
  currentPageId: string;
  onSelect: (id: string) => void;
  // Troca a folha de lugar com a vizinha. Sem ele o índice só leva à folha.
  onMove?: (id: string, direction: -1 | 1) => void;
  // Arrasta a miniatura direto para a posição solta. Funciona junto com onMove: o
  // arrastar é um atalho a mais, o teclado e o toque seguem com os botões.
  onReorder?: (id: string, toIndex: number) => void;
  onClose: () => void;
};

// Distância mínima (em pixels) para um toque ou clique virar arrastar em vez de abrir a folha.
const DRAG_THRESHOLD = 8;

// Índice do caderno: miniaturas de todas as folhas, para ir a qualquer uma de uma vez, reordenar
// pelos botões (teclado e toque, sem depender de arrastar) e, a mais, arrastar a miniatura direto
// para o lugar desejado.
export function NotebookPageIndex({
  pages,
  currentPageId,
  onSelect,
  onMove,
  onReorder,
  onClose,
}: NotebookPageIndexProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  const itemsRef = useRef(new Map<string, HTMLLIElement>());
  const dragRef = useRef<{
    pageId: string;
    fromIndex: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function nearestIndex(x: number, y: number): number {
    let best = 0;
    let bestDistance = Infinity;
    pages.forEach((page, index) => {
      const element = itemsRef.current.get(page.id);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const distance = Math.hypot(
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2),
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }

  function endDrag() {
    dragRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, pageId: string, index: number) {
    if (!onReorder || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pageId,
      fromIndex: index,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active) return;
    if (!active.moved) {
      const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY);
      if (distance < DRAG_THRESHOLD) return;
      active.moved = true;
      setDraggingId(active.pageId);
    }
    event.preventDefault();
    setDropIndex(nearestIndex(event.clientX, event.clientY));
  }

  function pointerUp() {
    const active = dragRef.current;
    if (!active) return;
    if (active.moved) {
      suppressClickRef.current = true;
      const target = dropIndex ?? active.fromIndex;
      if (target !== active.fromIndex) onReorder?.(active.pageId, target);
    }
    endDrag();
  }

  return (
    <dialog
      ref={dialog}
      className="notebook-page-index"
      aria-label="Índice de folhas"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header>
        <div>
          <NotebookToolIcon name="index" />
          <h2>Índice de folhas</h2>
          <p>
            {pages.length} {pages.length === 1 ? "folha" : "folhas"}
          </p>
        </div>
        <button
          type="button"
          className="notebook-index-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <PaperEditorIcon name="close" />
        </button>
      </header>
      <ol>
        {pages.map((page, index) => {
          const current = page.id === currentPageId;
          const thumbnail = page.assets[0];
          const classes = [
            current ? "is-current" : null,
            draggingId === page.id ? "is-dragging" : null,
            onReorder && dropIndex === index && draggingId && draggingId !== page.id
              ? "is-drop-target"
              : null,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li
              key={page.id}
              className={classes || undefined}
              ref={(element) => {
                if (element) itemsRef.current.set(page.id, element);
                else itemsRef.current.delete(page.id);
              }}
            >
              <button
                type="button"
                className="notebook-page-index__open"
                aria-current={current ? "page" : undefined}
                aria-label={`Folha ${index + 1}: ${page.title || "Sem título"}`}
                onPointerDown={(event) => pointerDown(event, page.id, index)}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={endDrag}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  onSelect(page.id);
                  onClose();
                }}
              >
                <span className="notebook-page-index__thumb">
                  {thumbnail ? (
                    <NotebookPageThumbnail asset={thumbnail} />
                  ) : (
                    <span aria-hidden="true">{page.content.slice(0, 80) || "Folha em branco"}</span>
                  )}
                </span>
                <span className="notebook-page-index__label">
                  <strong>{index + 1}</strong>
                  <span>{page.title || "Sem título"}</span>
                </span>
              </button>
              {onMove && (
                <span className="notebook-page-index__move">
                  <button
                    type="button"
                    aria-label={`Mover a folha ${index + 1} para trás`}
                    disabled={index === 0}
                    onClick={() => onMove(page.id, -1)}
                  >
                    <img src="/paper-arrow.svg" alt="" className="is-previous" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover a folha ${index + 1} para frente`}
                    disabled={index === pages.length - 1}
                    onClick={() => onMove(page.id, 1)}
                  >
                    <img src="/paper-arrow.svg" alt="" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </dialog>
  );
}
