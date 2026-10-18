import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef } from "react";
import type { StudyNotebook } from "../domain/workspace";

type NotebookFolderMovePickerProps = {
  count: number;
  folders: readonly StudyNotebook[];
  onMove: (folderId: string | null) => void;
  onClose: () => void;
};

// Alternativa por teclado a arrastar um caderno para dentro de uma pasta na vitrine:
// arrastar é um gesto de ponteiro sem equivalente por teclado, então este menu move a
// seleção direto para a pasta escolhida (ou de volta para a vitrine), sem precisar arrastar.
export function NotebookFolderMovePicker({
  count,
  folders,
  onMove,
  onClose,
}: NotebookFolderMovePickerProps) {
  useLanguage();

  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="notebook-folder-move-picker"
      aria-label={uiText(689)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{uiText(689)}</h2>
        <button type="button" aria-label={uiText(230)} onClick={onClose}>
          {uiText(289)}
        </button>
      </header>
      <p>
        {count === 1 ? uiText(1811) : uiText(1812, [count])} {uiText(690)}
      </p>
      <div className="notebook-folder-move-picker__list" role="group" aria-label={uiText(691)}>
        <button
          type="button"
          onClick={() => {
            onMove(null);
            onClose();
          }}
        >
          {uiText(692)}
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => {
              onMove(folder.id);
              onClose();
            }}
          >
            {folder.title}
          </button>
        ))}
        {folders.length === 0 && (
          <p className="notebook-folder-move-picker__empty">{uiText(693)}</p>
        )}
      </div>
    </dialog>
  );
}
