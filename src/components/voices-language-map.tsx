import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { uiText, useLanguage } from "../i18n/runtime";
const LANGUAGES = [
  { id: "en", title: { "pt-BR": "Ilha de Inglês", "en-US": "English Island" } },
  { id: "es", title: { "pt-BR": "Ilha de Espanhol", "en-US": "Spanish Island" } },
  { id: "ja", title: { "pt-BR": "Ilha de Japonês", "en-US": "Japanese Island" } },
  { id: "zh", title: { "pt-BR": "Ilha de Chinês", "en-US": "Chinese Island" } },
] as const;
import { englishText } from "../data/english-journey";

import type { englishProgress } from "../domain/language-progress";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { PaperArrow } from "./paper-arrow";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { PracticeUserPortrait } from "./practice-user-portrait";
import { MathNumber } from "./math-paper-art";
import { MathPlaceTreasure } from "./math-place-treasure";
import { isMotionReduced } from "../data/accessibility-preferences";
import "./math-island-journey.css";
import "./room-stage.css";

export function VoicesLanguageMap({
  progress,
  onSelect,
  onBack,
}: {
  progress: ReturnType<typeof englishProgress>;
  onSelect: () => void;
  onBack: () => void;
}) {
  useLanguage();
  const [profile] = useStoredProfile();
  const root = useRef<HTMLElement>(null);
  const gesture = useRef<number | null>(null);
  const dragged = useRef(false);
  const wheel = useRef(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"map" | "enter" | "exit">("map");
  const [direction, setDirection] = useState("right");
  useEffect(() => {
    if (phase === "map") return;
    const timer = window.setTimeout(
      () => {
        if (phase === "enter") onSelect();
        else onBack();
      },
      isMotionReduced() ? 0 : 850,
    );
    return () => window.clearTimeout(timer);
  }, [phase, onSelect, onBack]);
  const course = LANGUAGES[index]!;
  useEffect(() => {
    const overflow = document.body.style.overflow;
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLButtonElement>(".math-world-back")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const visit = (next: number) => {
    if (phase === "map" && next >= 0 && next < LANGUAGES.length) {
      setDirection(next < index ? "left" : "right");
      setIndex(next);
    }
  };
  const unlocked = (position: number) => position === 0;
  return createPortal(
    <section
      ref={root}
      className={`math-journey is-${phase} english-subject-journey`}
      aria-label={uiText("Porto das Vozes")}
      style={
        {
          "--math-color": "#16869a",
          "--math-shade": "#16475e",
          "--math-light": "#64d0d5",
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest("dialog[open]")) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          visit(index + (event.key === "ArrowRight" ? 1 : -1));
        }
        if (event.key === "Escape") setPhase("exit");
        if (event.key === "Tab") {
          const controls =
              root.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
            first = controls?.[0],
            last = controls?.[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
      onWheel={(event) => {
        if (event.target instanceof Element && event.target.closest("dialog[open]")) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (Math.abs(delta) > 20 && Date.now() - wheel.current > 650) {
          wheel.current = Date.now();
          visit(index + (delta > 0 ? 1 : -1));
        }
      }}
    >
      <div className="math-journey-content">
        <button
          className="secondary-button math-world-back"
          type="button"
          onClick={() => setPhase("exit")}
        >
          <PaperArrow back />
          {uiText("Voltar")}
        </button>
        <div
          className="math-journey-stage"
          onPointerDown={(event) => {
            if (event.isPrimary && event.button === 0) {
              dragged.current = false;
              gesture.current = event.clientX;
              const button =
                event.target instanceof Element ? event.target.closest("button") : null;
              (button ?? event.currentTarget).setPointerCapture(event.pointerId);
            }
          }}
          onPointerUp={(event) => {
            if (gesture.current !== null && Math.abs(event.clientX - gesture.current) > 55) {
              dragged.current = true;
              visit(index + (event.clientX < gesture.current ? 1 : -1));
            }
            gesture.current = null;
          }}
          onPointerCancel={() => {
            gesture.current = null;
          }}
        >
          {LANGUAGES.map((item, position) => (
            <button
              key={item.id}
              type="button"
              className={`math-journey-island ${position === index ? "is-current" : "is-preview"} ${unlocked(position) ? "" : "is-locked"}`}
              style={{ "--island-x": position - index } as CSSProperties}
              aria-label={uiText("Explorar {0}", [englishText(item.title)])}
              aria-hidden={position !== index}
              disabled={position !== index || phase !== "map" || !unlocked(position)}
              onClick={(event) => {
                if (!dragged.current || event.detail === 0) setPhase("enter");
              }}
            >
              {Math.abs(position - index) <= 1 && (
                <img
                  src={
                    item.id === "en"
                      ? "/languages/islands/english.webp"
                      : "/practice-islands/languages.webp"
                  }
                  width="800"
                  height="800"
                  alt=""
                  draggable={false}
                />
              )}
            </button>
          ))}
          <div key={index} className={`math-journey-avatar is-moving-${direction}`}>
            <div
              className="math-journey-completion"
              role="progressbar"
              aria-label={uiText("Progresso de {0}", [englishText(course.title)])}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={index === 0 ? progress.percent : 0}
            >
              <strong>
                <MathNumber value={index === 0 ? progress.percent : 0} />%
              </strong>
              <div className="math-journey-progress-pieces" aria-hidden="true">
                {progress.parts.map((part, id) => (
                  <span key={id} className={index === 0 && part.confirmed ? "is-complete" : ""}>
                    <i
                      style={{
                        transform: `scaleX(${(index === 0 ? (part.confirmed ? 20 : Math.min(19, part.solved.size)) : 0) / 20})`,
                      }}
                    />
                  </span>
                ))}
              </div>
            </div>
            <PracticeUserPortrait profile={profile} />
          </div>
        </div>
        <div className="math-journey-label" aria-live="polite">
          <span>{uiText("Porto das Vozes")}</span>
          <h1>{englishText(course.title)}</h1>
          <p>
            {unlocked(index)
              ? uiText("6 partes: apresentações, presente, passado, futuro, conexões e expressões.")
              : uiText("Em preparação")}
          </p>
          <button
            className="primary-button math-place-start"
            type="button"
            disabled={phase !== "map" || !unlocked(index)}
            onClick={() => setPhase("enter")}
          >
            {unlocked(index) ? uiText(1793) : uiText(1794)}
          </button>
        </div>
        <button
          className="focus-mode-arrow math-place-arrow math-place-arrow--previous"
          type="button"
          aria-label={uiText("Ilha de idioma anterior")}
          disabled={index === 0 || phase !== "map"}
          onClick={() => visit(index - 1)}
        >
          <FocusPaperArrow />
        </button>
        <button
          className="focus-mode-arrow focus-mode-arrow--next math-place-arrow math-place-arrow--next"
          type="button"
          aria-label={uiText("Próxima ilha de idioma")}
          disabled={index === LANGUAGES.length - 1 || phase !== "map"}
          onClick={() => visit(index + 1)}
        >
          <FocusPaperArrow />
        </button>
        {index === 0 && <MathPlaceTreasure course="english-english" />}
      </div>
    </section>,
    document.body,
  );
}
