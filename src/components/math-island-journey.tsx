import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MATH_COURSES } from "../data/math-courses";
import type { PracticeActivity } from "../domain/workspace";
import { mathGameLearning, readMathGame } from "../data/math-game-learning";
import {
  masteryCompletion as gameCompletion,
  unlockedMasteryCourse as unlockedMathCourse,
} from "../domain/math-mastery-progress";
import { SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { isMotionReduced } from "../data/accessibility-preferences";
import { PracticeUserPortrait } from "./practice-user-portrait";
import { PaperArrow } from "./paper-arrow";
import { MathArcade } from "./math-arcade";
import { HelenaRoomIcon } from "./helena-room-icon";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { MathPlaceTreasure } from "./math-place-treasure";
import { MathPlaceScene } from "./math-place-scene";
import { MathNumber } from "./math-paper-art";
import "./math-island-journey.css";

export function MathIslandJourney({
  onBack,
  entryOrigin,
  onPractice,
}: {
  onBack: () => void;
  onPractice?: ((activity: PracticeActivity) => void) | undefined;
  entryOrigin?: { x: number; y: number; size: number } | undefined;
}) {
  const [index, setIndex] = useState(0);
  const [chestDelivery, setChestDelivery] = useState<
    { x: number; y: number; size: number; id: string } | undefined
  >();
  const [phase, setPhase] = useState<"arrive" | "map" | "enter" | "game" | "return" | "exit">(
    entryOrigin ? "arrive" : "map",
  );
  const [profile] = useStoredProfile();
  const [progress, setProgress] = useState(readMathGame);
  useEffect(() => {
    const refresh = () => setProgress(readMathGame());
    window.addEventListener("storage", refresh);
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    window.addEventListener(SYNCED_STORAGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
      window.removeEventListener(SYNCED_STORAGE_EVENT, refresh);
    };
  }, []);
  const gesture = useRef<number | null>(null);
  const dragged = useRef(false);
  const [travel, setTravel] = useState({ direction: "right", key: 0 });
  const lastWheel = useRef(0);
  const displayedPoints = useRef(0);
  const [pointsOrigin, setPointsOrigin] = useState(0);
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
  const unlocked = unlockedMathCourse(course.id, progress);
  const completion = gameCompletion(mathGameLearning(course.id));
  function visit(next: number) {
    const destination = Math.max(0, Math.min(MATH_COURSES.length - 1, next));
    if (phase === "map" && destination !== index) {
      setPointsOrigin(displayedPoints.current);
      setTravel((value) => ({
        direction: destination > index ? "right" : "left",
        key: value.key + 1,
      }));
      setIndex(destination);
      setChestDelivery(undefined);
    }
  }
  useEffect(() => {
    if (phase !== "arrive" && phase !== "enter" && phase !== "return" && phase !== "exit") return;
    const timer = setTimeout(
      () => {
        setPointsOrigin(displayedPoints.current);
        if (phase === "exit") onBack();
        else setPhase(phase === "enter" ? "game" : "map");
      },
      isMotionReduced() ? 0 : 850,
    );
    return () => clearTimeout(timer);
  }, [phase, onBack]);
  if (phase === "game")
    return (
      <MathArcade
        onPractice={onPractice}
        courseId={course.id}
        onNextCourse={(next) => {
          if (!unlockedMathCourse(next, readMathGame())) return;
          setIndex(MATH_COURSES.findIndex((item) => item.id === next));
          setChestDelivery(undefined);
          setPhase("return");
        }}
        onBack={() => {
          setPointsOrigin(displayedPoints.current);
          setChestDelivery(undefined);
          setPhase("return");
        }}
        onChestReturn={(origin) => {
          setPointsOrigin(displayedPoints.current);
          setChestDelivery(origin);
          setPhase("return");
        }}
      />
    );
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
        if (
          Math.abs(event.deltaY) >= Math.abs(event.deltaX) &&
          event.currentTarget.scrollHeight > event.currentTarget.clientHeight
        )
          return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (Math.abs(delta) > 20 && Date.now() - lastWheel.current > 650) {
          lastWheel.current = Date.now();
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
          <PaperArrow back /> Voltar às ilhas
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
          {MATH_COURSES.map((item, position) => (
            <button
              key={item.id}
              type="button"
              aria-label={"Entrar em " + item.title}
              disabled={
                position !== index || phase !== "map" || !unlockedMathCourse(item.id, progress)
              }
              onClick={(event) => {
                if (!dragged.current || event.detail === 0) setPhase("enter");
              }}
              className={`math-journey-island ${position === index ? "is-current" : "is-preview"} ${unlockedMathCourse(item.id, progress) ? "" : "is-locked"}`}
              aria-hidden={position !== index}
              style={
                {
                  "--island-x": position - index,
                } as CSSProperties
              }
            >
              {Math.abs(position - index) <= 1 && (
                <MathPlaceScene course={item.id} active={position === index} animate />
              )}
            </button>
          ))}
          <div key={travel.key} className={`math-journey-avatar is-moving-${travel.direction}`}>
            <div
              className="math-journey-completion"
              role="progressbar"
              aria-label={`Conclusão de ${course.title}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion.percent}
            >
              <strong>
                <MathNumber value={completion.percent} />%
              </strong>
              <div className="math-journey-progress-pieces" aria-hidden="true">
                {completion.counts.map((count, level) => (
                  <span key={level} className={count === 20 ? "is-complete" : ""}>
                    <i style={{ transform: `scaleX(${count / 20})` }} />
                  </span>
                ))}
              </div>
            </div>
            <PracticeUserPortrait profile={profile} />
          </div>
        </div>
        <div className="math-journey-label" aria-live="polite">
          <span>{course.subject}</span>
          <h1>{course.title}</h1>
          <p>
            {unlocked
              ? course.topics[mathGameLearning(course.id).level]
              : `Complete ${MATH_COURSES[index - 1]!.title} para liberar.`}
          </p>
          <button
            className="primary-button math-place-start"
            type="button"
            disabled={phase !== "map" || !unlocked}
            onClick={() => {
              if (unlockedMathCourse(course.id, readMathGame())) setPhase("enter");
            }}
          >
            <HelenaRoomIcon name="play" /> {unlocked ? "Explorar lugar" : "Lugar bloqueado"}
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
          deliveryOrigin={chestDelivery}
          initialPoints={pointsOrigin}
          onPointsChange={(points) => {
            displayedPoints.current = points;
          }}
          key={`${course.id}:${phase === "return" ? "return" : "map"}`}
          course={course.id}
        />
      </div>
    </section>,
    document.body,
  );
}
