import { NotebookPageThumbnail } from "./notebook-page-thumbnail";
import { ShelfToolIcon } from "./shelf-tool-icon";
import { uiText, useLanguage } from "../i18n/runtime";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { StudyNote } from "../domain/workspace";
import { useEffect, useRef, useState } from "react";
import { NotebookPageIndex } from "./notebook-page-index";
import { NotebookToolIcon } from "./notebook-tool-icon";

export function NotebookPageBook({
  pages,
  currentPageId,
  currentPreview,
  onTurn,
  onSelect,
  onCreate,
  onRemove,
  onMove,
  onReorder,
  favoritePageIds,
  onToggleFavorite,
  inert = false,
}: {
  pages: StudyNote[];
  currentPageId: string;
  currentPreview?: string;
  onTurn?: (direction: "forward" | "backward" | null) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRemove?: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  onReorder?: (id: string, toIndex: number) => void;
  favoritePageIds?: readonly string[];
  onToggleFavorite?: (id: string) => void;
  inert?: boolean;
}) {
  useLanguage();

  const drag = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const index = Math.max(
    0,
    pages.findIndex((page) => page.id === currentPageId),
  );
  const page = pages[index];
  const [turn, setTurn] = useState<{ id: string; backwards: boolean }>();
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    if (!turn) return;
    const timer = window.setTimeout(() => {
      setTurn(undefined);
      onTurn?.(null);
      onSelectRef.current(turn.id);
    }, 620);
    return () => window.clearTimeout(timer);
  }, [turn, onTurn]);

  function selectPage(id: string) {
    const target = pages.findIndex((page) => page.id === id);
    if (turn || target < 0 || target === index) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset["reduceMotion"] === "true"
    ) {
      onSelect(id);
      return;
    }
    onTurn?.(target < index ? "backward" : "forward");
    setTurn({ id, backwards: target < index });
  }
  return (
    <nav
      className="notebook-page-book"
      aria-label={uiText(695)}
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
        if (target) selectPage(target.id);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <button
        type="button"
        className="book-previous secondary-button"
        aria-label={uiText(696)}
        disabled={index === 0 || Boolean(turn)}
        onClick={() => pages[index - 1] && selectPage(pages[index - 1]!.id)}
      >
        <PaperEditorIcon name="undo" />
      </button>
      {pages.length > 1 && (
        <button
          type="button"
          className="book-index secondary-button"
          aria-label={uiText(697)}
          onClick={() => setIndexOpen(true)}
        >
          <NotebookToolIcon name="index" />
        </button>
      )}
      <div className="page-book" key={currentPageId}>
        <span className="page-book__left" aria-hidden="true">
          {currentPreview ? (
            <img src={currentPreview} alt="" draggable={false} />
          ) : page?.assets[0] ? (
            <NotebookPageThumbnail asset={page.assets[0]} />
          ) : (
            <>
              <i />
              <i />
              <i />
            </>
          )}
        </span>
        <span className="page-book__right">
          {index < pages.length - 1 ? (
            <strong>{page?.title === uiText(746) ? "" : page?.title}</strong>
          ) : (
            <button
              type="button"
              className="page-book__create"
              aria-label={uiText(700)}
              disabled={Boolean(turn)}
              onClick={onCreate}
            >
              <PaperEditorIcon name="add" />
            </button>
          )}
        </span>
        {turn && (
          <span className="page-book__turn" data-backwards={turn.backwards} aria-hidden="true">
            {currentPreview ? (
              <img src={currentPreview} alt="" draggable={false} />
            ) : (
              page?.assets[0] && <NotebookPageThumbnail asset={page.assets[0]} />
            )}
          </span>
        )}
      </div>
      {page && onRemove && (
        <button
          type="button"
          className="book-remove secondary-button"
          aria-label={uiText(1756, [page.title || uiText(1817)])}
          onClick={() => onRemove(page.id)}
        >
          <ShelfToolIcon name="trash" />
        </button>
      )}
      {index < pages.length - 1 ? (
        <button
          type="button"
          className="book-next secondary-button"
          aria-label={uiText(699)}
          disabled={Boolean(turn)}
          onClick={() => selectPage(pages[index + 1]!.id)}
        >
          <PaperEditorIcon name="redo" />
        </button>
      ) : null}
      {indexOpen && (
        <NotebookPageIndex
          pages={pages}
          currentPageId={currentPageId}
          onSelect={selectPage}
          {...(onMove ? { onMove } : {})}
          {...(onReorder ? { onReorder } : {})}
          {...(favoritePageIds ? { favoritePageIds } : {})}
          {...(onToggleFavorite ? { onToggleFavorite } : {})}
          onClose={() => setIndexOpen(false)}
        />
      )}
    </nav>
  );
}
