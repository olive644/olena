import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
} from "react";
import { PageHeader, type AppView } from "../components/app-navigation";
import { HelenaLoading } from "../components/helena-loading";
import { PaperActionIcon } from "../components/paper-action-icon";
import { PaperArrow } from "../components/paper-arrow";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { AgendaCloseIcon } from "../components/agenda-close-icon";
import { NavigationIcon } from "../components/navigation-icon";
import { AgendaMonthPicker } from "../components/agenda-month-picker";
import { AgendaStudyHistory } from "../components/agenda-study-history";
import { focusHistory, orderedRange, type AgendaRange } from "../domain/agenda-history";
import {
  agendaPrompt,
  dateForKey,
  eventsOn,
  HELENA_PLAN_DRAFT_EVENT,
  monthDates,
  shiftDate,
} from "../domain/agenda";
import { FOCUS_SESSION_KEY, readFocusSession, type FocusSession } from "../domain/focus-session";
import {
  toDateKey,
  type StudyEvent,
  type StudyTask,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import "./planner-view.css";

const GoogleCalendarPanel = lazy(() =>
  import("./google-calendar-panel").then((module) => ({ default: module.GoogleCalendarPanel })),
);
const HomeworkSection = lazy(() =>
  import("./homework-section").then((module) => ({ default: module.HomeworkSection })),
);
type Kind = "task" | "appointment" | "study" | "subject" | "goal";
type Draft = {
  kind: Kind;
  id?: string;
  title: string;
  date: string;
  time: string;
  subjectId: string;
  minutes: number;
  recurrence: "none" | "weekly";
  until: string;
};
type Props = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onNavigate?: (view: AppView) => void;
};
const labels: Record<Kind, string> = {
  task: "Tarefa",
  appointment: "Compromisso",
  study: "Sessão de estudo",
  subject: "Matéria",
  goal: "Meta de foco",
};
function dayLabel(date: string, long = false) {
  return dateForKey(date).toLocaleDateString(
    "pt-BR",
    long
      ? { weekday: "long", day: "numeric", month: "long" }
      : { weekday: "short", day: "numeric" },
  );
}

export function PlannerView({ workspace, dispatch, onNavigate }: Props) {
  const [now, setNow] = useState(() => new Date());
  const today = toDateKey(now);
  const [selected, setSelected] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [range, setRange] = useState<AgendaRange | null>(null);
  const [intervalMode, setIntervalMode] = useState(false);
  const [intervalStart, setIntervalStart] = useState<string | null>(null);
  const drag = useRef<{
    pointer: number;
    start: string;
    end: string;
    previous: AgendaRange | null;
  } | null>(null);
  const suppressClick = useRef(false);
  const history = useMemo(() => focusHistory(workspace.focusSessions), [workspace.focusSessions]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (draft) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      addButton.current?.focus();
    }
  }, [draft]);
  const month = monthDates(selected);
  const monthRange = {
    start: `${selected.slice(0, 7)}-01`,
    end: month.filter((date) => date.slice(0, 7) === selected.slice(0, 7)).at(-1)!,
  };
  const dates = month.slice(35).some((date) => date.slice(0, 7) === selected.slice(0, 7))
    ? month
    : month.slice(0, 35);
  const pending = workspace.tasks.filter((task) => !task.completed && task.dueDate < today);
  const scheduled = eventsOn(workspace, selected);
  const tasks = workspace.tasks.filter((task) => task.dueDate === selected);
  const subjectName = (id: string) =>
    workspace.subjects.find((subject) => subject.id === id)?.name ?? "Sem matéria";
  function resetDate(date: string) {
    setSelected(date);
    setRange(null);
    setIntervalStart(null);
    setIntervalMode(false);
  }
  function chooseDate(date: string, extend = false) {
    if (extend) setRange(orderedRange(range?.start ?? selected, date));
    else if (intervalMode) {
      if (intervalStart) {
        setRange(orderedRange(intervalStart, date));
        setIntervalMode(false);
        setIntervalStart(null);
      } else {
        setIntervalStart(date);
        setRange(orderedRange(date, date));
      }
    } else setRange(null);
    setSelected(date);
  }
  function create(kind: Kind = "task") {
    setDraft({
      kind,
      title: "",
      date: selected,
      time: "18:00",
      subjectId: workspace.subjects[0]?.id ?? "",
      minutes: kind === "goal" ? 300 : 25,
      recurrence: "none",
      until: "",
    });
  }
  function edit(item: StudyEvent | StudyTask) {
    setDraft(
      "dueDate" in item
        ? {
            kind: "task",
            id: item.id,
            title: item.title,
            date: item.dueDate,
            time: "18:00",
            subjectId: item.subjectId,
            minutes: 25,
            recurrence: "none",
            until: "",
          }
        : {
            kind: item.kind ?? "appointment",
            id: item.id,
            title: item.title,
            date: item.date,
            time: item.time,
            subjectId: item.subjectId,
            minutes: item.durationMinutes ?? 25,
            recurrence: item.recurrence ?? "none",
            until: item.recurrenceUntil ?? "",
          },
    );
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;
    const title = draft.title.trim();
    if (draft.kind === "subject")
      dispatch({ type: "subject/added", name: title, color: "#7c3aed" });
    else if (draft.kind === "goal")
      dispatch({
        type: "goal/added",
        title,
        subjectId: draft.subjectId,
        targetMinutes: draft.minutes,
        deadline: draft.date,
      });
    else if (draft.kind === "task") {
      const changes = { title, subjectId: draft.subjectId, dueDate: draft.date };
      dispatch(
        draft.id
          ? { type: "task/updated", id: draft.id, changes }
          : { type: "task/added", ...changes },
      );
    } else {
      const changes = {
        title,
        subjectId: draft.subjectId,
        date: draft.date,
        time: draft.time,
        kind: draft.kind,
        durationMinutes: draft.minutes,
        recurrence: draft.recurrence,
        recurrenceUntil: draft.until,
      };
      dispatch(
        draft.id
          ? { type: "event/updated", id: draft.id, changes }
          : { type: "event/added", ...changes },
      );
    }
    setNotice(draft.id ? "Alteração salva." : "Adicionado à sua agenda.");
    setDraft(null);
  }
  function startStudy(event: StudyEvent, date: string, timestamp: number) {
    const active = readFocusSession(localStorage.getItem(FOCUS_SESSION_KEY), timestamp);
    if (
      active?.running ||
      (active?.elapsedMilliseconds ?? 0) > 0 ||
      (active && active.secondsRemaining < active.duration * 60)
    ) {
      setNotice(
        "Você já tem uma sessão em andamento. Encerre ou registre no Foco antes de começar outra.",
      );
      return;
    }
    const session: FocusSession = {
      mode: "timer",
      phase: "focus",
      completed: 0,
      duration: workspace.focusPreferences.pomodoroMinutes,
      secondsRemaining: workspace.focusPreferences.pomodoroMinutes * 60,
      elapsedMilliseconds: 0,
      running: false,
      timerStartedAt: null,
      pomodoroDeadline: null,
      savedAt: timestamp,
      agendaEventId: event.id,
      agendaDate: date,
      subjectId: event.subjectId,
      plannedMinutes: event.durationMinutes ?? 25,
    };
    try {
      localStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
      onNavigate?.("focus");
    } catch {
      setNotice(
        "Não foi possível preparar o estudo. Libere espaço no dispositivo e tente novamente.",
      );
    }
  }
  function taskCard(task: StudyTask) {
    return (
      <article
        className={`agenda-item agenda-item--task${task.completed ? " is-complete" : ""}`}
        key={task.id}
      >
        <button
          type="button"
          className="agenda-check"
          aria-label={`${task.completed ? "Reabrir" : "Concluir"} ${task.title}`}
          aria-pressed={task.completed}
          onClick={() => dispatch({ type: "task/toggled", id: task.id })}
        >
          <PaperCheckIcon />
        </button>
        <div className="agenda-item-copy">
          <strong>{task.title}</strong>
          <small>{subjectName(task.subjectId)} · Sem horário</small>
        </div>
        <button
          type="button"
          className="text-button"
          aria-label={`Editar ${task.title}`}
          onClick={() => edit(task)}
        >
          Editar
        </button>
      </article>
    );
  }
  function eventCard(event: StudyEvent, date = selected) {
    const complete = event.completedDates?.includes(date) ?? false;
    const recorded = workspace.focusSessions
      .filter(
        (session) =>
          session.agendaEventId === event.id &&
          session.agendaDate === date &&
          session.subjectId === event.subjectId,
      )
      .reduce((sum, session) => sum + session.durationMinutes, 0);
    const minutesAway = Math.round(
      (new Date(`${date}T${event.time}`).getTime() - now.getTime()) / 60_000,
    );
    const reminder = date === today && !complete && minutesAway >= 0 && minutesAway <= 15;
    return (
      <article
        className={`agenda-item agenda-item--timed${event.kind === "study" ? " agenda-item--study" : ""}${complete ? " is-complete" : ""}${reminder ? " is-due" : ""}`}
        key={`${event.id}:${date}`}
      >
        <time>{event.time}</time>
        <div className="agenda-item-copy">
          <strong>{event.title}</strong>
          <small>
            {subjectName(event.subjectId)} ·{" "}
            {event.kind === "study"
              ? `${event.durationMinutes ?? 25} min de estudo`
              : "Compromisso"}
            {event.recurrence === "weekly" ? " · Semanal" : ""}
          </small>
          {reminder && (
            <span className="agenda-reminder">
              {minutesAway === 0 ? "Está na hora" : `Começa em ${minutesAway} min`}
            </span>
          )}
          {complete && <small>Concluído</small>}
          {event.kind === "study" && recorded > 0 && (
            <small>
              {recorded}/{event.durationMinutes ?? 25} min registrados
            </small>
          )}
        </div>
        <div className="agenda-item-actions">
          {event.kind === "study" && !complete && (
            <button
              type="button"
              className="primary-button"
              aria-label={`Começar estudo ${event.title}`}
              onClick={() => startStudy(event, date, Date.now())}
            >
              Começar <PaperArrow />
            </button>
          )}
          <button
            type="button"
            className="text-button"
            aria-label={`Editar ${event.title}`}
            onClick={() => edit(event)}
          >
            Editar
          </button>
          {event.kind !== "study" && (
            <button
              type="button"
              className="agenda-check"
              aria-label={`${complete ? "Reabrir" : "Concluir"} ${event.title}`}
              aria-pressed={complete}
              onClick={() => dispatch({ type: "event/toggled", id: event.id, date })}
            >
              <PaperCheckIcon />
            </button>
          )}
        </div>
      </article>
    );
  }
  return (
    <main className="main-content agenda-page" id="main-content">
      <PageHeader />
      <header className="agenda-heading">
        <h1 className="agenda-accessible-title">Minha agenda</h1>
        <button
          type="button"
          className={
            calendarOpen
              ? "primary-button agenda-calendar-toggle"
              : "secondary-button agenda-calendar-toggle"
          }
          aria-label="Calendário"
          aria-expanded={calendarOpen}
          aria-controls="agenda-calendar"
          onClick={() => setCalendarOpen((open) => !open)}
        >
          <NavigationIcon
            name="planner"
            {...(calendarOpen ? { paperVariant: "escuro" as const } : {})}
          />
        </button>
        <button ref={addButton} type="button" className="primary-button" onClick={() => create()}>
          <PaperActionIcon name="plus" /> Adicionar
        </button>
      </header>
      <p className="agenda-notice" role="status">
        {notice}
      </p>
      {calendarOpen && (
        <section
          id="agenda-calendar"
          className="agenda-month module-panel"
          aria-label="Calendário mensal"
        >
          <div className="agenda-calendar-controls">
            <AgendaMonthPicker value={selected} today={today} onChange={resetDate} />
            <button type="button" className="secondary-button" onClick={() => resetDate(today)}>
              Ir para hoje
            </button>
          </div>
          <div className="agenda-range-tools">
            <button
              type="button"
              className={intervalMode ? "primary-button" : "secondary-button"}
              aria-pressed={intervalMode}
              onClick={() => {
                setIntervalMode(!intervalMode);
                setIntervalStart(null);
              }}
            >
              {intervalMode
                ? intervalStart
                  ? "Escolher fim"
                  : "Escolher início"
                : "Selecionar intervalo"}
            </button>
            {range && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setRange(null);
                  setIntervalStart(null);
                  setIntervalMode(false);
                }}
              >
                Limpar intervalo
              </button>
            )}
            <small id="agenda-range-hint">Arraste pelos dias ou escolha início e fim.</small>
          </div>
          <div className="agenda-weekdays">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          <div
            className="agenda-month-grid"
            aria-describedby="agenda-range-hint"
            onPointerDown={(event) => {
              if (!drag.current) suppressClick.current = false;
              if (
                event.button !== 0 ||
                !event.isPrimary ||
                intervalMode ||
                event.shiftKey ||
                drag.current
              )
                return;
              const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
                "button[data-date]",
              );
              const date = button?.dataset["date"];
              if (!date) return;
              event.preventDefault();
              button.focus();
              suppressClick.current = false;
              drag.current = { pointer: event.pointerId, start: date, end: date, previous: range };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const active = drag.current;
              if (!active || active.pointer !== event.pointerId) return;
              const button = document
                .elementFromPoint(event.clientX, event.clientY)
                ?.closest<HTMLButtonElement>("button[data-date]");
              const date = button?.dataset["date"];
              if (!date || !event.currentTarget.contains(button)) return;
              active.end = date;
              setRange(orderedRange(active.start, active.end));
            }}
            onPointerUp={(event) => {
              const active = drag.current;
              if (!active || active.pointer !== event.pointerId) return;
              drag.current = null;
              suppressClick.current = true;
              window.setTimeout(() => {
                suppressClick.current = false;
              }, 0);
              setSelected(active.end);
              setRange(active.start === active.end ? null : orderedRange(active.start, active.end));
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              if (drag.current) setRange(drag.current.previous);
              drag.current = null;
              suppressClick.current = true;
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              if (drag.current) {
                const active = drag.current;
                drag.current = null;
                suppressClick.current = true;
                setRange(active.previous);
                event.currentTarget.releasePointerCapture(active.pointer);
              }
              setIntervalMode(false);
              setIntervalStart(null);
            }}
            onLostPointerCapture={() => {
              if (drag.current) {
                setRange(drag.current.previous);
                suppressClick.current = true;
              }
              drag.current = null;
            }}
          >
            {dates.map((date) => {
              const count =
                eventsOn(workspace, date).length +
                workspace.tasks.filter((task) => task.dueDate === date && !task.completed).length;
              const minutes = history.get(date)?.minutes ?? 0;
              const inRange = range && date >= range.start && date <= range.end;
              return (
                <button
                  type="button"
                  key={date}
                  data-date={date}
                  className={`${date.slice(0, 7) !== selected.slice(0, 7) ? "is-outside " : ""}${date === today ? "is-today " : ""}${date === selected ? "is-selected " : ""}${inRange ? "is-in-range " : ""}${minutes > 0 ? "has-study " : ""}${history.has(shiftDate(date, -1)) ? "study-continues-left " : ""}${history.has(shiftDate(date, 1)) ? "study-continues-right" : ""}`}
                  aria-label={`${dayLabel(date, true)}, ${count} itens${minutes > 0 ? `, ${minutes} min de foco` : ""}`}
                  aria-pressed={date === selected}
                  aria-current={date === today ? "date" : undefined}
                  onClick={(event) => {
                    if (suppressClick.current && event.detail > 0) {
                      suppressClick.current = false;
                      return;
                    }
                    suppressClick.current = false;
                    chooseDate(date, event.shiftKey);
                  }}
                >
                  <span>{dateForKey(date).getDate()}</span>
                  {minutes > 0 && <i className="agenda-study-ribbon" aria-hidden="true" />}
                  {count > 0 && (
                    <small>
                      {count}
                      <span className="agenda-count-desktop">
                        {" "}
                        {count === 1 ? "item" : "itens"}
                      </span>
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
      {calendarOpen && (
        <AgendaStudyHistory
          history={history}
          selected={selected}
          workspace={workspace}
          range={range ?? monthRange}
        />
      )}
      <div className="agenda-layout">
        <div>
          <section className="module-panel agenda-day" aria-labelledby="agenda-day-title">
            <div className="module-heading">
              <h2 id="agenda-day-title">{dayLabel(selected, true)}</h2>
              <span>{scheduled.length + tasks.length} itens</span>
            </div>
            {scheduled.length > 0 && (
              <>
                <h3 className="agenda-section-title">Com horário</h3>
                {scheduled.map((event) => eventCard(event))}
              </>
            )}
            {tasks.length > 0 && (
              <>
                <h3 className="agenda-section-title">No seu ritmo</h3>
                {tasks.map(taskCard)}
              </>
            )}
            {scheduled.length + tasks.length === 0 && (
              <div className="agenda-empty">
                <NavigationIcon name="planner" />
                <h3>Seu dia ainda está livre.</h3>
                <p>Reserve um estudo curto ou anote o que precisa fazer.</p>
                <button type="button" className="secondary-button" onClick={() => create("study")}>
                  Planejar estudo <PaperArrow />
                </button>
              </div>
            )}
          </section>
          <details className="agenda-extra">
            <summary>Google Agenda e tarefas de aula</summary>
            <Suspense
              fallback={<HelenaLoading label="Carregando ferramentas da agenda…" compact />}
            >
              <GoogleCalendarPanel />
              <HomeworkSection workspace={workspace} dispatch={dispatch} />
            </Suspense>
          </details>
        </div>
        <aside className="agenda-aside">
          <section className="module-panel">
            <h2>Retomar com calma</h2>
            {pending.length === 0 ? (
              <p>Nenhuma tarefa atrasada. Você pode cuidar do próximo passo.</p>
            ) : (
              pending.map((task) => (
                <article className="agenda-pending" key={task.id}>
                  <strong>{task.title}</strong>
                  <small>Prazo: {dateForKey(task.dueDate).toLocaleDateString("pt-BR")}</small>
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Mover ${task.title} para hoje`}
                    onClick={() => {
                      dispatch({
                        type: "task/updated",
                        id: task.id,
                        changes: { title: task.title, subjectId: task.subjectId, dueDate: today },
                      });
                      setNotice("Tarefa movida para hoje.");
                    }}
                  >
                    Mover para hoje <PaperArrow />
                  </button>
                </article>
              ))
            )}
          </section>
          <section className="module-panel agenda-helena">
            <NavigationIcon name="planner" />
            <h2>Uma semana possível</h2>
            <p>Peça sugestões à Helena. Você decide o que entra na agenda.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(HELENA_PLAN_DRAFT_EVENT, {
                    detail: agendaPrompt(workspace, selected),
                  }),
                )
              }
            >
              Planejar com Helena <PaperArrow />
            </button>
            <small>O pedido abre no chat para você revisar antes de enviar.</small>
          </section>
          <details className="module-panel agenda-extra">
            <summary>Matérias e metas</summary>
            <ul className="agenda-subjects">
              {workspace.subjects.map((subject) => (
                <li key={subject.id}>{subject.name}</li>
              ))}
            </ul>
            <button type="button" className="secondary-button" onClick={() => create("subject")}>
              Adicionar matéria
            </button>
            {workspace.goals.map((goal) => (
              <article className="agenda-pending" key={goal.id}>
                <strong>{goal.title}</strong>
                <small>
                  {goal.targetMinutes} min · até{" "}
                  {dateForKey(goal.deadline).toLocaleDateString("pt-BR")}
                </small>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => dispatch({ type: "goal/toggled", id: goal.id })}
                >
                  {goal.completed ? "Reabrir meta" : "Concluir meta"}
                </button>
              </article>
            ))}
            <button type="button" className="secondary-button" onClick={() => create("goal")}>
              Criar meta de foco
            </button>
          </details>
        </aside>
      </div>
      <dialog
        ref={dialog}
        className="agenda-dialog"
        aria-labelledby="agenda-dialog-title"
        onCancel={() => setDraft(null)}
      >
        {draft && (
          <>
            <header>
              <h2 id="agenda-dialog-title">{draft.id ? "Editar" : "Adicionar à agenda"}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar formulário"
                onClick={() => setDraft(null)}
              >
                <AgendaCloseIcon />
              </button>
            </header>
            <form onSubmit={save} className="compact-form">
              <label className="field">
                <span>Tipo</span>
                <select
                  aria-label="Tipo"
                  value={draft.kind}
                  disabled={Boolean(draft.id)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      kind: event.target.value as Kind,
                      minutes: event.target.value === "goal" ? 300 : 25,
                    })
                  }
                >
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{draft.kind === "subject" ? "Nome da matéria" : "Título"}</span>
                <input
                  autoFocus
                  value={draft.title}
                  maxLength={120}
                  required
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder={
                    draft.kind === "study" ? "Ex.: Revisar frações" : "O que você quer organizar?"
                  }
                />
              </label>
              {draft.kind !== "subject" && (
                <>
                  <label className="field">
                    <span>Matéria</span>
                    <select
                      aria-label="Matéria"
                      value={draft.subjectId}
                      required
                      onChange={(event) => setDraft({ ...draft, subjectId: event.target.value })}
                    >
                      {workspace.subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="field-row">
                    <label className="field">
                      <span>
                        {draft.kind === "task" || draft.kind === "goal" ? "Prazo" : "Data"}
                      </span>
                      <input
                        type="date"
                        required
                        value={draft.date}
                        onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                      />
                    </label>
                    {(draft.kind === "study" || draft.kind === "appointment") && (
                      <label className="field">
                        <span>Horário</span>
                        <input
                          type="time"
                          required
                          value={draft.time}
                          onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                        />
                      </label>
                    )}
                  </div>
                  {draft.kind !== "task" && (
                    <label className="field">
                      <span>
                        {draft.kind === "goal" ? "Meta em minutos" : "Duração em minutos"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={draft.kind === "goal" ? "10000" : "180"}
                        required
                        value={draft.minutes}
                        onChange={(event) =>
                          setDraft({ ...draft, minutes: Number(event.target.value) })
                        }
                      />
                    </label>
                  )}
                  {(draft.kind === "study" || draft.kind === "appointment") && (
                    <>
                      <label className="field">
                        <span>Repetir</span>
                        <select
                          aria-label="Repetir"
                          value={draft.recurrence}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              recurrence: event.target.value as Draft["recurrence"],
                            })
                          }
                        >
                          <option value="none">Não repetir</option>
                          <option value="weekly">Toda semana neste dia</option>
                        </select>
                      </label>
                      {draft.recurrence === "weekly" && (
                        <label className="field">
                          <span>Repetir até (opcional)</span>
                          <input
                            type="date"
                            min={draft.date}
                            value={draft.until}
                            onChange={(event) => setDraft({ ...draft, until: event.target.value })}
                          />
                        </label>
                      )}
                      {draft.id && draft.recurrence === "weekly" && (
                        <p>
                          Alterações valem para a rotina inteira. Os estudos já registrados
                          permanecem no histórico.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
              <footer>
                {draft.id && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Excluir ${draft.title}${draft.recurrence === "weekly" ? " e suas próximas repetições" : ""}?`,
                        )
                      )
                        return;
                      dispatch(
                        draft.kind === "task"
                          ? { type: "task/removed", id: draft.id! }
                          : { type: "event/removed", id: draft.id! },
                      );
                      setDraft(null);
                      setNotice("Item removido da agenda. O histórico de foco foi preservado.");
                    }}
                  >
                    Excluir
                  </button>
                )}
                <button className="primary-button" type="submit">
                  {draft.id ? "Salvar alterações" : "Adicionar"} <PaperArrow />
                </button>
              </footer>
            </form>
          </>
        )}
      </dialog>
    </main>
  );
}
