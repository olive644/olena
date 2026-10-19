import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { openPomodoroWindow, supportsPomodoroPictureInPicture } from "../data/pomodoro-window";
import { uiText, useLanguage } from "../i18n/runtime";
import { AnimatedPomodoroTomato } from "./pomodoro-tomato";
import { PaperDigits } from "./paper-digits";
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
  useLanguage();
  const [floating, setFloating] = useState<Window | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);
  const owned = useRef<Window | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      owned.current?.close();
      owned.current = null;
    };
  }, []);
  async function open() {
    setOpening(true);
    setError(false);
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
    } catch {
      if (alive.current) setError(true);
    } finally {
      if (alive.current) setOpening(false);
    }
  }
  return (
    <div className="pomodoro-floating-launcher">
      <button
        type="button"
        className="secondary-button"
        disabled={opening}
        aria-pressed={Boolean(floating)}
        onClick={() => (floating ? floating.close() : void open())}
      >
        <PaperEditorIcon name="expand" />
        {uiText(floating ? "Fechar mini Pomodoro" : "Abrir mini Pomodoro")}
      </button>
      <small>
        {uiText(
          supportsPomodoroPictureInPicture()
            ? "A miniatura fica sobre outras janelas. Mantenha a aba Foco aberta."
            : "Neste navegador, abre uma janela separada, sem garantia de ficar por cima. Mantenha a aba Foco aberta.",
        )}
      </small>
      {error && (
        <p role="alert">
          {uiText(
            "Não foi possível abrir a miniatura. Permita pop-ups para este site e tente novamente.",
          )}
        </p>
      )}
      {floating &&
        createPortal(
          <main className="app-shell pomodoro-mini" aria-label={uiText("Mini Pomodoro")}>
            <div className="pomodoro-dial">
              <AnimatedPomodoroTomato stage={stage} />
              <div className="pomodoro-dial__time">
                <img
                  className="pomodoro-worm"
                  src="/pomodoro-tomato/minhoca.svg"
                  alt=""
                  aria-hidden="true"
                />
                <h1 className="timer" aria-label={uiText("Tempo restante: {0}", [time])}>
                  <PaperDigits value={time} />
                </h1>
              </div>
            </div>
            {controls}
          </main>,
          floating.document.body,
        )}
    </div>
  );
}
