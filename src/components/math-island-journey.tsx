import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MATH_COURSES } from "../data/math-courses";
import { mathLearning } from "../data/math-learning";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { isMotionReduced } from "../data/accessibility-preferences";
import { PracticeUserPortrait } from "./practice-user-portrait";
import { PaperArrow } from "./paper-arrow";
import { MathArcade } from "./math-arcade";
import { MathActionIcon } from "./math-paper-art";
import "./math-island-journey.css";

export function MathIslandJourney({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"map" | "enter" | "game" | "return" | "exit">("map");
  const [profile] = useStoredProfile();
  const gesture = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLButtonElement>(".math-start-button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const course = MATH_COURSES[index]!;
  function visit(next: number) {
    if (phase === "map") setIndex(Math.max(0, Math.min(MATH_COURSES.length - 1, next)));
  }
  useEffect(() => {
    if (phase !== "enter" && phase !== "return" && phase !== "exit") return;
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
        if (["ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          visit(index + (event.key === "ArrowUp" ? 1 : -1));
        }
      }}
      onWheel={(event) => {
        if (Math.abs(event.deltaY) > 20 && Date.now() - lastWheel.current > 650) {
          lastWheel.current = Date.now();
          visit(index + (event.deltaY < 0 ? 1 : -1));
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
            gesture.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={(event) => {
          if (gesture.current !== null && Math.abs(event.clientY - gesture.current) > 55)
            visit(index + (event.clientY < gesture.current ? 1 : -1));
          gesture.current = null;
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        {MATH_COURSES.map((item, position) => (
          <div
            key={item.id}
            className={`math-journey-island ${position === index ? "is-current" : "is-preview"}`}
            aria-hidden={position !== index}
            style={{ "--island-y": position - index } as CSSProperties}
          >
            {Math.abs(position - index) <= 1 && (
              <img
                src={`/math-islands/${item.id}.webp`}
                srcSet={`/math-islands/${item.id}-small.webp 480w, /math-islands/${item.id}.webp 800w`}
                sizes="(max-width: 600px) 75vw, 440px"
                alt={position === index ? item.title : ""}
                width="800"
                height="800"
                draggable={false}
                decoding="async"
              />
            )}
            {position === index && (
              <div className="math-journey-avatar">
                <PracticeUserPortrait profile={profile} />
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        className="focus-mode-arrow math-journey-up"
        type="button"
        aria-label="Próxima ilha de Matemática"
        disabled={index === MATH_COURSES.length - 1 || phase !== "map"}
        onClick={() => visit(index + 1)}
      >
        <PaperArrow />
      </button>
      <button
        className="focus-mode-arrow math-journey-down"
        type="button"
        aria-label="Ilha anterior de Matemática"
        disabled={index === 0 || phase !== "map"}
        onClick={() => visit(index - 1)}
      >
        <PaperArrow />
      </button>
      <div className="math-journey-label" aria-live="polite">
        <span>{course.subject}</span>
        <h1>{course.title}</h1>
        <p>{course.topics[mathLearning(course.id).level]}</p>
        <button
          className="primary-button math-start-button"
          type="button"
          disabled={phase !== "map"}
          onClick={() => setPhase("enter")}
        >
          <MathActionIcon /> Explorar ilha
        </button>
      </div>
    </section>,
    document.body,
  );
}
