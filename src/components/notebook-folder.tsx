import type { useNotebookShelfDrag } from "../hooks/use-notebook-shelf-drag";
import type { StudyNotebook, WorkspaceState } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";
import { PaperCheckIcon } from "./paper-check-icon";
import { TextNotePreview } from "./text-note";
import { notebookPaperTabs, PaperMoonMark } from "./notebook-paper-tools";
import "./notebook-folder.css";

export function NotebookFolder({
  folder,
  notebooks,
  pages,
  subjects,
  onOpen,
  open,
  onToggle,
  drag,
  selectionMode = false,
  selected = false,
}: {
  folder: StudyNotebook;
  notebooks: StudyNotebook[];
  pages: WorkspaceState["notes"];
  subjects: WorkspaceState["subjects"];
  onOpen: (book: StudyNotebook) => void;
  open: boolean;
  onToggle: () => void;
  drag: ReturnType<typeof useNotebookShelfDrag>;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  const books = notebooks.filter(
    (book) => book.parentId === folder.id && (!book.kind || book.kind === "note"),
  );
  return (
    <div
      data-folder-drop={folder.id}
      data-book-count={books.length}
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
              {book.kind === "note" ? (
                <TextNotePreview
                  title={book.title}
                  content={pages.find((page) => page.id === book.pageIds[0])?.content ?? ""}
                />
              ) : (
                <NotebookCover
                  subjectColor="#7c3aed"
                  title={book.title}
                  coverStyle={book.coverStyle}
                  tabs={notebookPaperTabs(
                    book,
                    book.pageIds.flatMap((id) => pages.find((page) => page.id === id) ?? []),
                    subjects,
                  )}
                />
              )}
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
                <PaperMoonMark compact motif="moon" stitched />
              </span>
              <span className="paper-folder-sun">
                <PaperMoonMark compact motif="sun" stitched />
              </span>
              <img className="paper-folder-star" src="/favicon-star.svg" alt="" draggable={false} />
              {selectionMode && (
                <span className={`notebook-card__check ${selected ? "is-selected" : ""}`}>
                  {selected ? <PaperCheckIcon /> : null}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>
      <div className="paper-folder-copy">
        <span>{folder.title}</span>
        <small>
          {books.length} de 3 {books.some((book) => book.kind === "note") ? "itens" : "cadernos"}
        </small>
      </div>
    </div>
  );
}
