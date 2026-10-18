import { uiText, useLanguage } from "../i18n/runtime";
import { useRef, useState } from "react";
import { MATH_COURSES } from "../data/math-courses";
import { type PracticeActivity } from "../domain/workspace";
import { FocusPaperArrow } from "./focus-paper-arrow";

export function AgendaIslandProgress({
  activities,
  selectedId,
  onSelect,
}: {
  activities: PracticeActivity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  useLanguage();

  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const courses = MATH_COURSES.filter((course) =>
    activities.some(
      (activity) => activity.islandId === `mathematics:${course.id}` && activity.answers > 0,
    ),
  );
  const selectedIndex = Math.max(
    0,
    courses.findIndex((course) => `mathematics:${course.id}` === selectedId),
  );
  const course = courses[selectedIndex];
  if (!course) return null;
  const progress = activities.filter(
    (activity) => activity.islandId === `mathematics:${course.id}`,
  );
  const answers = progress.reduce((sum, activity) => sum + activity.answers, 0);
  const correct = progress.reduce((sum, activity) => sum + activity.correct, 0);
  const visit = (next: number) => {
    const nextCourse = courses[Math.max(0, Math.min(courses.length - 1, next))];
    if (nextCourse) onSelect(`mathematics:${nextCourse.id}`);
    setOffset(0);
  };
  return (
    <section className="agenda-island-progress" aria-label={uiText(62)}>
      <div
        className="agenda-island-carousel"
        role="group"
        aria-label={uiText(63)}
        tabIndex={0}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            visit(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? courses.length - 1
                  : selectedIndex + (event.key === "ArrowRight" ? 1 : -1),
            );
          }
        }}
      >
        <button
          type="button"
          className="focus-mode-arrow"
          aria-label={uiText(64)}
          disabled={selectedIndex === 0}
          onClick={() => visit(selectedIndex - 1)}
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
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy))
              visit(selectedIndex + (dx < 0 ? 1 : -1));
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
            alt={uiText(1591, [course.title])}
            draggable={false}
            width={480}
            height={480}
            style={{ transform: `translateX(${offset}px) rotate(${offset / 25}deg)` }}
          />
          <div className="agenda-island-caption" aria-live="polite">
            <small>
              {course.subject} · {selectedIndex + 1}/{courses.length}
            </small>
            <h3>{course.title}</h3>
            {answers > 0 && (
              <p>
                {answers} {uiText(65)}
              </p>
            )}
            {correct > 0 && (
              <p>
                {correct} {uiText(66)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          className="focus-mode-arrow focus-mode-arrow--next"
          aria-label={uiText(67)}
          disabled={selectedIndex === courses.length - 1}
          onClick={() => visit(selectedIndex + 1)}
        >
          <FocusPaperArrow />
        </button>
      </div>
    </section>
  );
}
