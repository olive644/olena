import { useEffect, useRef, useState } from "react";
import { uiText } from "../i18n/runtime";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { PaperDigits } from "./paper-digits";
import { createPortal } from "react-dom";

export function EssayWritingOptions({
  text,
  value,
  onChange,
}: {
  text: string;
  value: number;
  onChange(value: number): void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, visible: false });
  const trigger = useRef<HTMLButtonElement>(null);
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  useEffect(() => {
    const sheet = anchor.current?.closest(".essay-writing-sheet");
    if (!sheet) return;
    function place() {
      const rect = sheet!.getBoundingClientRect();
      const mobile = window.innerWidth <= 767;
      const viewport = window.visualViewport;
      const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const top = Math.min(rect.bottom - 64, viewportBottom - (mobile ? 68 : 90));
      setPosition({
        left: Math.max(12, Math.min(rect.left + 18, window.innerWidth - 170)),
        top: Math.max(mobile ? 110 : 76, top),
        visible: rect.width > 80 && rect.top < window.innerHeight - 170 && rect.bottom > 150,
      });
    }
    place();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(place);
    observer?.observe(sheet);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <>
      <span ref={anchor} aria-hidden="true" />
      {createPortal(
        <div
          className="essay-writing-options essay-writing-options--floating"
          ref={root}
          style={{
            left: position.left,
            top: position.top,
            visibility: position.visible ? "visible" : "hidden",
          }}
        >
          <button
            type="button"
            ref={trigger}
            className="essay-writing-options-trigger"
            aria-expanded={open}
            aria-controls="essay-writing-options-panel"
            onClick={() => setOpen(!open)}
          >
            <span>
              {words} {uiText("palavras")}
            </span>
            <FocusPaperArrow />
          </button>
          {open && (
            <section
              id="essay-writing-options-panel"
              className="essay-writing-options-panel"
              aria-label={uiText("Opções da escrita")}
            >
              <p>
                <strong>{Array.from(text).length}</strong> {uiText("caracteres")}
              </p>
              <p>
                <strong>{words}</strong> {uiText("palavras")}
              </p>
              <fieldset>
                <legend>{uiText("Selecione os caracteres por linha")}</legend>
                {(
                  [
                    [50, "Letra grande"],
                    [65, "Letra média"],
                    [85, "Letra pequena"],
                  ] as const
                ).map(([count, label]) => (
                  <label key={count} className={value === count ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="essay-characters-per-line"
                      checked={value === count}
                      value={count}
                      onChange={() => onChange(count)}
                    />
                    <PaperDigits value={String(count)} />
                    <span>{uiText(label)}</span>
                  </label>
                ))}
              </fieldset>
            </section>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
