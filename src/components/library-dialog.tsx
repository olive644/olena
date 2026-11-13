import { useEffect, useRef, type ReactNode } from "react";
import { uiText } from "../i18n/runtime";
import { PaperCloseIcon } from "./paper-close-icon";
import "./library-dialog.css";

export function LibraryDialog({
  title,
  onClose,
  children,
  headerContent,
  className,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerContent?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    // Abrir por clique anuncia o título sem simular foco de teclado no X.
    heading.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`library-dialog${className ? " " + className : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      aria-label={title}
    >
      <header>
        <h2 ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <button
          type="button"
          className="library-icon"
          aria-label={uiText("Fechar")}
          onClick={onClose}
        >
          <PaperCloseIcon />
        </button>
        {headerContent && <div className="library-dialog__header-content">{headerContent}</div>}
      </header>
      {children}
    </dialog>
  );
}
