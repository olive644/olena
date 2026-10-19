import { uiText, useLanguage } from "../i18n/runtime";
import type { Dispatch } from "react";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { minutesFocusedOn, type WorkspaceAction, type WorkspaceState } from "../domain/workspace";
import type { AppView } from "../components/app-navigation";
import { PageHeader } from "../components/app-navigation";
import { StudentMetricIcon } from "../components/student-metric-icon";
import { PaperArrow } from "../components/paper-arrow";
import { MathPracticeHero } from "../components/math-practice-hero";
import { PaperDigits } from "../components/paper-digits";
import { StudentDestinations } from "../components/student-destinations";
import { agendaSubjectName, agendaItemColor } from "../domain/agenda-subjects";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useWallClock } from "../hooks/use-wall-clock";
import { AgendaToolbarIcon } from "../components/agenda-toolbar-icon";
import { displayEventsOn, zonedDateTime } from "../domain/agenda-calendar";
import "./today-view.css";
import "../components/student-space-details.css";

type TodayViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onNavigate: (view: AppView) => void;
};

export function TodayView({ workspace, dispatch, onNavigate }: TodayViewProps) {
  useLanguage();

  const now = useWallClock();
  const timeZone = agendaTimeZone();
  const today = zonedDateTime(now, timeZone).date;
  const pendingTasks = workspace.tasks.filter((task) => !task.completed);
  const todayEvents = displayEventsOn(workspace.events, today, timeZone);
  const focusMinutes = minutesFocusedOn(workspace, today);
  const subjectName = (subjectId: string) => agendaSubjectName(workspace, subjectId);

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

      <StudentDestinations workspace={workspace} onNavigate={onNavigate} />

      <section className="metric-row" aria-label={uiText(1546)}>
        <article>
          <StudentMetricIcon name="pending" />
          <span>{uiText(1547)}</span>
          <strong>
            <PaperDigits value={String(pendingTasks.length)} />
          </strong>
          <small>{uiText(1548)}</small>
        </article>
        <article>
          <StudentMetricIcon name="focus" />
          <span>{uiText(99)}</span>
          <strong>
            <PaperDigits value={String(focusMinutes)} />
          </strong>
          <small>{uiText(1549)}</small>
        </article>
        <article>
          <StudentMetricIcon name="agenda" />
          <span>{uiText(1550)}</span>
          <strong>
            <PaperDigits value={String(todayEvents.length)} />
          </strong>
          <small>{uiText(1551)}</small>
        </article>
      </section>

      {(pendingTasks.length > 0 || todayEvents.length > 0) && (
        <div className="dashboard-grid student-data-panels">
          {pendingTasks.length > 0 && (
            <section
              className="module-panel module-panel--wide"
              aria-labelledby="tasks-today-title"
            >
              <div className="module-heading">
                <div>
                  <span className="section-label">{uiText(1553)}</span>
                  <h2 id="tasks-today-title">
                    <AgendaToolbarIcon name="list" /> {uiText(1554)}
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
                    <li
                      key={task.id}
                      style={{ borderInlineStart: `4px solid ${agendaItemColor(task)}` }}
                    >
                      <button
                        className="check-button"
                        type="button"
                        aria-pressed={task.completed}
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
          )}

          {todayEvents.length > 0 && (
            <section
              className="module-panel student-agenda-panel"
              aria-labelledby="agenda-today-title"
            >
              <button
                className="student-agenda-open"
                type="button"
                aria-label={uiText("Ver agenda")}
                onClick={() => onNavigate("planner")}
              />
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
                </div>
              ) : (
                <ul className="schedule-list">
                  {todayEvents.map((event) => (
                    <li
                      key={`${event.id}:${event.displayOccurrence}`}
                      style={{ borderInlineStart: `4px solid ${agendaItemColor(event)}` }}
                    >
                      <time>{event.allDay ? uiText(29) : <PaperDigits value={event.time} />}</time>
                      <div>
                        <strong>{event.title}</strong>
                        <small>
                          {subjectName(event.subjectId)} ·{" "}
                          {uiText(event.kind === "study" ? "Estudo" : "Compromisso")}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
