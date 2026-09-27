import type { useNotebookShelfDrag } from "../hooks/use-notebook-shelf-drag";
import type { StudyNotebook } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";
import { PaperMoonMark } from "./notebook-paper-tools";
import "./notebook-folder.css";

export function NotebookFolder({
  folder,
  notebooks,
  onOpen,
  open,
  onToggle,
  drag,
  selectionMode = false,
  selected = false,
}: {
  folder: StudyNotebook;
  notebooks: StudyNotebook[];
  onOpen: (book: StudyNotebook) => void;
  open: boolean;
  onToggle: () => void;
  drag: ReturnType<typeof useNotebookShelfDrag>;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  const books = notebooks.filter((book) => book.parentId === folder.id && !book.kind);
  return (
    <div
      data-folder-drop={folder.id}
      className={`paper-folder ${open ? "is-open" : ""} ${drag.targetId === folder.id ? "is-drop-target" : ""}`}
    >
      <div className="paper-folder-stage">
        <div className="paper-folder-art">
          <span className="paper-folder-back" aria-hidden="true" />
          {books.map((book, index) => (
            <button
              type="button"
              className={`paper-folder-book book-${index}`}
              key={book.id}
              data-notebook-drop={book.id}
              aria-label={`Abrir ${book.title}`}
              tabIndex={open ? 0 : -1}
              disabled={!open || selectionMode}
              {...drag.handlers(book.id)}
              onClick={() => onOpen(book)}
            >
              <NotebookCover subjectColor="#7c3aed" title={book.title} />
            </button>
          ))}
          <button
            type="button"
            className="paper-folder-toggle"
            aria-expanded={open}
            aria-label={`${selectionMode ? "Selecionar" : open ? "Fechar" : "Abrir"} pasta ${folder.title}`}
            aria-pressed={selectionMode ? selected : undefined}
            onClick={onToggle}
          >
            <span className="paper-folder-front" aria-hidden="true">
              <span className="paper-folder-moon">
                <PaperMoonMark compact motif="moon" />
              </span>
              <span className="paper-folder-sun">
                <PaperMoonMark compact motif="sun" />
              </span>
              <svg className="paper-folder-star" viewBox="0 0 44 44">
                <path d="m22 2 6 12 14 2-10 10 2 15-12-7-12 7 2-15L2 16l14-2Z" fill="#fff9ef" />
                <path d="m22 7 5 10 11 1-8 8 2 11-10-6-10 6 2-11-8-8 11-1Z" fill="#facc15" />
                <path d="m22 7 0 15-16-4 11-1Z" fill="#ffe88d" />
                <path d="m22 22 10 15-2-11 8-8Z" fill="#d4a817" />
              </svg>
              <span className="paper-folder-label">{folder.title}</span>
              {selectionMode && (
                <span className={`notebook-card__check ${selected ? "is-selected" : ""}`}>
                  {selected ? "✓" : ""}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>
      <div className="paper-folder-copy">
        <span>{folder.title}</span>
        <small>{books.length} de 3 cadernos</small>
      </div>
    </div>
  );
}
