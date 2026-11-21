import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { uiText } from "../i18n/runtime";
import { PaperCloseIcon } from "./paper-close-icon";

export function EssayReviewPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const drag = useRef<number | null>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (event.key === "Tab") {
        const elements = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), summary, a[href], [tabindex='0']",
          ) ?? [],
        ).filter((e) => e.getClientRects().length);
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        className="essay-review-category"
        type="button"
        aria-expanded={open}
        aria-controls="essay-review-panel"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path fill="#187665" d="M6 5h21l8 8v24H6z" />
          <path fill="#64d4b4" d="M4 2h21l8 8v24H4z" />
          <path fill="#a9efda" d="m4 2 9 0-9 9zM25 2v9h8z" />
          <path fill="#32a88c" d="m4 34 29-15v15z" />
          <path fill="#f5fff9" d="M9 14h17v3H9zM9 21h13v3H9zM9 28h8v3H9z" />
          <path fill="#187665" d="m24 26 3-3 3 3 5-6 3 3-8 10z" />
        </svg>
        <strong>{uiText("Redação")}</strong>
        <svg className="essay-review-category-arrow" viewBox="0 0 32 32" aria-hidden="true">
          <path fill="#b2f3df" d="m10 5 13 11-13 11 4-11z" />
          <path fill="#48bd9f" d="m14 16 9 0-13 11z" />
        </svg>
      </button>
      {createPortal(
        <div
          className={`essay-review-layer${open ? " is-open" : ""}`}
          inert={!open}
          aria-hidden={!open}
        >
          <button
            className="essay-review-backdrop"
            tabIndex={-1}
            aria-label={uiText("Fechar Redação")}
            onClick={close}
          />
          <section
            ref={panel}
            id="essay-review-panel"
            className="essay-review-panel"
            role="dialog"
            aria-modal={open ? true : undefined}
            aria-labelledby="essay-review-panel-title"
          >
            <button
              className="essay-review-handle"
              aria-label={uiText("Fechar Redação")}
              onClick={close}
              onPointerDown={(event) => {
                drag.current = event.clientY;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (drag.current !== null && panel.current)
                  panel.current.style.transform = `translateY(${Math.max(0, event.clientY - drag.current)}px)`;
              }}
              onPointerUp={(event) => {
                const distance = drag.current === null ? 0 : event.clientY - drag.current;
                drag.current = null;
                panel.current?.style.removeProperty("transform");
                if (distance > 70) close();
              }}
              onPointerCancel={() => {
                drag.current = null;
                panel.current?.style.removeProperty("transform");
              }}
            >
              <span />
            </button>
            <header>
              <h2 id="essay-review-panel-title">{uiText("Redação")}</h2>
              <button
                className="library-icon"
                aria-label={uiText("Fechar Redação")}
                onClick={close}
              >
                <PaperCloseIcon />
              </button>
            </header>
            <div className="essay-review-panel-content">{children}</div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
