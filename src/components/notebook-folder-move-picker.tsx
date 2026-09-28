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
      aria-label="Mover para pasta"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>Mover para pasta</h2>
        <button type="button" aria-label="Fechar" onClick={onClose}>
          ×
        </button>
      </header>
      <p>
        {count === 1 ? "1 item selecionado." : `${count} itens selecionados.`} Escolha o destino.
      </p>
      <div className="notebook-folder-move-picker__list" role="group" aria-label="Pastas">
        <button
          type="button"
          onClick={() => {
            onMove(null);
            onClose();
          }}
        >
          Vitrine (tirar da pasta)
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
          <p className="notebook-folder-move-picker__empty">Sem pastas ainda.</p>
        )}
      </div>
    </dialog>
  );
}
