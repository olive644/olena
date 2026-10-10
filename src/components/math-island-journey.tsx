import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MATH_COURSES } from "../data/math-courses";
import { mathLearning } from "../data/math-learning";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { isMotionReduced } from "../data/accessibility-preferences";
import { PracticeUserPortrait } from "./practice-user-portrait";
import { PaperArrow } from "./paper-arrow";
import { MathArcade } from "./math-arcade";
import { HelenaRoomIcon } from "./helena-room-icon";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { MathPlaceTreasure } from "./math-place-treasure";
import { MathPlaceScene } from "./math-place-scene";
import "./math-island-journey.css";

export function MathIslandJourney({
  onBack,
  entryOrigin,
}: {
  onBack: () => void;
  entryOrigin?: { x: number; y: number; size: number } | undefined;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"arrive" | "map" | "enter" | "game" | "return" | "exit">(
    entryOrigin ? "arrive" : "map",
  );
  const [profile] = useStoredProfile();
  const gesture = useRef<number | null>(null);
  const dragged = useRef(false);
  const [travel, setTravel] = useState({ direction: "right", key: 0 });
  const lastWheel = useRef(0);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLButtonElement>(".math-place-start")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const course = MATH_COURSES[index]!;
  function visit(next: number) {
    const destination = Math.max(0, Math.min(MATH_COURSES.length - 1, next));
    if (phase === "map" && destination !== index) {
      setTravel((value) => ({
        direction: destination > index ? "right" : "left",
        key: value.key + 1,
      }));
      setIndex(destination);
    }
  }
  useEffect(() => {
    if (phase !== "arrive" && phase !== "enter" && phase !== "return" && phase !== "exit") return;
    const timer = setTimeout(
      () => (phase === "exit" ? onBack() : setPhase(phase === "enter" ? "game" : "map")),
      isMotionReduced() ? 0 : 850,
    );
    return () => clearTimeout(timer);
  }, [phase, onBack]);
  if (phase === "game")
    return <MathArcade courseId={course.id} onBack={() => setPhase("return")} />;
  return createPortal(
    <section
      ref={root}
      className={`math-journey is-${phase}`}
      aria-label="Ilhas de Matemática"
      style={
        {
          "--math-color": course.color,
          "--math-shade": course.shade,
          "--math-light": course.light,
          "--entry-x": `${entryOrigin?.x ?? 0}px`,
          "--entry-y": `${entryOrigin?.y ?? 0}px`,
          "--entry-size": `${entryOrigin?.size ?? 64}px`,
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const buttons =
            root.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
          const first = buttons?.[0],
            last = buttons?.[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          visit(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
      onWheel={(event) => {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (Math.abs(delta) > 20 && Date.now() - lastWheel.current > 650) {
          lastWheel.current = Date.now();
          visit(index + (delta > 0 ? 1 : -1));
        }
      }}
    >
      <button
        className="secondary-button math-world-back"
        type="button"
        onClick={() => setPhase("exit")}
      >
        <PaperArrow back /> Voltar às ilhas
      </button>
      <div
        className="math-journey-stage"
        onPointerDown={(event) => {
          if (event.isPrimary && event.button === 0) {
            dragged.current = false;
            gesture.current = event.clientX;
            const button = event.target instanceof Element ? event.target.closest("button") : null;
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
        {MATH_COURSES.map((item, position) => (
          <button
            key={item.id}
            type="button"
            aria-label={"Entrar em " + item.title}
            disabled={position !== index || phase !== "map"}
            onClick={(event) => {
              if (!dragged.current || event.detail === 0) setPhase("enter");
            }}
            className={`math-journey-island ${position === index ? "is-current" : "is-preview"}`}
            aria-hidden={position !== index}
            style={
              {
                "--island-x": position - index,
              } as CSSProperties
            }
          >
            {Math.abs(position - index) <= 1 && (
              <MathPlaceScene course={item.id} active={position === index} />
            )}
          </button>
        ))}
        <div key={travel.key} className={`math-journey-avatar is-moving-${travel.direction}`}>
          <PracticeUserPortrait profile={profile} />
        </div>
      </div>
      <div className="math-journey-label" aria-live="polite">
        <span>{course.subject}</span>
        <h1>{course.title}</h1>
        <p>{course.topics[mathLearning(course.id).level]}</p>
        <button
          className="primary-button math-place-start"
          type="button"
          disabled={phase !== "map"}
          onClick={() => setPhase("enter")}
        >
          <HelenaRoomIcon name="play" /> Explorar lugar
        </button>
      </div>
      <button
        className="focus-mode-arrow math-place-arrow math-place-arrow--previous"
        aria-label="Lugar anterior"
        disabled={index === 0 || phase !== "map"}
        onClick={() => visit(index - 1)}
      >
        <FocusPaperArrow />
      </button>
      <button
        className="focus-mode-arrow focus-mode-arrow--next math-place-arrow math-place-arrow--next"
        aria-label="Próximo lugar"
        disabled={index === MATH_COURSES.length - 1 || phase !== "map"}
        onClick={() => visit(index + 1)}
      >
        <FocusPaperArrow />
      </button>
      <MathPlaceTreasure
        key={`${course.id}:${phase === "return" ? "return" : "map"}`}
        course={course.id}
      />
    </section>,
    document.body,
  );
}
