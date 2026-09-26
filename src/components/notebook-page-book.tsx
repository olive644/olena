import { PaperActionIcon } from "./paper-action-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { StudyNote } from "../domain/workspace";
import { useRef, useState } from "react";
import { NotebookPageIndex } from "./notebook-page-index";

export function NotebookPageBook({
  pages,
  currentPageId,
  onSelect,
  onCreate,
  onRemove,
  onMove,
  inert = false,
}: {
  pages: StudyNote[];
  currentPageId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRemove?: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  inert?: boolean;
}) {
  const drag = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const index = Math.max(
    0,
    pages.findIndex((page) => page.id === currentPageId),
  );
  const page = pages[index];
  return (
    <nav
      className="notebook-page-book"
      aria-label="Folhear caderno"
      inert={inert}
      onPointerDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
        drag.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        const start = drag.current;
        drag.current = null;
        if (!start || start.pointerId !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        const target = pages[index + (dx < 0 ? 1 : -1)];
        if (target) onSelect(target.id);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <button
        type="button"
        className="book-previous"
        aria-label="Folha anterior"
        disabled={index === 0}
        onClick={() => pages[index - 1] && onSelect(pages[index - 1]!.id)}
      >
        <PaperEditorIcon name="undo" />
      </button>
      {pages.length > 1 && (
        <button
          type="button"
          className="book-index"
          aria-label="Abrir índice de folhas"
          onClick={() => setIndexOpen(true)}
        >
          Índice
        </button>
      )}
      <div className="page-book" key={currentPageId}>
        <span className="page-book__left" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="page-book__right">
          <strong>{page?.title || "Nova folha"}</strong>
          <small aria-live="polite">
            Folha {index + 1} de {Math.max(1, pages.length)}
          </small>
        </span>
        <span className="page-book__turn" aria-hidden="true" />
      </div>
      {page && onRemove && (
        <button
          type="button"
          className="book-remove"
          aria-label={`Remover ${page.title || "folha"}`}
          onClick={() => onRemove(page.id)}
        >
          <PaperEditorIcon name="trash" />
        </button>
      )}
      {index < pages.length - 1 ? (
        <button
          type="button"
          aria-label="Próxima folha"
          onClick={() => onSelect(pages[index + 1]!.id)}
        >
          <PaperEditorIcon name="redo" />
        </button>
      ) : (
        <button type="button" aria-label="Criar próxima folha" onClick={onCreate}>
          <PaperActionIcon name="plus" />
        </button>
      )}
      {indexOpen && (
        <NotebookPageIndex
          pages={pages}
          currentPageId={currentPageId}
          onSelect={onSelect}
          {...(onMove ? { onMove } : {})}
          onClose={() => setIndexOpen(false)}
        />
      )}
    </nav>
  );
}
