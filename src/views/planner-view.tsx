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
import { AgendaActionIcon } from "../components/agenda-action-icon";
import { PaperArrow } from "../components/paper-arrow";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { AgendaCloseIcon } from "../components/agenda-close-icon";
import { NavigationIcon } from "../components/navigation-icon";
import { AgendaMonthPicker } from "../components/agenda-month-picker";
import { AgendaStudyHistory } from "../components/agenda-study-history";
import { PaperDigits } from "../components/paper-digits";
import { PaperChoice, PaperDateField, PaperTimeField } from "../components/agenda-paper-fields";
import { agendaSubjects } from "../domain/agenda-subjects";
import { brazilianHoliday } from "../domain/brazilian-holidays";
import { focusHistory, orderedRange, type AgendaRange } from "../domain/agenda-history";
import {
  agendaPrompt,
  dateForKey,
  eventsOn,
  HELENA_PLAN_DRAFT_EVENT,
  monthDates,
  overdueTasks,
  shiftDate,
  weekDates,
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
function PaperCalendarText({ value }: { value: string }) {
  return value
    .split(/(\d[\d:]*)/)
    .map((part, index) => (/^\d/.test(part) ? <PaperDigits key={index} value={part} /> : part));
}

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
  const [dayOpen, setDayOpen] = useState(false);
  const daySheet = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const formTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (dayOpen) {
      daySheet.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      daySheet.current?.querySelector<HTMLHeadingElement>("h2")?.focus({ preventScroll: true });
    }
  }, [dayOpen, selected]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (draft) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      if (formTrigger.current?.isConnected) formTrigger.current.focus();
      else daySheet.current?.querySelector<HTMLHeadingElement>("h2")?.focus();
    }
  }, [draft]);
  const month = monthDates(selected);
  const dates = month.slice(35).some((date) => date.slice(0, 7) === selected.slice(0, 7))
    ? month
    : month.slice(0, 35);
  const pending = overdueTasks(workspace, today);
  const week = weekDates(selected).map((date) => ({
    date,
    items:
      eventsOn(workspace, date).filter((event) => !event.completedDates?.includes(date)).length +
      workspace.tasks.filter((task) => !task.completed && task.dueDate === date).length,
  }));
  const scheduled = eventsOn(workspace, selected);
  const tasks = workspace.tasks.filter((task) => task.dueDate === selected);
  const subjects = agendaSubjects(workspace);
  const selectedSubject = workspace.subjects.find((subject) => subject.id === draft?.subjectId);
  const subjectOptions =
    selectedSubject && !subjects.some((subject) => subject.value === selectedSubject.id)
      ? [...subjects, { value: selectedSubject.id, label: selectedSubject.name }]
      : subjects;
  const subjectName = (id: string) =>
    subjects.find((subject) => subject.value === id)?.label ??
    workspace.subjects.find((subject) => subject.id === id)?.name ??
    "Sem matéria";
  function resetDate(date: string) {
    setSelected(date);
    setRange(null);
    setIntervalStart(null);
    setIntervalMode(false);
    setDayOpen(false);
  }
  function backToCalendar() {
    setDayOpen(false);
    const button = document.querySelector<HTMLButtonElement>(`button[data-date="${selected}"]`);
    button?.focus();
    button?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
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
    formTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft({
      kind,
      title: "",
      date: selected,
      time: "18:00",
      subjectId: subjects[0]?.value ?? "",
      minutes: kind === "goal" ? 300 : 25,
      recurrence: "none",
      until: "",
    });
  }
  function edit(item: StudyEvent | StudyTask) {
    formTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    if (
      draft.kind !== "subject" &&
      !workspace.subjects.some((subject) => subject.id === draft.subjectId)
    ) {
      const subject = subjects.find((item) => item.value === draft.subjectId);
      if (!subject) {
        setNotice("Escolha uma matéria das ilhas.");
        return;
      }
      dispatch({ type: "subject/added", id: subject.value, name: subject.label, color: "#7c3aed" });
    }
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
    if (draft.kind === "task" || draft.kind === "study" || draft.kind === "appointment") {
      setSelected(draft.date);
      setRange(null);
      setDayOpen(true);
    }
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
        <time>
          <PaperDigits value={event.time} />
        </time>
        <div className="agenda-item-copy">
          <strong>{event.title}</strong>
          <small>
            {subjectName(event.subjectId)} ·{" "}
            <PaperCalendarText
              value={
                event.kind === "study"
                  ? `${event.durationMinutes ?? 25} min de estudo`
                  : "Compromisso"
              }
            />
            {event.recurrence === "weekly" ? " · Semanal" : ""}
          </small>
          {reminder && (
            <span className="agenda-reminder">
              <PaperCalendarText
                value={minutesAway === 0 ? "Está na hora" : `Começa em ${minutesAway} min`}
              />
            </span>
          )}
          {complete && <small>Concluído</small>}
          {event.kind === "study" && recorded > 0 && (
            <small>
              <PaperDigits value={String(recorded)} />/
              <PaperDigits value={String(event.durationMinutes ?? 25)} /> min registrados
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
  const dayPanel = (
    <section
      ref={daySheet}
      tabIndex={-1}
      className={`module-panel agenda-day${dayOpen ? " agenda-day--open" : ""}`}
      aria-labelledby="agenda-day-title"
    >
      <div className="module-heading">
        <h2 id="agenda-day-title" tabIndex={-1}>
          <PaperCalendarText value={dayLabel(selected, true)} />
        </h2>
        {dayOpen && (
          <button
            type="button"
            className="icon-button"
            aria-label="Voltar ao calendário"
            onClick={backToCalendar}
          >
            <AgendaCloseIcon />
          </button>
        )}
      </div>
      {brazilianHoliday(selected) && (
        <p className="agenda-holiday-caption">Feriado nacional: {brazilianHoliday(selected)}</p>
      )}
      <div className="agenda-day-actions" role="group" aria-label="Planejar este dia">
        <button type="button" className="secondary-button" onClick={() => create("task")}>
          <PaperActionIcon name="plus" /> Criar tarefa
        </button>
        <button type="button" className="primary-button" onClick={() => create("study")}>
          <AgendaActionIcon name="study" /> Reservar estudo
        </button>
        <button type="button" className="secondary-button" onClick={() => create("appointment")}>
          <AgendaActionIcon name="appointment" /> Criar compromisso
        </button>
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
        <p className="agenda-data-empty">
          Nenhum compromisso ou tarefa neste dia. Escolha uma ação acima para planejar.
        </p>
      )}
    </section>
  );
  return (
    <main className="main-content agenda-page" id="main-content">
      <PageHeader />
      <header className="agenda-heading agenda-heading--minimal">
        <h1 className="agenda-accessible-title">Minha agenda</h1>
      </header>
      <p className="agenda-notice" role="status">
        {notice}
      </p>
      {
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
                setDayOpen(false);
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
              setDayOpen(active.start === active.end);
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
              const holiday = brazilianHoliday(date);
              const inRange = range && date >= range.start && date <= range.end;
              return (
                <button
                  type="button"
                  key={date}
                  data-date={date}
                  className={`${date.slice(0, 7) !== selected.slice(0, 7) ? "is-outside " : ""}${date === today ? "is-today " : ""}${date === selected ? "is-selected " : ""}${inRange ? "is-in-range " : ""}${minutes > 0 ? "has-study " : ""}${history.has(shiftDate(date, -1)) ? "study-continues-left " : ""}${history.has(shiftDate(date, 1)) ? "study-continues-right" : ""}`}
                  aria-label={`${dayLabel(date, true)}, ${count} itens${minutes > 0 ? `, ${minutes} min de foco` : ""}${holiday ? `, feriado nacional: ${holiday}` : ""}`}
                  title={holiday}
                  aria-pressed={date === selected}
                  aria-current={date === today ? "date" : undefined}
                  onClick={(event) => {
                    if (suppressClick.current && event.detail > 0) {
                      suppressClick.current = false;
                      return;
                    }
                    suppressClick.current = false;
                    chooseDate(date, event.shiftKey);
                    setDayOpen(!event.shiftKey && !intervalMode);
                  }}
                >
                  <span>
                    <PaperDigits value={String(dateForKey(date).getDate())} />
                  </span>
                  {minutes > 0 && <i className="agenda-study-ribbon" aria-hidden="true" />}
                  {holiday && <i className="agenda-holiday-mark" aria-hidden="true" />}
                  {count > 0 && (
                    <small>
                      <PaperDigits value={String(count)} />
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
          <small className="agenda-holiday-legend">◆ Feriado nacional brasileiro</small>
        </section>
      }
      {dayOpen && dayPanel}
      {
        <AgendaStudyHistory
          history={history}
          {...(onNavigate ? { onNavigate } : {})}
          workspace={workspace}
          range={range ?? { start: selected, end: selected }}
        />
      }
      <div className="agenda-layout">
        <div>
          {!dayOpen && dayPanel}
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
          {pending.length > 0 && (
            <section className="module-panel">
              <h2>Retomar com calma</h2>
              {pending.map((task) => (
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
              ))}
            </section>
          )}
          <section className="module-panel agenda-helena">
            <NavigationIcon name="planner" />
            <h2>Uma semana possível</h2>
            <p>
              {week.reduce((sum, day) => sum + day.items, 0)} itens pendentes nesta semana. Reserve
              espaço para estudar e descansar.
            </p>
            <div
              className="agenda-week-plan"
              role="group"
              aria-label="Planejamento da semana selecionada"
            >
              {week.map((day) => (
                <button
                  type="button"
                  className="secondary-button"
                  key={day.date}
                  aria-label={`${dayLabel(day.date)}, ${day.items} itens planejados`}
                  aria-pressed={day.date === selected}
                  onClick={() => {
                    resetDate(day.date);
                    setDayOpen(true);
                  }}
                >
                  <small>
                    {dateForKey(day.date).toLocaleDateString("pt-BR", { weekday: "short" })}
                  </small>
                  <strong>{dateForKey(day.date).getDate()}</strong>
                  <span>{day.items > 0 ? `${day.items} itens` : "Livre"}</span>
                </button>
              ))}
            </div>
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
              <PaperChoice
                label="Tipo"
                value={draft.kind}
                disabled={Boolean(draft.id)}
                options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
                onChange={(value) =>
                  setDraft({ ...draft, kind: value as Kind, minutes: value === "goal" ? 300 : 25 })
                }
              />
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
                  <PaperChoice
                    label="Matéria"
                    value={draft.subjectId}
                    options={subjectOptions}
                    onChange={(value) => setDraft({ ...draft, subjectId: value })}
                  />
                  <div className="field-row">
                    <PaperDateField
                      label={draft.kind === "task" || draft.kind === "goal" ? "Prazo" : "Data"}
                      value={draft.date}
                      onChange={(value) => setDraft({ ...draft, date: value })}
                    />
                    {(draft.kind === "study" || draft.kind === "appointment") && (
                      <PaperTimeField
                        value={draft.time}
                        onChange={(value) => setDraft({ ...draft, time: value })}
                      />
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
                      <div className="field">
                        <span>Repetição</span>
                        <div className="agenda-repeat-options" role="group" aria-label="Repetição">
                          {(["none", "weekly"] as const).map((value) => (
                            <button
                              type="button"
                              key={value}
                              aria-label={value === "none" ? "Não repetir" : "Repetir semanalmente"}
                              title={value === "none" ? "Não repetir" : "Toda semana neste dia"}
                              aria-pressed={draft.recurrence === value}
                              className="secondary-button"
                              onClick={() => setDraft({ ...draft, recurrence: value })}
                            >
                              <AgendaActionIcon name={value === "none" ? "once" : "weekly"} />
                            </button>
                          ))}
                        </div>
                      </div>
                      {draft.recurrence === "weekly" && (
                        <PaperDateField
                          label="Repetir até (opcional)"
                          optional
                          min={draft.date}
                          value={draft.until}
                          onChange={(value) => setDraft({ ...draft, until: value })}
                        />
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
