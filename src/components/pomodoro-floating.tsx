import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { openPomodoroWindow } from "../data/pomodoro-window";
import { uiText } from "../i18n/runtime";
import { PaperDigitsSource } from "./paper-digits";
import { PomodoroDial } from "./pomodoro-dial";
import { PaperEditorIcon } from "./paper-editor-icon";
import "./pomodoro-floating.css";

export function PomodoroFloating({
  time,
  stage,
  controls,
}: {
  time: string;
  stage: number;
  controls: ReactNode;
}) {
  const [floating, setFloating] = useState<Window | null>(null);
  // 0: pronto, 1: abrindo, 2: bloqueado pelo navegador.
  const [status, setStatus] = useState(0);
  const owned = useRef<Window | null>(null);
  const alive = useRef(true);
  const label = uiText(floating ? 2776 : 2777);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      owned.current?.close();
    };
  }, []);
  async function open() {
    setStatus(1);
    try {
      const next = await openPomodoroWindow();
      if (!alive.current) {
        next.close();
        return;
      }
      owned.current = next;
      setFloating(next);
      next.addEventListener(
        "pagehide",
        () => {
          if (owned.current === next) {
            owned.current = null;
            if (alive.current) setFloating(null);
          }
        },
        { once: true },
      );
      setStatus(0);
    } catch {
      if (alive.current) setStatus(2);
    }
  }
  return (
    <div className="pomodoro-floating-launcher">
      <button
        type="button"
        className="icon-button"
        aria-label={label}
        title={label}
        disabled={status === 1}
        aria-pressed={Boolean(floating)}
        onClick={() => (floating ? floating.close() : void open())}
      >
        <PaperEditorIcon name={floating ? "collapse" : "expand"} />
      </button>
      {status === 2 && <p role="alert">{uiText(2780)}</p>}
      {floating &&
        createPortal(
          <PaperDigitsSource
            source={floating.document.getElementById("digit-0") ? "#" : "/paper-digits.svg#"}
          >
            <main className="app-shell pomodoro-mini" aria-label={uiText(2781)}>
              <PomodoroDial stage={stage} time={time} mini />
              {controls}
            </main>
          </PaperDigitsSource>,
          floating.document.body,
        )}
    </div>
  );
}
