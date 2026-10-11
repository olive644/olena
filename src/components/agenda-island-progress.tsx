import { useRef, useState } from "react";
import { MATH_COURSES } from "../data/math-courses";
import { type readMathLearning } from "../data/math-learning";
import { AgendaCharts } from "./agenda-charts";
import { FocusPaperArrow } from "./focus-paper-arrow";

export function AgendaIslandProgress({
  learning,
}: {
  learning: ReturnType<typeof readMathLearning>;
}) {
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const course = MATH_COURSES[index]!;
  const progress = learning[course.id];
  const acertos = MATH_COURSES.map((item) => ({
    label: item.subject,
    value: learning[item.id]?.correct ?? 0,
  }));
  const records = MATH_COURSES.map((item) => ({
    label: item.subject,
    value: learning[item.id]?.best ?? 0,
  }));
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
      <div className="agenda-island-caption" aria-live="polite">
        <small>
          {course.subject} · {index + 1}/{MATH_COURSES.length}
        </small>
        <h3>{course.title}</h3>
        <p>{course.topics.join(" · ")}</p>
        {(progress?.correct ?? 0) > 0 && <p>{progress!.correct} acertos acumulados</p>}
        {(progress?.best ?? 0) > 0 && <p>Melhor rodada: {progress!.best} pontos</p>}
      </div>
      {acertos.some((item) => item.value > 0) && (
        <>
          <h3>Progresso acumulado de Matemática</h3>
          <small>Acertos salvos em todas as ilhas. Independente das datas selecionadas.</small>
          <AgendaCharts
            bars={acertos}
            pie={acertos}
            unit="acertos"
            barTitle="Acertos acumulados por ilha"
            pieTitle="Distribuição dos acertos"
          />
        </>
      )}
      {records.some((item) => item.value > 0) && (
        <>
          <h3>Recordes das ilhas</h3>
          <small>
            Pontos da melhor rodada de cada ilha, não pontos totais nem atividade por data.
          </small>
          <AgendaCharts
            bars={records}
            pie={[]}
            unit="pontos"
            barTitle="Melhor rodada por ilha"
            pieTitle=""
          />
        </>
      )}
      <small>Use as setas, arraste a ilha ou use o teclado para explorar as prévias.</small>
    </section>
  );
}
