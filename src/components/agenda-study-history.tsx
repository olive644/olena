import { uiText, useLanguage, uiLocale } from "../i18n/runtime";
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
import { MATH_COURSES } from "../data/math-courses";

function RangeDate({ date }: { date: string }) {
  useLanguage();

  const value = dateForKey(date);
  return (
    <>
      {value.getDate()} {value.toLocaleDateString(uiLocale(), { month: "short" })}
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
  useLanguage();

  const [section, setSection] = useState<"focus" | "notes" | "islands">("focus");
  const [focusMode, setFocusMode] = useState<"timer" | "pomodoro">("timer");
  const [islandId, setIslandId] = useState<string | null>(null);
  const [, refreshStorage] = useState(0);
  useEffect(() => {
    const refresh = () => refreshStorage((value) => value + 1);
    const events = ["storage", SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT];
    events.forEach((event) => window.addEventListener(event, refresh));
    return () => events.forEach((event) => window.removeEventListener(event, refresh));
  }, []);
  const category: AgendaCategory = section === "focus" ? focusMode : section;
  const practice = (workspace.practiceActivities ?? []).filter((activity) => {
    const date = new Date(activity.completedAt);
    if (!Number.isFinite(date.getTime()) || activity.answers <= 0) return false;
    const key = toDateKey(date);
    return key >= range.start && key <= range.end;
  });
  const available = MATH_COURSES.filter((course) =>
    practice.some((activity) => activity.islandId === `mathematics:${course.id}`),
  );
  const activeIsland = available.some((course) => `mathematics:${course.id}` === islandId)
    ? islandId
    : available[0]
      ? `mathematics:${available[0].id}`
      : null;
  const data = agendaDashboard(
    category === "islands" && activeIsland
      ? {
          ...workspace,
          practiceActivities: practice.filter((activity) => activity.islandId === activeIsland),
        }
      : workspace,
    range,
    category,
    [...history.values()].flatMap((day) => day.sessions),
  );
  const summary = { minutes: data.pie.reduce((sum, item) => sum + item.value, 0) };
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
    <section className="agenda-history module-panel" aria-label={uiText(95)}>
      <header>
        <h2>{uiText(96)}</h2>
        <span>
          <RangeDate date={range.start} />
          {range.start !== range.end && (
            <>
              {" "}
              {uiText(97)} <RangeDate date={range.end} />
            </>
          )}
        </span>
      </header>
      <div className="agenda-dashboard" role="group" aria-label={uiText(98)}>
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
            <strong>{uiText(99)}</strong>
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
            <strong>{uiText(100)}</strong>
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
            <strong>{uiText(101)}</strong>
          </span>
        </button>
      </div>
      <div id="agenda-category-panel" className="agenda-category-panel">
        {section === "focus" && (
          <div className="agenda-focus-modes" role="group" aria-label={uiText(102)}>
            {(["timer", "pomodoro"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="secondary-button"
                aria-pressed={focusMode === mode}
                onClick={() => setFocusMode(mode)}
              >
                {mode === "timer" ? uiText(103) : uiText(1606)}
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
                  {data.legacy} {data.legacy === 1 ? uiText(104) : uiText(105)} {uiText(106)}
                </>
              )}
            </small>
          </div>
        )}
        <AgendaCharts
          key={`${category}:${range.start}:${range.end}:${category === "islands" ? activeIsland : ""}`}
          {...data}
        />
        {summary.minutes === 0 && (
          <p className="agenda-data-empty" role="status">
            {category === "islands"
              ? uiText(107)
              : category === "notes"
                ? uiText(108)
                : uiText(1607, [category === "timer" ? uiText(109) : uiText(1606)])}
          </p>
        )}
        <div
          className="agenda-study-details"
          key={`details:${category}:${range.start}:${range.end}`}
        >
          {category === "notes" && data.entries.length > 0 && (
            <ul className="agenda-shelf-entries" aria-label={uiText(110)}>
              {data.entries.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.title || uiText(2046)}</strong>
                  <small>
                    {entry.label} · <RangeDate date={entry.date} />
                  </small>
                </li>
              ))}
            </ul>
          )}
          {section === "focus" && focusStats.days > 0 && (
            <p>
              {focusStats.days} {focusStats.days === 1 ? uiText(1608) : uiText(1609)} {uiText(111)}
              {focusStats.longest > 1 && uiText(2286, [focusStats.longest])}
            </p>
          )}
          {section === "focus" && <AgendaFocusWeek week={week} mode={focusMode} />}
          {category === "islands" && practice.length > 0 && (
            <AgendaIslandProgress
              activities={practice}
              selectedId={activeIsland}
              onSelect={setIslandId}
            />
          )}
        </div>
      </div>
    </section>
  );
}
