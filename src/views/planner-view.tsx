import { lazy, Suspense, useState, type Dispatch, type FormEvent } from "react";
import { HelenaLoading } from "../components/helena-loading";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { PageHeader } from "../components/app-navigation";
import { PaperActionIcon } from "../components/paper-action-icon";
import { toDateKey, type WorkspaceAction, type WorkspaceState } from "../domain/workspace";

const HomeworkSection = lazy(() =>
  import("./homework-section").then((module) => ({ default: module.HomeworkSection })),
);
const GoogleCalendarPanel = lazy(() =>
  import("./google-calendar-panel").then((module) => ({ default: module.GoogleCalendarPanel })),
);

type PlannerViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

function subjectIcon(name: string): "flag-us" | "flag-br" | "flag-es" | "book" {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("ingles")) return "flag-us";
  if (normalized.includes("portugues")) return "flag-br";
  if (normalized.includes("espanhol")) return "flag-es";
  return "book";
}

export function PlannerView({ workspace, dispatch }: PlannerViewProps) {
  const today = toDateKey(new Date());
  const defaultSubject = workspace.subjects[0];
  const [subjectName, setSubjectName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(today);
  const [taskSubjectId, setTaskSubjectId] = useState(defaultSubject?.id ?? "");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [eventTime, setEventTime] = useState("18:00");
  const [eventSubjectId, setEventSubjectId] = useState(defaultSubject?.id ?? "");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalMinutes, setGoalMinutes] = useState(300);
  const [goalDeadline, setGoalDeadline] = useState(today);

  if (!defaultSubject) return null;

  function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = subjectName.trim();
    if (!name) return;
    const colors = ["#cf5f4b", "#247a73", "#a07319", "#4568a8"];
    const color = colors[workspace.subjects.length % colors.length] ?? "#7257e8";
    dispatch({ type: "subject/added", name, color });
    setSubjectName("");
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    dispatch({ type: "task/added", title, subjectId: taskSubjectId, dueDate: taskDate });
    setTaskTitle("");
  }

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = eventTitle.trim();
    if (!title) return;
    dispatch({
      type: "event/added",
      title,
      subjectId: eventSubjectId,
      date: eventDate,
      time: eventTime,
    });
    setEventTitle("");
  }

  function addFocusGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalTitle.trim();
    if (!title) return;
    dispatch({
      type: "goal/added",
      subjectId: defaultSubject?.id ?? "",
      title,
      targetMinutes: goalMinutes,
      deadline: goalDeadline,
    });
    setGoalTitle("");
  }

  const orderedTasks = [...workspace.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const orderedEvents = [...workspace.events].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );

  return (
    <main className="main-content" id="main-content">
      <PageHeader />
      <header className="view-heading">
        <span className="section-label">Agenda</span>
        <h1>Planeje sem complicar.</h1>
        <p>Organize tarefas e compromissos por data.</p>
      </header>

      <div className="planner-grid">
        <section className="module-panel" aria-labelledby="new-subject-title">
          <div className="module-heading">
            <h2 id="new-subject-title">Matérias</h2>
            <span>{workspace.subjects.length}</span>
          </div>
          <ul className="subject-list">
            {workspace.subjects.map((item) => (
              <li key={item.id}>
                <PaperActionIcon name={subjectIcon(item.name)} />
                {item.name}
              </li>
            ))}
          </ul>
          <form className="inline-form" onSubmit={addSubject}>
            <label className="field">
              <span>Nova matéria</span>
              <input
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="Ex.: Matemática"
                required
              />
            </label>
            <button className="icon-button" type="submit" aria-label="Adicionar matéria">
              <PaperActionIcon name="plus" />
            </button>
          </form>
        </section>

        <section className="module-panel" aria-labelledby="new-task-title">
          <div className="module-heading">
            <h2 id="new-task-title">Nova tarefa</h2>
          </div>
          <form className="compact-form" onSubmit={addTask}>
            <label className="field">
              <span>O que precisa ser feito?</span>
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Ex.: Revisar vocabulário"
                required
              />
            </label>
            <label className="field">
              <span>Prazo</span>
              <input
                type="date"
                value={taskDate}
                onChange={(event) => setTaskDate(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Matéria</span>
              <select
                value={taskSubjectId}
                onChange={(event) => setTaskSubjectId(event.target.value)}
              >
                {workspace.subjects.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              <PaperActionIcon name="plus" /> <span>Adicionar tarefa</span>
            </button>
          </form>
        </section>

        <section className="module-panel" aria-labelledby="new-event-title">
          <div className="module-heading">
            <h2 id="new-event-title">Novo compromisso</h2>
          </div>
          <form className="compact-form" onSubmit={addEvent}>
            <label className="field field--full">
              <span>Título</span>
              <input
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="Ex.: Aula de conversação"
                required
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Data</span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Horário</span>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                  required
                />
              </label>
            </div>
            <label className="field">
              <span>Matéria</span>
              <select
                value={eventSubjectId}
                onChange={(event) => setEventSubjectId(event.target.value)}
              >
                {workspace.subjects.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-button" type="submit">
              <PaperActionIcon name="plus" /> <span>Adicionar compromisso</span>
            </button>
          </form>
        </section>
      </div>

      <div className="learn-grid focus-goals">
        <section className="module-panel" aria-labelledby="new-goal-title">
          <div className="module-heading">
            <h2 id="new-goal-title">Nova meta de foco</h2>
          </div>
          <form className="compact-form" onSubmit={addFocusGoal}>
            <label className="field">
              <span>Objetivo</span>
              <input
                value={goalTitle}
                onChange={(event) => setGoalTitle(event.target.value)}
                placeholder="Ex.: Preparar prova final"
                required
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Meta em minutos</span>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={goalMinutes}
                  onChange={(event) => setGoalMinutes(Number(event.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Prazo</span>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(event) => setGoalDeadline(event.target.value)}
                  required
                />
              </label>
            </div>
            <button className="secondary-button" type="submit">
              <PaperActionIcon name="plus" /> Criar meta
            </button>
          </form>
        </section>
        <section className="module-panel goals-panel" aria-labelledby="goal-list-title">
          <div className="module-heading">
            <h2 id="goal-list-title">Metas de foco</h2>
            <span>
              {workspace.focusSessions.reduce((sum, session) => sum + session.durationMinutes, 0)}{" "}
              min registrados
            </span>
          </div>
          {workspace.goals.length === 0 ? (
            <div className="empty-state">
              <p>Crie uma meta para acompanhar seu tempo de foco.</p>
            </div>
          ) : (
            <ul className="goal-list">
              {workspace.goals.map((goal) => (
                <li className={goal.completed ? "is-complete" : undefined} key={goal.id}>
                  <button
                    type="button"
                    aria-label={`${goal.completed ? "Reabrir" : "Concluir"} ${goal.title}`}
                    onClick={() => dispatch({ type: "goal/toggled", id: goal.id })}
                  >
                    <PaperCheckIcon />
                  </button>
                  <div>
                    <strong>{goal.title}</strong>
                    <small>
                      Meta de {goal.targetMinutes} min · até {goal.deadline}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="planner-grid planner-grid--lists">
        <section className="module-panel" aria-labelledby="task-list-title">
          <div className="module-heading">
            <h2 id="task-list-title">Tarefas</h2>
            <span>{workspace.tasks.length}</span>
          </div>
          {orderedTasks.length === 0 ? (
            <div className="empty-state">
              <p>As tarefas adicionadas aparecerão aqui.</p>
            </div>
          ) : (
            <ul className="check-list">
              {orderedTasks.map((task) => (
                <li className={task.completed ? "is-complete" : undefined} key={task.id}>
                  <button
                    className="check-button"
                    type="button"
                    aria-label={`${task.completed ? "Reabrir" : "Concluir"} ${task.title}`}
                    onClick={() => dispatch({ type: "task/toggled", id: task.id })}
                  >
                    <PaperCheckIcon />
                  </button>
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.dueDate}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="module-panel" aria-labelledby="event-list-title">
          <div className="module-heading">
            <h2 id="event-list-title">Compromissos</h2>
            <span>{workspace.events.length}</span>
          </div>
          {orderedEvents.length === 0 ? (
            <div className="empty-state">
              <p>Os compromissos adicionados aparecerão aqui.</p>
            </div>
          ) : (
            <ul className="schedule-list schedule-list--dated">
              {orderedEvents.map((event) => (
                <li key={event.id}>
                  <time>{event.time}</time>
                  <div>
                    <strong>{event.title}</strong>
                    <small>{event.date}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Suspense fallback={<HelenaLoading label="Carregando Google Agenda…" compact />}>
        <GoogleCalendarPanel />
      </Suspense>

      <Suspense fallback={<HelenaLoading label="Carregando tarefas…" compact />}>
        <HomeworkSection workspace={workspace} dispatch={dispatch} />
      </Suspense>
    </main>
  );
}
