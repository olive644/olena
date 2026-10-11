import { useRef, useState } from "react";
import { MATH_COURSES } from "../data/math-courses";
import { type PracticeActivity } from "../domain/workspace";
import { FocusPaperArrow } from "./focus-paper-arrow";

export function AgendaIslandProgress({ activities }: { activities: PracticeActivity[] }) {
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const course = MATH_COURSES[index]!;
  const progress = activities.filter(
    (activity) => activity.islandId === `mathematics:${course.id}`,
  );
  const answers = progress.reduce((sum, activity) => sum + activity.answers, 0);
  const correct = progress.reduce((sum, activity) => sum + activity.correct, 0);
  const visit = (next: number) => {
    setIndex(Math.max(0, Math.min(MATH_COURSES.length - 1, next)));
    setOffset(0);
  };
  return (
    <section className="agenda-island-progress" aria-label="Progresso das ilhas de Matemática">
      <div
        className="agenda-island-carousel"
        role="group"
        aria-label="Prévia das ilhas"
        tabIndex={0}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            visit(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? MATH_COURSES.length - 1
                  : index + (event.key === "ArrowRight" ? 1 : -1),
            );
          }
        }}
      >
        <button
          type="button"
          className="focus-mode-arrow"
          aria-label="Ilha anterior"
          disabled={index === 0}
          onClick={() => visit(index - 1)}
        >
          <FocusPaperArrow />
        </button>
        <div
          className="agenda-island-drag"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            gesture.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (gesture.current)
              setOffset(Math.max(-90, Math.min(90, event.clientX - gesture.current.x)));
          }}
          onPointerUp={(event) => {
            if (!gesture.current) return;
            const dx = event.clientX - gesture.current.x,
              dy = event.clientY - gesture.current.y;
            gesture.current = null;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) visit(index + (dx < 0 ? 1 : -1));
            else setOffset(0);
          }}
          onPointerCancel={() => {
            gesture.current = null;
            setOffset(0);
          }}
          onLostPointerCapture={() => {
            gesture.current = null;
            setOffset(0);
          }}
        >
          <img
            key={course.id}
            src={`/math-islands/places/${course.id}-small.webp`}
            alt={`Prévia: ${course.title}`}
            draggable={false}
            width={480}
            height={480}
            style={{ transform: `translateX(${offset}px) rotate(${offset / 25}deg)` }}
          />
          <div className="agenda-island-caption" aria-live="polite">
            <small>
              {course.subject} · {index + 1}/{MATH_COURSES.length}
            </small>
            <h3>{course.title}</h3>
            {answers > 0 && <p>{answers} respostas no período</p>}
            {correct > 0 && <p>{correct} acertos no período</p>}
          </div>
        </div>
        <button
          type="button"
          className="focus-mode-arrow focus-mode-arrow--next"
          aria-label="Próxima ilha"
          disabled={index === MATH_COURSES.length - 1}
          onClick={() => visit(index + 1)}
        >
          <FocusPaperArrow />
        </button>
      </div>
      <small>Use as setas, arraste a ilha ou use o teclado para explorar as prévias.</small>
    </section>
  );
}
