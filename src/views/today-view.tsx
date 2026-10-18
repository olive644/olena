import { localizeResource, uiText, useLanguage, uiLocale } from "../i18n/runtime";
import type { Dispatch } from "react";
import { PaperCheckIcon } from "../components/paper-check-icon";
import {
  minutesFocusedOn,
  toDateKey,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import type { AppView } from "../components/app-navigation";
import { PageHeader } from "../components/app-navigation";
import { NavigationIcon } from "../components/navigation-icon";
import { PaperArrow } from "../components/paper-arrow";
import { buildStudyRoute } from "../domain/study-route";
import { displayEventsOn } from "../domain/agenda-calendar";
import "./today-view.css";

type TodayViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onNavigate: (view: AppView) => void;
};

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(uiLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function TodayView({ workspace, dispatch, onNavigate }: TodayViewProps) {
  useLanguage();

  const now = new Date();
  const today = toDateKey(now);
  const pendingTasks = workspace.tasks.filter((task) => !task.completed);
  const todayEvents = displayEventsOn(workspace.events, today);
  const focusMinutes = minutesFocusedOn(workspace, today);
  const studyRoute = localizeResource(buildStudyRoute(workspace, today));
  const subjectName = (subjectId: string) =>
    workspace.subjects.find((subject) => subject.id === subjectId)?.name ?? uiText(2278);

  return (
    <main className="main-content student-space" id="main-content">
      <PageHeader showUpdates />
      <header className="view-heading view-heading--today">
        <div>
          <span className="section-label">
            {uiText(1542)} {formatLongDate(now)}
          </span>
          <h1>{uiText(114)}</h1>
          <p>{uiText(1543)}</p>
          <div className="today-hero-actions">
            <button
              className="today-hero-primary"
              type="button"
              onClick={() => onNavigate("learn")}
            >
              <NavigationIcon name="learn" paperVariant="claro" /> {uiText(1544)}
            </button>
            <button type="button" onClick={() => onNavigate("planner")}>
              {uiText(1545)} <PaperArrow />
            </button>
          </div>
        </div>
      </header>

      <nav className="student-space-shortcuts" aria-label={uiText("Seu próximo destino")}>
        {(
          [
            ["learn", "learn", uiText("Explorar as ilhas"), uiText("Uma descoberta de cada vez")],
            ["notes", "notes", uiText("Meus cadernos"), uiText("Suas ideias ganham espaço")],
            ["focus", "focus", uiText("Hora de focar"), uiText("Reserve um tempo para você")],
            ["planner", "planner", uiText("Minha agenda"), uiText("Organize seus próximos passos")],
          ] as const
        ).map(([view, icon, title, hint]) => (
          <button
            type="button"
            key={view}
            className={`student-destination student-destination--${view}`}
            onClick={() => onNavigate(view)}
          >
            <NavigationIcon name={icon} />
            <span>
              <strong>{title}</strong>
              <small>{hint}</small>
            </span>
            <PaperArrow />
          </button>
        ))}
      </nav>

      <section className="metric-row" aria-label={uiText(1546)}>
        <article>
          <NavigationIcon name="planner" />
          <span>{uiText(1547)}</span>
          <strong>{pendingTasks.length}</strong>
          <small>{uiText(1548)}</small>
        </article>
        <article>
          <NavigationIcon name="focus" />
          <span>{uiText(99)}</span>
          <strong>{focusMinutes}</strong>
          <small>{uiText(1549)}</small>
        </article>
        <article>
          <NavigationIcon name="today" />
          <span>{uiText(1550)}</span>
          <strong>{todayEvents.length}</strong>
          <small>{uiText(1551)}</small>
        </article>
      </section>

      <section className="study-route" aria-labelledby="study-route-title">
        <span className="student-route-art" aria-hidden="true">
          <NavigationIcon name="learn" />
        </span>
        <div>
          <span className="section-label">{studyRoute.label}</span>
          <h2 id="study-route-title">{studyRoute.title}</h2>
          <p>{studyRoute.description}</p>
          <ol aria-label={uiText(1552)}>
            {studyRoute.steps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <button type="button" onClick={() => onNavigate(studyRoute.view)}>
          {studyRoute.actionLabel} <PaperArrow />
        </button>
      </section>

      <div className="dashboard-grid">
        <section className="module-panel module-panel--wide" aria-labelledby="tasks-today-title">
          <div className="module-heading">
            <div>
              <span className="section-label">{uiText(1553)}</span>
              <h2 id="tasks-today-title">
                <NavigationIcon name="planner" /> {uiText(1554)}
              </h2>
            </div>
            <button className="link-button" type="button" onClick={() => onNavigate("planner")}>
              {uiText(1555)} <PaperArrow />
            </button>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="empty-state">
              <p>{uiText(1556)}</p>
              <button type="button" onClick={() => onNavigate("planner")}>
                {uiText(1557)}
              </button>
            </div>
          ) : (
            <ul className="check-list">
              {pendingTasks.slice(0, 4).map((task) => (
                <li key={task.id}>
                  <button
                    className="check-button"
                    type="button"
                    aria-label={uiText(2045, [task.title])}
                    onClick={() => dispatch({ type: "task/toggled", id: task.id })}
                  >
                    <PaperCheckIcon />
                  </button>
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {subjectName(task.subjectId)} ·{" "}
                      {task.dueDate === today ? uiText(87) : task.dueDate}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="module-panel" aria-labelledby="agenda-today-title">
          <div className="module-heading">
            <div>
              <span className="section-label">{uiText(1550)}</span>
              <h2 id="agenda-today-title">
                <NavigationIcon name="today" /> {uiText(87)}
              </h2>
            </div>
          </div>
          {todayEvents.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>{uiText(1558)}</p>
              <button type="button" onClick={() => onNavigate("planner")}>
                {uiText(1559)}
              </button>
            </div>
          ) : (
            <ul className="schedule-list">
              {todayEvents.map((event) => (
                <li key={`${event.id}:${event.displayOccurrence}`}>
                  <time>{event.allDay ? uiText(29) : event.time}</time>
                  <div>
                    <strong>{event.title}</strong>
                    <small>{subjectName(event.subjectId)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
