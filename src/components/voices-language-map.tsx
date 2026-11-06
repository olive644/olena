import { ENGLISH_PART_ORDER, englishPartUnlocked } from "../domain/english-part-order";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { uiText, useLanguage } from "../i18n/runtime";
import { ENGLISH_PART_CATALOG } from "../data/english-part-catalog";

import { englishText } from "../data/english-journey";

import type { englishProgress } from "../domain/language-progress";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { PaperArrow } from "./paper-arrow";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { PracticeUserPortrait } from "./practice-user-portrait";
import { MathNumber } from "./math-paper-art";
import { PaperIslandLock } from "./paper-island-lock";
import { HelenaRoomIcon } from "./helena-room-icon";
import { MathPlaceTreasure } from "./math-place-treasure";
import { isMotionReduced } from "../data/accessibility-preferences";
import "./math-island-journey.css";
import "./room-stage.css";

export function VoicesLanguageMap({
  progress,
  onSelect,
  onBack,
  initialPart = 0,
  deliveryOrigin,
}: {
  progress: ReturnType<typeof englishProgress>;
  onSelect: (part: number) => void;
  initialPart?: number;
  deliveryOrigin?: { x: number; y: number; size: number; id: string } | undefined;
  onBack: () => void;
}) {
  useLanguage();
  const [profile] = useStoredProfile();
  const root = useRef<HTMLElement>(null);
  const gesture = useRef<number | null>(null);
  const dragged = useRef(false);
  const wheel = useRef(0);
  const [index, setIndex] = useState(
    Math.max(0, ENGLISH_PART_ORDER.indexOf(initialPart as (typeof ENGLISH_PART_ORDER)[number])),
  );
  const entries = ENGLISH_PART_ORDER.map((id) => ENGLISH_PART_CATALOG[id]!);
  const current = progress.parts[ENGLISH_PART_ORDER[index]!];
  const percent = current!.confirmed ? 100 : Math.min(99, current!.solved.size);
  const [phase, setPhase] = useState<"map" | "enter" | "exit">("map");
  const [direction, setDirection] = useState("right");
  useEffect(() => {
    if (phase === "map") return;
    const timer = window.setTimeout(
      () => {
        if (phase === "enter") onSelect(ENGLISH_PART_ORDER[index]!);
        else onBack();
      },
      isMotionReduced() ? 0 : 850,
    );
    return () => window.clearTimeout(timer);
  }, [phase, onSelect, onBack, index]);
  const course = entries[index]!;
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
    if (phase === "map" && next >= 0 && next < entries.length) {
      setDirection(next < index ? "left" : "right");
      setIndex(next);
    }
  };
  const unlocked = (position: number) =>
    englishPartUnlocked(progress.parts, ENGLISH_PART_ORDER[position]!);
  return createPortal(
    <section
      ref={root}
      className={`math-journey is-${phase} english-parts-journey`}
      aria-label={uiText("Partes do Cais dos Encontros")}
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
          {entries.map((item, position) => (
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
                  src={`/languages/english-parts/${item.art}.webp`}
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
              aria-valuenow={percent}
            >
              <strong>
                <MathNumber value={percent} />%
              </strong>
              <div className="math-journey-progress-pieces" aria-hidden="true">
                {Array.from({ length: 6 }, (_, id) => (
                  <span key={id} className={percent >= ((id + 1) * 100) / 6 ? "is-complete" : ""}>
                    <i
                      style={{
                        transform: `scaleX(${Math.max(0, Math.min(1, (percent * 6) / 100 - id))})`,
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
          <span>{uiText("Inglês · Parte {0} de {1}", [index + 1, entries.length])}</span>
          <h1>{englishText(course.title)}</h1>
          <p>{englishText(course.subject)}</p>
          <button
            className="primary-button math-place-start"
            type="button"
            disabled={phase !== "map" || !unlocked(index)}
            onClick={() => setPhase("enter")}
          >
            {unlocked(index) ? <HelenaRoomIcon name="play" /> : <PaperIslandLock />}{" "}
            {unlocked(index) ? uiText(1793) : uiText(1794)}
          </button>
        </div>
        <button
          className="focus-mode-arrow math-place-arrow math-place-arrow--previous"
          type="button"
          aria-label={uiText("Parte anterior de Inglês")}
          disabled={index === 0 || phase !== "map"}
          onClick={() => visit(index - 1)}
        >
          <FocusPaperArrow />
        </button>
        <button
          className="focus-mode-arrow focus-mode-arrow--next math-place-arrow math-place-arrow--next"
          type="button"
          aria-label={uiText("Próxima parte de Inglês")}
          disabled={index === entries.length - 1 || phase !== "map"}
          onClick={() => visit(index + 1)}
        >
          <FocusPaperArrow />
        </button>
        <MathPlaceTreasure course="english-english" deliveryOrigin={deliveryOrigin} />
      </div>
    </section>,
    document.body,
  );
}
