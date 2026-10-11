import { dateForKey } from "../domain/agenda";
import { type AgendaRange, type focusHistory } from "../domain/agenda-history";
import { useState } from "react";
import { agendaDashboard, type AgendaCategory } from "../domain/agenda-dashboard";
import { readMathLearning } from "../data/math-learning";
import { AgendaCharts } from "./agenda-charts";
import { type WorkspaceState } from "../domain/workspace";
import { type AppView } from "./app-navigation";
import { NavigationIcon } from "./navigation-icon";
import { PaperDigits } from "./paper-digits";

function RangeDate({ date }: { date: string }) {
  const value = dateForKey(date);
  return (
    <>
      <PaperDigits value={String(value.getDate())} />{" "}
      {value.toLocaleDateString("pt-BR", { month: "short" })}
    </>
  );
}

export function AgendaStudyHistory({
  history,
  range,
  workspace,
  onNavigate,
}: {
  history: ReturnType<typeof focusHistory>;
  range: AgendaRange;
  workspace: WorkspaceState;
  onNavigate?: (view: AppView) => void;
}) {
  const [category, setCategory] = useState<AgendaCategory>("timer");
  const data = agendaDashboard(
    workspace,
    range,
    category,
    category === "islands" ? readMathLearning() : {},
    [...history.values()].flatMap((day) => day.sessions),
  );
  const summary = { minutes: data.pie.reduce((sum, item) => sum + item.value, 0) };
  return (
    <section className="agenda-history module-panel" aria-label="Histórico de estudo">
      <header>
        <h2>Meu estudo</h2>
        <span>
          <RangeDate date={range.start} />
          {range.start !== range.end && (
            <>
              {" "}
              a <RangeDate date={range.end} />
            </>
          )}
        </span>
      </header>
      <div className="agenda-dashboard" role="group" aria-label="Categorias do estudo">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setCategory("timer")}
          aria-pressed={category === "timer"}
          aria-controls="agenda-category-panel"
        >
          <NavigationIcon
            name="focus"
            {...(category === "timer" ? { paperVariant: "escuro" as const } : {})}
          />
          <span>
            <strong>Cronômetro</strong>
          </span>
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setCategory("notes")}
          aria-pressed={category === "notes"}
          aria-controls="agenda-category-panel"
        >
          <NavigationIcon
            name="notes"
            {...(category === "notes" ? { paperVariant: "escuro" as const } : {})}
          />
          <span>
            <strong>Caderno</strong>
          </span>
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setCategory("pomodoro")}
          aria-pressed={category === "pomodoro"}
          aria-controls="agenda-category-panel"
        >
          <svg className="agenda-pomodoro-icon" viewBox="0 0 280 290" aria-hidden="true">
            <path
              fill="#963a50"
              d="m140 85-32-11-35 9-29 23-17 34 1 41 17 36 30 29 65 15 65-15 30-29 17-36 1-41-17-34-29-23-35-9Z"
            />
            <path
              fill="#e55670"
              d="m140 78-32-11-35 9-29 23-17 34 1 41 17 36 30 29 65 15 65-15 30-29 17-36 1-41-17-34-29-23-35-9Z"
            />
            <path fill="#ffadbc" d="m31 128 20-29 33-17-21 27Z M191 239l32-31 15-35-2 37-29 28Z" />
            <path
              fill="#38a4ad"
              d="m140 66-35-20 9 25-43 9 42 13-15 25 42-24 39 24-13-26 44-12-42-9 8-25Z"
            />
            <path fill="#216970" d="m140 78-42 40 42-24 39 24-13-26 44-12-48 3 14-37Z" />
          </svg>
          <span>
            <strong>Pomodoro</strong>
          </span>
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setCategory("islands")}
          aria-pressed={category === "islands"}
          aria-controls="agenda-category-panel"
        >
          <img
            className="agenda-island-icon"
            src="/practice-islands/mathematics-small.webp"
            alt=""
            draggable={false}
          />
          <span>
            <strong>Ilhas</strong>
          </span>
        </button>
      </div>
      <div id="agenda-category-panel" className="agenda-category-panel">
        <div className="agenda-chart-heading" role="status">
          <strong>
            <PaperDigits value={String(summary.minutes)} /> {data.unit}
          </strong>
          <small>
            {data.note}
            {data.legacy > 0 && (
              <>
                {" "}
                <PaperDigits value={String(data.legacy)} /> sessões antigas sem modalidade, fora
                destes gráficos.
              </>
            )}
          </small>
        </div>
        <AgendaCharts key={`${category}:${range.start}:${range.end}`} {...data} />
        {onNavigate && (
          <button
            type="button"
            className="secondary-button agenda-chart-action"
            onClick={() =>
              onNavigate(
                category === "notes" ? "notes" : category === "islands" ? "learn" : "focus",
              )
            }
          >
            {category === "notes"
              ? "Abrir cadernos"
              : category === "islands"
                ? "Explorar ilhas"
                : "Abrir Foco"}
          </button>
        )}
      </div>
    </section>
  );
}
