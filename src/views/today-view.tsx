import { uiText, useLanguage } from "../i18n/runtime";
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
import { MathPracticeHero } from "../components/math-practice-hero";
import { PaperDigits } from "../components/paper-digits";
import { PaperFlower } from "../components/agenda-focus-week";
import { AgendaToolbarIcon } from "../components/agenda-toolbar-icon";
import { displayEventsOn } from "../domain/agenda-calendar";
import "./today-view.css";

type TodayViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onNavigate: (view: AppView) => void;
};

export function TodayView({ workspace, dispatch, onNavigate }: TodayViewProps) {
  useLanguage();

  const now = new Date();
  const today = toDateKey(now);
  const pendingTasks = workspace.tasks.filter((task) => !task.completed);
  const todayEvents = displayEventsOn(workspace.events, today);
  const focusMinutes = minutesFocusedOn(workspace, today);
  const subjectName = (subjectId: string) =>
    workspace.subjects.find((subject) => subject.id === subjectId)?.name ?? uiText(2278);

  return (
    <main className="main-content student-space" id="main-content">
      <PageHeader showUpdates />
      <MathPracticeHero
        workspace={workspace}
        onPractice={() => {
          try {
            sessionStorage.setItem("olena:enter-mathematics", "1");
          } catch {
            /* O hub continua acessível sem armazenamento. */
          }
          onNavigate("learn");
        }}
      />

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
            {view === "focus" ? (
              <span className="student-focus-icons" aria-hidden="true">
                <PaperFlower active />
                <i className="streak-tomato is-active" />
              </span>
            ) : view === "planner" ? (
              <AgendaToolbarIcon name="month" />
            ) : (
              <NavigationIcon name={icon} />
            )}
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
          <strong>
            <PaperDigits value={String(pendingTasks.length)} />
          </strong>
          <small>{uiText(1548)}</small>
        </article>
        <article>
          <NavigationIcon name="focus" />
          <span>{uiText(99)}</span>
          <strong>
            <PaperDigits value={String(focusMinutes)} />
          </strong>
          <small>{uiText(1549)}</small>
        </article>
        <article>
          <AgendaToolbarIcon name="month" />
          <span>{uiText(1550)}</span>
          <strong>
            <PaperDigits value={String(todayEvents.length)} />
          </strong>
          <small>{uiText(1551)}</small>
        </article>
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
                <AgendaToolbarIcon name="month" /> {uiText(87)}
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
