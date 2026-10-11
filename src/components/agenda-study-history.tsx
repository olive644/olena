import { dateForKey } from "../domain/agenda";
import { type AgendaRange, type focusHistory } from "../domain/agenda-history";
import { useState } from "react";
import { agendaDashboard, type AgendaCategory } from "../domain/agenda-dashboard";
import { AgendaCharts } from "./agenda-charts";
import { type WorkspaceState } from "../domain/workspace";
import { type AppView } from "./app-navigation";
import { NavigationIcon } from "./navigation-icon";

function RangeDate({ date }: { date: string }) {
  const value = dateForKey(date);
  return (
    <>
      {value.getDate()} {value.toLocaleDateString("pt-BR", { month: "short" })}
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
  const [section, setSection] = useState<"focus" | "notes" | "islands">("focus");
  const [focusMode, setFocusMode] = useState<"timer" | "pomodoro">("timer");
  const category: AgendaCategory = section === "focus" ? focusMode : section;
  const data = agendaDashboard(
    workspace,
    range,
    category,
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
          onClick={() => setSection("focus")}
          aria-pressed={section === "focus"}
          aria-controls="agenda-category-panel"
        >
          <NavigationIcon
            name="focus"
            {...(section === "focus" ? { paperVariant: "escuro" as const } : {})}
          />
          <span>
            <strong>Foco</strong>
          </span>
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setSection("notes")}
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
          onClick={() => setSection("islands")}
          aria-pressed={category === "islands"}
          aria-controls="agenda-category-panel"
        >
          <NavigationIcon
            name="gamepad"
            {...(category === "islands" ? { paperVariant: "escuro" as const } : {})}
          />
          <span>
            <strong>Praticar</strong>
          </span>
        </button>
      </div>
      <div id="agenda-category-panel" className="agenda-category-panel">
        {section === "focus" && (
          <div className="agenda-focus-modes" role="group" aria-label="Modalidades de foco">
            {(["timer", "pomodoro"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="secondary-button"
                aria-pressed={focusMode === mode}
                onClick={() => setFocusMode(mode)}
              >
                {mode === "timer" ? "Cronômetro" : "Pomodoro"}
              </button>
            ))}
          </div>
        )}
        <div className="agenda-chart-heading" role="status">
          <strong>
            {summary.minutes} {data.unit}
          </strong>
          <small>
            {data.note}
            {data.legacy > 0 && (
              <>
                {" "}
                {data.legacy} {data.legacy === 1 ? "sessão antiga" : "sessões antigas"} sem
                modalidade, fora destes gráficos.
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
                ? "Abrir Praticar"
                : "Abrir Foco"}
          </button>
        )}
      </div>
    </section>
  );
}
