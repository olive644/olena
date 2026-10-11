import { dateForKey } from "../domain/agenda";
import { historySummary, focusHistory, type AgendaRange } from "../domain/agenda-history";
import { useEffect, useState } from "react";
import { SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
import { pomodoroWeek } from "../domain/agenda-insights";
import { agendaDashboard, type AgendaCategory } from "../domain/agenda-dashboard";
import { AgendaCharts } from "./agenda-charts";
import { toDateKey, type WorkspaceState } from "../domain/workspace";
import { type AppView } from "./app-navigation";
import { NavigationIcon } from "./navigation-icon";
import { AgendaIslandProgress } from "./agenda-island-progress";
import { AgendaFocusWeek } from "./agenda-focus-week";

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
}: {
  history: ReturnType<typeof focusHistory>;
  range: AgendaRange;
  workspace: WorkspaceState;
  onNavigate?: (view: AppView) => void;
}) {
  const [section, setSection] = useState<"focus" | "notes" | "islands">("focus");
  const [focusMode, setFocusMode] = useState<"timer" | "pomodoro">("timer");
  const [, refreshStorage] = useState(0);
  useEffect(() => {
    const refresh = () => refreshStorage((value) => value + 1);
    const events = ["storage", SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT];
    events.forEach((event) => window.addEventListener(event, refresh));
    return () => events.forEach((event) => window.removeEventListener(event, refresh));
  }, []);
  const category: AgendaCategory = section === "focus" ? focusMode : section;
  const data = agendaDashboard(
    workspace,
    range,
    category,
    [...history.values()].flatMap((day) => day.sessions),
  );
  const summary = { minutes: data.pie.reduce((sum, item) => sum + item.value, 0) };
  const practice = (workspace.practiceActivities ?? []).filter((activity) => {
    const date = new Date(activity.completedAt);
    if (!Number.isFinite(date.getTime()) || activity.answers <= 0) return false;
    const key = toDateKey(date);
    return key >= range.start && key <= range.end;
  });
  let pomodoroDays: unknown = [];
  try {
    pomodoroDays = JSON.parse(localStorage.getItem("noteoli.pomodoro-streak.v1") ?? "[]");
  } catch {
    /* Invalid persisted data does not create activity. */
  }
  const timerDays = [...history.keys()].filter((key) =>
    history.get(key)?.sessions.some((session) => session.mode === "timer"),
  );
  const week = pomodoroWeek(category === "timer" ? timerDays : pomodoroDays, range);
  const focusStats = historySummary(
    focusHistory(
      [...history.values()]
        .flatMap((day) => day.sessions)
        .filter((session) => session.mode === category),
    ),
    range,
  );
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
        {summary.minutes > 0 && (
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
        )}
        <AgendaCharts key={`${category}:${range.start}:${range.end}`} {...data} />
        {summary.minutes === 0 && (
          <p className="agenda-data-empty" role="status">
            {category === "islands"
              ? "Nenhuma resposta registrada nas ilhas neste período. O progresso antigo sem data não entra neste filtro."
              : category === "notes"
                ? "Nenhum caderno criado neste período. Os seus cadernos continuam na biblioteca."
                : `Nenhuma sessão de ${category === "timer" ? "cronômetro" : "Pomodoro"} concluída neste período.`}
          </p>
        )}
        <div
          className="agenda-study-details"
          key={`details:${category}:${range.start}:${range.end}`}
        >
          {section === "focus" && focusStats.days > 0 && (
            <p>
              {focusStats.days} {focusStats.days === 1 ? "dia de foco" : "dias de foco"} no período
              {focusStats.longest > 1 && ` · ${focusStats.longest} dias consecutivos`}
            </p>
          )}
          {section === "focus" && <AgendaFocusWeek week={week} mode={focusMode} />}
          {category === "islands" && practice.length > 0 && (
            <AgendaIslandProgress activities={practice} />
          )}
        </div>
      </div>
    </section>
  );
}
