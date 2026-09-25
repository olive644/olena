import { PaperActionIcon } from "./paper-action-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { StudyNote } from "../domain/workspace";

export function NotebookPageBook({
  pages,
  currentPageId,
  onSelect,
  onCreate,
  inert = false,
}: {
  pages: StudyNote[];
  currentPageId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  inert?: boolean;
}) {
  const index = Math.max(
    0,
    pages.findIndex((page) => page.id === currentPageId),
  );
  const page = pages[index];
  return (
    <nav className="notebook-page-book" aria-label="Folhear caderno" inert={inert}>
      <button
        type="button"
        className="book-previous"
        aria-label="Folha anterior"
        disabled={index === 0}
        onClick={() => pages[index - 1] && onSelect(pages[index - 1]!.id)}
      >
        <PaperEditorIcon name="undo" />
      </button>
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
    </nav>
  );
}
