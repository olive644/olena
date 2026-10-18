import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AccountDeletionError, isDeletionConfirmed } from "../data/account-deletion";

type DeleteAccountPanelProps = {
  accountName: string;
  onDelete: () => Promise<void>;
};

type Status = "idle" | "deleting" | "cancelled" | "failed";

// Zona de perigo do perfil, no estilo do GitHub: o botão abre uma janela onde a pessoa lê o que
// será apagado e precisa digitar o nome da conta para liberar a exclusão.
export function DeleteAccountPanel({ accountName, onDelete }: DeleteAccountPanelProps) {
  useLanguage();

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const inputId = useId();
  const busy = status === "deleting";
  const confirmed = isDeletionConfirmed(typed, accountName);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    input.current?.focus();
    return () => {
      element?.close();
    };
  }, [open]);

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setStatus("idle");
    opener.current?.focus();
  }

  async function confirmDeletion() {
    if (!confirmed || busy) return;
    setStatus("deleting");
    try {
      await onDelete();
    } catch (cause) {
      setStatus(
        cause instanceof AccountDeletionError && cause.reason === "cancelled"
          ? "cancelled"
          : "failed",
      );
    }
  }

  return (
    <section className="delete-account-panel" aria-labelledby={`${titleId}-zone`}>
      <div>
        <h2 id={`${titleId}-zone`}>{uiText(144)}</h2>
        <p>{uiText(145)}</p>
      </div>
      <button
        ref={opener}
        type="button"
        className="delete-account-panel__open"
        onClick={() => setOpen(true)}
      >
        {uiText(146)}
      </button>

      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className="delete-account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onCancel={(event) => {
              event.preventDefault();
              close();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
          >
            <h2 id={titleId}>{uiText(147)}</h2>
            <p>{uiText(148)}</p>
            <ul>
              <li>{uiText(149)}</li>
              <li>{uiText(150)}</li>
              <li>{uiText(151)}</li>
            </ul>
            <p>{uiText(152)}</p>
            <label htmlFor={inputId}>
              {uiText(153)} <strong className="delete-account-dialog__name">{accountName}</strong>
            </label>
            <input
              ref={input}
              id={inputId}
              type="text"
              value={typed}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={busy}
              onChange={(event) => {
                setTyped(event.target.value);
                if (status !== "deleting") setStatus("idle");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void confirmDeletion();
                }
              }}
            />
            <p className="delete-account-dialog__note">{uiText(154)}</p>
            <p className="delete-account-dialog__message" role="alert">
              {status === "cancelled" && uiText(2047)}
              {status === "failed" && uiText(2048)}
            </p>
            <div className="delete-account-dialog__actions">
              <button type="button" className="secondary-button" disabled={busy} onClick={close}>
                {uiText(155)}
              </button>
              <button
                type="button"
                className="delete-account-dialog__confirm"
                disabled={!confirmed || busy}
                onClick={() => void confirmDeletion()}
              >
                {busy ? uiText(1636) : uiText(156)}
              </button>
            </div>
          </dialog>,
          document.body,
        )}
    </section>
  );
}
