import { useEffect, useRef, type ReactNode } from "react";
import { uiText } from "../i18n/runtime";
import { PaperCloseIcon } from "./paper-close-icon";
import "./library-dialog.css";

export function LibraryDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="library-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="library-icon"
          aria-label={uiText("Fechar")}
          onClick={onClose}
        >
          <PaperCloseIcon />
        </button>
      </header>
      {children}
    </dialog>
  );
}
