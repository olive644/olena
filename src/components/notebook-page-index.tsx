import { useEffect, useRef } from "react";
import type { StudyNote } from "../domain/workspace";

type NotebookPageIndexProps = {
  pages: readonly StudyNote[];
  currentPageId: string;
  onSelect: (id: string) => void;
  // Troca a folha de lugar com a vizinha. Sem ele o índice só leva à folha.
  onMove?: (id: string, direction: -1 | 1) => void;
  onClose: () => void;
};

// Índice do caderno: miniaturas de todas as folhas, para ir a qualquer uma de uma vez e reordenar
// pelos botões (funciona com teclado e toque, sem depender de arrastar).
export function NotebookPageIndex({
  pages,
  currentPageId,
  onSelect,
  onMove,
  onClose,
}: NotebookPageIndexProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

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
          <small>CADERNO</small>
          <h2>Índice de folhas</h2>
          <p>
            {pages.length} {pages.length === 1 ? "folha" : "folhas"}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>
          Fechar
        </button>
      </header>
      <ol>
        {pages.map((page, index) => {
          const current = page.id === currentPageId;
          const thumbnail = page.assets[0]?.dataUrl;
          return (
            <li key={page.id} className={current ? "is-current" : undefined}>
              <button
                type="button"
                className="notebook-page-index__open"
                aria-current={current ? "page" : undefined}
                aria-label={`Folha ${index + 1}: ${page.title || "Sem título"}`}
                onClick={() => {
                  onSelect(page.id);
                  onClose();
                }}
              >
                <span className="notebook-page-index__thumb">
                  {thumbnail ? (
                    <img src={thumbnail} alt="" loading="lazy" draggable={false} />
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
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover a folha ${index + 1} para frente`}
                    disabled={index === pages.length - 1}
                    onClick={() => onMove(page.id, 1)}
                  >
                    ›
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
