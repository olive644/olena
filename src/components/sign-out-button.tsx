import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperEditorIcon } from "./paper-editor-icon";

export function SignOutButton({
  onSignOut,
  blocked = false,
}: {
  onSignOut(discardPending?: boolean): Promise<void>;
  blocked?: boolean;
}) {
  useLanguage();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discardPending, setDiscardPending] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, [open]);
  function close() {
    if (busy) return;
    setOpen(false);
    setError("");
    setDiscardPending(false);
    opener.current?.focus();
  }
  return (
    <>
      <button ref={opener} className="secondary-button" type="button" onClick={() => setOpen(true)}>
        {uiText(1003)}
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className="sign-out-dialog"
            aria-labelledby="sign-out-title"
            onCancel={(event) => {
              event.preventDefault();
              close();
            }}
          >
            <span className="sign-out-art" aria-hidden="true">
              <PaperEditorIcon name="exit" />
            </span>
            <h2 id="sign-out-title">{uiText(1004)}</h2>
            <p>{uiText(1005)}</p>
            <p>{uiText(1006)}</p>
            {blocked && <p role="status">{uiText(2686)}</p>}
            {error && <p role="alert">{uiText(error)}</p>}
            {error && (
              <label className="sign-out-discard">
                <input
                  type="checkbox"
                  checked={discardPending}
                  onChange={(event) => setDiscardPending(event.target.checked)}
                />
                <span>{uiText(2687)}</span>
              </label>
            )}
            <div className="sign-out-actions">
              <button
                type="button"
                className="sign-out-confirm"
                disabled={busy}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    await onSignOut(discardPending);
                    setOpen(false);
                  } catch {
                    setError(uiText(2688));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? uiText(1948) : uiText(593)}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={close}
                autoFocus
              >
                {uiText(155)}
              </button>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
