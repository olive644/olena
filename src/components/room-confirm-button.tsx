import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Botão para ações que não dá para desfazer (encerrar ou sair de uma sala como anfitrião).
// O primeiro toque abre um diálogo que explica o que vai acontecer, com "Cancelar" já em foco;
// só o segundo botão executa. Um diálogo, e não um botão que troca de rótulo, porque no celular
// os botões do cabeçalho da sala viram só um ícone e não teriam onde mostrar o aviso. O diálogo
// vai por portal direto para o <body>, longe das regras de layout do cabeçalho.
// Quando `needsConfirmation` é falso, age no primeiro toque.
export function RoomConfirmButton({
  children,
  title,
  warning,
  confirmLabel,
  onConfirm,
  className = "secondary-button",
  needsConfirmation = true,
}: {
  children: ReactNode;
  title: string;
  warning: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  needsConfirmation?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      cancel.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={() => (needsConfirmation ? setOpen(true) : onConfirm())}
      >
        {children}
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          className="room-confirm-dialog"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-warning`}
          onClose={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            // O foco da sala tem o próprio ciclo de Tab; aqui dentro só existem dois botões.
            event.stopPropagation();
            event.preventDefault();
            (document.activeElement === cancel.current ? confirm : cancel).current?.focus();
          }}
        >
          <h3 id={`${id}-title`}>{title}</h3>
          <p id={`${id}-warning`}>{warning}</p>
          <div className="room-confirm-dialog__actions">
            <button
              ref={cancel}
              className="secondary-button"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button
              ref={confirm}
              className="primary-button"
              type="button"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}
