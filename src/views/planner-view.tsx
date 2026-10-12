import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent } from "react";
import { PageHeader, type AppView } from "../components/app-navigation";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import { PaperActionIcon } from "../components/paper-action-icon";
import { AgendaActionIcon } from "../components/agenda-action-icon";
import { PaperArrow } from "../components/paper-arrow";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { AgendaCloseIcon } from "../components/agenda-close-icon";
import { AgendaMonthPicker } from "../components/agenda-month-picker";
import { AgendaStudyHistory } from "../components/agenda-study-history";
import {
  AgendaEventDetails,
  initialEventDetails,
  type EventDetailsDraft,
} from "../components/agenda-event-details";
import { AgendaCalendarViews, type CalendarView } from "../components/agenda-calendar-views";
import {
  addDays,
  changeSeries,
  displayEventsOn,
  eventEnd,
  eventInstant,
  eventSpan,
  frequency,
  matchesCalendarFilter,
  occurrenceOn,
  occurrenceDuration,
  recurrenceLabels,
  safeWebLink,
  validateCalendarEvent,
  validDate,
  zonedDateTime,
} from "../domain/agenda-calendar";
import { exportAgenda, importAgenda } from "../domain/agenda-ics";
import { PaperDigits } from "../components/paper-digits";
import { PaperChoice, PaperDateField, PaperTimeField } from "../components/agenda-paper-fields";
import { agendaSubjects } from "../domain/agenda-subjects";
import { brazilianHoliday } from "../domain/brazilian-holidays";
import { focusHistory, orderedRange, type AgendaRange } from "../domain/agenda-history";
import { dateForKey, eventsOn, monthDates, overdueTasks, shiftDate } from "../domain/agenda";
import { FOCUS_SESSION_KEY, readFocusSession, type FocusSession } from "../domain/focus-session";
import {
  toDateKey,
  type StudyEvent,
  type StudyTask,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import "./planner-view.css";
import "./agenda-calendar.css";

type Kind = "task" | "appointment" | "study" | "subject" | "goal";
type Draft = EventDetailsDraft & {
  kind: Kind;
  id?: string;
  title: string;
  date: string;
  time: string;
  subjectId: string;
  minutes: number;
  recurrence: NonNullable<StudyEvent["recurrenceFrequency"]>;
  until: string;
};
type Props = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onNavigate?: (view: AppView) => void;
  cloud?: CloudSyncState;
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

export function PlannerView({ workspace, dispatch, onNavigate, cloud }: Props) {
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
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [notificationStatus, setNotificationStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
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
  const visibleEvents = workspace.events.filter((event) =>
    matchesCalendarFilter(event, query, subjectFilter, typeFilter),
  );
  const visibleTasks = workspace.tasks.filter(
    (task) =>
      (!subjectFilter || task.subjectId === subjectFilter) &&
      (!typeFilter || typeFilter === "task") &&
      task.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  );
  const scheduled = eventsOn({ ...workspace, events: visibleEvents }, selected);
  const tasks = visibleTasks.filter((task) => task.dueDate === selected);
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
  function create(kind: Kind = "task", date = selected, time = "18:00") {
    formTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft({
      ...initialEventDetails(date),
      kind,
      title: "",
      date,
      time,
      ...(() => {
        const end = eventEnd({ id: "", title: "", subjectId: "", date, time, durationMinutes: 25 });
        return { endDate: end.date, endTime: end.time };
      })(),
      subjectId: subjects[0]?.value ?? "",
      minutes: kind === "goal" ? 300 : 25,
      recurrence: "none",
      until: "",
    });
    setFormError("");
    setDeleteRequested(false);
  }
  function edit(
    item: StudyEvent | StudyTask,
    occurrence = "dueDate" in item ? item.dueDate : item.date,
  ) {
    if (!("dueDate" in item)) item = workspace.events.find((event) => event.id === item.id) ?? item;
    formTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft(
      "dueDate" in item
        ? {
            ...initialEventDetails(item.dueDate),
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
            ...initialEventDetails(item.date, item),
            occurrence,
            kind: item.kind ?? "appointment",
            id: item.id,
            title: item.title,
            date: item.date,
            time: item.time,
            subjectId: item.subjectId,
            minutes: occurrenceDuration(item),
            recurrence: frequency(item),
            until: item.recurrenceUntil ?? "",
          },
    );
    setFormError("");
    setDeleteRequested(false);
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
      const changes: StudyEvent = {
        id: draft.id ?? crypto.randomUUID(),
        title,
        subjectId: draft.subjectId,
        date: draft.date,
        time: draft.time,
        kind: draft.kind,
        durationMinutes: draft.minutes,
        recurrence: draft.recurrence === "weekly" ? "weekly" : "none",
        recurrenceFrequency: draft.recurrence,
        recurrenceUntil: draft.recurrence === "none" ? "" : draft.until,
        recurrenceInterval: draft.interval,
        recurrenceDays: draft.weekdays,
        endDate: draft.endDate,
        endTime: draft.endTime,
        allDay: draft.allDay,
        timeZone: draft.timeZone,
        description: draft.description,
        location: draft.location,
        links: draft.links
          .split(/\r?\n/)
          .map((link) => link.trim())
          .filter(Boolean),
        guests: draft.guests
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean),
        reminders: draft.reminders,
        attachments: draft.attachments,
      };
      const error = validateCalendarEvent(changes);
      if (error) {
        setFormError(error);
        return;
      }
      const end = eventEnd(changes);
      changes.durationMinutes = draft.allDay
        ? (Math.round(
            (Date.parse(`${draft.endDate}T00:00:00Z`) - Date.parse(`${draft.date}T00:00:00Z`)) /
              86400000,
          ) +
            1) *
          1440
        : Math.round(
            (eventInstant(end.date, end.time, draft.timeZone) -
              eventInstant(draft.date, draft.time, draft.timeZone)) /
              60000,
          );
      if (draft.kind === "study" && changes.durationMinutes > 180) {
        setFormError(
          "Reserve estudos em sessões de até 180 minutos. Para períodos maiores, use um compromisso.",
        );
        return;
      }
      // Keep the v7 carrier readable by old clients; end fields retain the complete schedule.
      changes.calendarDurationMinutes = changes.durationMinutes;
      changes.durationMinutes = Math.min(180, changes.durationMinutes);
      const original = workspace.events.find((item) => item.id === draft.id);
      dispatch({
        type: "event/series-changed",
        ...(original
          ? changeSeries(original, draft.occurrence, draft.scope, changes)
          : { removeIds: [], events: [changes] }),
      });
    }
    setNotice(draft.id ? "Alteração salva." : "Adicionado à sua agenda.");
    if (draft.kind === "task" || draft.kind === "study" || draft.kind === "appointment") {
      const localDate =
        draft.kind === "task" || draft.allDay
          ? draft.date
          : zonedDateTime(
              eventInstant(draft.date, draft.time, draft.timeZone),
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            ).date;
      const original = workspace.events.find((item) => item.id === draft.id);
      setSelected(
        original && draft.scope === "all" && original.date === draft.date ? selected : localDate,
      );
      setRange(null);
      setDayOpen(true);
    }
    setDraft(null);
  }
  function startStudy(event: StudyEvent, date: string, timestamp: number) {
    const plannedMinutes = occurrenceDuration(event, date);
    if (plannedMinutes > 180) {
      setNotice(
        "Este estudo passa de 180 minutos. Divida a reserva em sessões menores antes de iniciar o Foco.",
      );
      return;
    }
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
      plannedMinutes,
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
          className="primary-button agenda-edit"
          aria-label={`Editar ${task.title}`}
          title={`Editar ${task.title}`}
          onClick={() => edit(task)}
        >
          <AgendaActionIcon name="edit" />
        </button>
      </article>
    );
  }
  function eventCard(event: StudyEvent, date = selected) {
    const original = workspace.events.find((item) => item.id === event.id) ?? event;
    const displays = displayEventsOn([original], date);
    const displayed =
      "displayOccurrence" in event
        ? displays.find((item) => item.displayOccurrence === event.displayOccurrence)
        : displays[0];
    const occurrence = displayed?.displayOccurrence ?? occurrenceOn(original, date) ?? date;
    const plannedMinutes = occurrenceDuration(original, occurrence);
    const complete = event.completedDates?.includes(occurrence) ?? false;
    const recorded = workspace.focusSessions
      .filter(
        (session) =>
          session.agendaEventId === event.id &&
          session.agendaDate === date &&
          session.subjectId === event.subjectId,
      )
      .reduce((sum, session) => sum + session.durationMinutes, 0);
    const minutesAway = Math.round(
      (eventInstant(occurrence, original.allDay ? "09:00" : original.time, original.timeZone) -
        now.getTime()) /
        60_000,
    );
    const reminder =
      !event.allDay && date === today && !complete && minutesAway >= 0 && minutesAway <= 15;
    return (
      <article
        className={`agenda-item agenda-item--timed${event.kind === "study" ? " agenda-item--study" : ""}${complete ? " is-complete" : ""}${reminder ? " is-due" : ""}`}
        key={`${event.id}:${date}`}
      >
        <time>
          {event.allDay ? "Dia inteiro" : <PaperDigits value={displayed?.time ?? event.time} />}
        </time>
        <div className="agenda-item-copy">
          <strong>{event.title}</strong>
          <small>
            {subjectName(event.subjectId)} ·{" "}
            <PaperCalendarText
              value={event.kind === "study" ? `${plannedMinutes} min de estudo` : "Compromisso"}
            />
            {frequency(original) !== "none" ? ` · ${recurrenceLabels[frequency(original)]}` : ""}
          </small>
          {original.timeZone && (
            <small>Hora local · evento em {original.timeZone.replace(/_/g, " ")}</small>
          )}
          {displayed?.endDate && (
            <small>
              {event.allDay ? "Até" : "Termina"}{" "}
              {displayed.endDate === date ? "" : dayLabel(displayed.endDate)}{" "}
              {!event.allDay && displayed.endTime}
            </small>
          )}
          {event.id && (
            <details className="agenda-event-info">
              <summary>Detalhes</summary>
              {event.description && <p>{event.description}</p>}
              {event.location && <p>Local: {event.location}</p>}
              {event.links?.filter(safeWebLink).map((link) => (
                <a key={link} href={link} target="_blank" rel="noopener noreferrer">
                  {link}
                </a>
              ))}
              {event.guests?.length ? <p>Participantes: {event.guests.join(", ")}</p> : null}
              {event.attachments?.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="text-button"
                  onClick={() => {
                    const anchor = document.createElement("a");
                    anchor.href = asset.data;
                    anchor.download = asset.name;
                    anchor.click();
                  }}
                >
                  {asset.name}
                </button>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={async () => {
                  const file = new File([exportAgenda([original])], "evento-olenastudy.ics", {
                    type: "text/calendar",
                  });
                  try {
                    if (navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ files: [file], title: original.title });
                      return;
                    }
                  } catch {
                    setNotice("Compartilhamento cancelado ou indisponível.");
                    return;
                  }
                  const url = URL.createObjectURL(file);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = file.name;
                  anchor.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  setNotice(
                    "Arquivo do evento preparado para compartilhar. Anexos não foram incluídos.",
                  );
                }}
              >
                Compartilhar .ics <PaperArrow />
              </button>
              <small>
                O arquivo inclui os detalhes e participantes desta série, mas não seus anexos nem o
                histórico de estudo.
              </small>
            </details>
          )}
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
              <PaperDigits value={String(plannedMinutes)} /> min registrados
            </small>
          )}
        </div>
        <div className="agenda-item-actions">
          {event.kind === "study" && !complete && (
            <button
              type="button"
              className="primary-button"
              aria-label={`Começar estudo ${event.title}`}
              onClick={() => startStudy(event, occurrence, Date.now())}
            >
              Começar <PaperArrow />
            </button>
          )}
          <button
            type="button"
            className="primary-button agenda-edit"
            aria-label={`Editar ${event.title}`}
            title={`Editar ${event.title}`}
            onClick={() => edit(event, occurrence)}
          >
            <AgendaActionIcon name="edit" />
          </button>
          {event.kind !== "study" && (
            <button
              type="button"
              className="agenda-check"
              aria-label={`${complete ? "Reabrir" : "Concluir"} ${event.title}`}
              aria-pressed={complete}
              onClick={() => dispatch({ type: "event/toggled", id: event.id, date: occurrence })}
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
          {dayLabel(selected, true)}
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
      {scheduled.some((event) => event.allDay) && (
        <>
          <h3 className="agenda-section-title">Dia inteiro</h3>
          {scheduled.filter((event) => event.allDay).map((event) => eventCard(event))}
        </>
      )}
      {scheduled.some((event) => !event.allDay) && (
        <>
          <h3 className="agenda-section-title">Com horário</h3>
          {scheduled.filter((event) => !event.allDay).map((event) => eventCard(event))}
        </>
      )}
      {tasks.length > 0 && (
        <>
          <h3 className="agenda-section-title">No seu ritmo</h3>
          {tasks.map(taskCard)}
        </>
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
      <section className="agenda-toolbar module-panel" aria-label="Controles da agenda">
        <div className="agenda-sync-caption" aria-live="polite">
          <small>
            {!cloud?.enabled || cloud.status === "signed-out"
              ? "Agenda local neste dispositivo"
              : (
                  {
                    disabled: "Agenda local",
                    "signed-out": "Agenda local",
                    loading: "Carregando agenda da conta",
                    syncing: "Sincronizando alterações",
                    synced: "Agenda sincronizada com sua conta",
                    offline: "Offline. Alterações locais aguardam conexão",
                    conflict: "Alterações simultâneas. Revise a sincronização no Perfil",
                  } as const
                )[cloud.status]}
          </small>
          {cloud?.status === "conflict" && onNavigate && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("profile")}
            >
              Revisar sincronização
            </button>
          )}
          {cloud?.syncNow && cloud.status !== "loading" && (
            <button
              type="button"
              className="text-button"
              disabled={cloud.status === "syncing"}
              onClick={cloud.syncNow}
            >
              Sincronizar agora
            </button>
          )}
        </div>
        <div className="agenda-view-buttons" role="group" aria-label="Visualização">
          {(
            [
              ["day", "Dia"],
              ["week", "Semana"],
              ["month", "Mês"],
              ["list", "Lista"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={calendarView === value ? "primary-button" : "secondary-button"}
              aria-pressed={calendarView === value}
              onClick={() => setCalendarView(value)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="secondary-button"
            aria-label="Período anterior"
            onClick={() =>
              resetDate(
                calendarView === "month"
                  ? `${new Date(dateForKey(selected).getFullYear(), dateForKey(selected).getMonth() - 1, 1).getFullYear()}-${String(new Date(dateForKey(selected).getFullYear(), dateForKey(selected).getMonth() - 1, 1).getMonth() + 1).padStart(2, "0")}-01`
                  : shiftDate(selected, calendarView === "week" ? -7 : -1),
              )
            }
          >
            <span className="agenda-arrow-back">
              <PaperArrow />
            </span>
          </button>
          <button
            type="button"
            className="secondary-button"
            aria-label="Próximo período"
            onClick={() =>
              resetDate(
                calendarView === "month"
                  ? toDateKey(
                      new Date(
                        dateForKey(selected).getFullYear(),
                        dateForKey(selected).getMonth() + 1,
                        1,
                      ),
                    )
                  : shiftDate(selected, calendarView === "week" ? 7 : 1),
              )
            }
          >
            <PaperArrow />
          </button>
        </div>
        <div className="agenda-filter-fields">
          <label className="field">
            Buscar na agenda
            <input
              type="search"
              value={query}
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Título, descrição ou local"
            />
          </label>
          <PaperChoice
            label="Filtrar matéria"
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[{ value: "", label: "Todas as matérias" }, ...subjects]}
          />
          <PaperChoice
            label="Filtrar tipo"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "", label: "Todos os tipos" },
              { value: "appointment", label: "Compromissos" },
              { value: "study", label: "Estudos" },
              { value: "task", label: "Tarefas" },
            ]}
          />
        </div>
        <div className="agenda-calendar-tools">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              const blob = new Blob([exportAgenda(visibleEvents)], {
                type: "text/calendar;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "olenastudy-agenda.ics";
              anchor.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setNotice("Eventos filtrados exportados. Anexos e histórico não foram incluídos.");
            }}
          >
            Exportar .ics
          </button>
          <label className="secondary-button agenda-import-label">
            Importar .ics
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 2000000) {
                  setNotice("Escolha um arquivo .ics de até 2 MB.");
                  return;
                }
                try {
                  const imported = importAgenda(
                    await file.text(),
                    subjectFilter || subjects[0]!.value,
                  );
                  const ids = new Set(workspace.events.map((item) => item.id));
                  const events = imported.events.filter((item) => {
                    if (ids.has(item.id)) return false;
                    ids.add(item.id);
                    return true;
                  });
                  const subject = subjects.find(
                    (item) => item.value === (subjectFilter || subjects[0]!.value),
                  );
                  if (subject && !workspace.subjects.some((item) => item.id === subject.value))
                    dispatch({
                      type: "subject/added",
                      id: subject.value,
                      name: subject.label,
                      color: "#7c3aed",
                    });
                  dispatch({ type: "event/series-changed", removeIds: [], events });
                  setNotice(
                    `${events.length} eventos importados; ${imported.skipped} incompatíveis ignorados; ${imported.events.length - events.length} já existentes. Nenhum evento anterior foi alterado.`,
                  );
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : "Não foi possível importar.");
                }
              }}
            />
          </label>
          <button type="button" className="secondary-button" onClick={() => window.print()}>
            Imprimir
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={async () => {
              if (typeof Notification === "undefined") {
                setNotificationStatus(
                  "Este navegador não oferece notificações do sistema. Os alertas internos continuam disponíveis.",
                );
                return;
              }
              try {
                const permission = await Notification.requestPermission();
                setNotificationStatus(
                  permission === "granted"
                    ? "Notificações permitidas enquanto o aplicativo estiver aberto."
                    : "Notificações não permitidas. Os alertas internos continuam disponíveis.",
                );
              } catch {
                setNotificationStatus("Não foi possível habilitar notificações neste navegador.");
              }
            }}
          >
            Ativar lembretes
          </button>
        </div>
        {notificationStatus && <p role="status">{notificationStatus}</p>}
      </section>
      <div className="agenda-overview">
        <div className="agenda-calendar-column">
          {
            <section
              id="agenda-calendar"
              className="agenda-month module-panel"
              aria-label={calendarView === "month" ? "Calendário mensal" : "Calendário"}
            >
              <div className="agenda-calendar-controls">
                <AgendaMonthPicker value={selected} today={today} onChange={resetDate} />
                <button type="button" className="secondary-button" onClick={() => resetDate(today)}>
                  Ir para hoje
                </button>
              </div>
              <div className="agenda-range-tools" hidden={calendarView !== "month"}>
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
              <div className="agenda-weekdays" hidden={calendarView !== "month"}>
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
              <div
                className="agenda-month-grid"
                hidden={calendarView !== "month"}
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
                  drag.current = {
                    pointer: event.pointerId,
                    start: date,
                    end: date,
                    previous: range,
                  };
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
                  setRange(
                    active.start === active.end ? null : orderedRange(active.start, active.end),
                  );
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
                  const dayEvents = eventsOn({ events: visibleEvents }, date);
                  const count =
                    dayEvents.length +
                    visibleTasks.filter((task) => task.dueDate === date && !task.completed).length;
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
                      title={[holiday, ...dayEvents.map((item) => item.title)]
                        .filter(Boolean)
                        .join("\n")}
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
                      {dayEvents.slice(0, 2).map((item) => (
                        <small className="agenda-month-event-title" key={item.id}>
                          <i
                            style={{ background: item.kind === "study" ? "#7c3aed" : "#facc15" }}
                          />
                          {item.title}
                        </small>
                      ))}
                      {count > 2 && (
                        <small className="agenda-month-more">+{count - 2} outros</small>
                      )}
                    </button>
                  );
                })}
              </div>
              <small className="agenda-holiday-legend" hidden={calendarView !== "month"}>
                ◆ Feriado nacional brasileiro
              </small>
              {calendarView !== "month" && (
                <AgendaCalendarViews
                  view={calendarView}
                  selected={selected}
                  events={visibleEvents}
                  tasks={visibleTasks}
                  onSelect={(date) => {
                    chooseDate(date);
                    setDayOpen(true);
                  }}
                  onCreate={(date, time) => create("appointment", date, time)}
                  onEdit={edit}
                  renderEvent={eventCard}
                  renderTask={taskCard}
                  onMove={(event, from, to, time) => {
                    const original = workspace.events.find((item) => item.id === event.id) ?? event;
                    edit(original, from);
                    const moved = zonedDateTime(
                      eventInstant(to, time),
                      original.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                    );
                    const end = eventEnd({
                      ...original,
                      date: moved.date,
                      time: moved.time,
                      endDate: "",
                      endTime: "",
                    });
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            date: moved.date,
                            time: moved.time,
                            endDate: end.date,
                            endTime: end.time,
                            scope: frequency(original) === "none" ? "all" : "this",
                          }
                        : null,
                    );
                  }}
                  onResize={(event, date, minutes) => {
                    const original = workspace.events.find((item) => item.id === event.id) ?? event;
                    edit(original, date);
                    const end = eventEnd({
                      ...original,
                      date,
                      durationMinutes: minutes,
                      calendarDurationMinutes: minutes,
                      endDate: "",
                      endTime: "",
                    });
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            date,
                            minutes,
                            endDate: end.date,
                            endTime: end.time,
                            scope: frequency(original) === "none" ? "all" : "this",
                          }
                        : null,
                    );
                  }}
                />
              )}
            </section>
          }
          {dayPanel}
        </div>
        {
          <AgendaStudyHistory
            history={history}
            {...(onNavigate ? { onNavigate } : {})}
            workspace={workspace}
            range={range ?? { start: selected, end: selected }}
          />
        }
      </div>
      <div className="agenda-layout">
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
        </aside>
      </div>
      <dialog
        ref={dialog}
        className="agenda-dialog"
        aria-labelledby="agenda-dialog-title"
        onCancel={(event) => {
          if (formBusy) event.preventDefault();
          else setDraft(null);
        }}
      >
        {draft && (
          <>
            <header>
              <h2 id="agenda-dialog-title">{draft.id ? "Editar" : "Adicionar à agenda"}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar formulário"
                disabled={formBusy}
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
                      onChange={(value) =>
                        setDraft({
                          ...draft,
                          date: value,
                          endDate:
                            validDate(value) && validDate(draft.date) && validDate(draft.endDate)
                              ? shiftDate(
                                  draft.endDate,
                                  Math.round(
                                    (Date.parse(`${value}T00:00:00Z`) -
                                      Date.parse(`${draft.date}T00:00:00Z`)) /
                                      86400000,
                                  ),
                                )
                              : value,
                        })
                      }
                    />
                    {(draft.kind === "study" || draft.kind === "appointment") && !draft.allDay && (
                      <PaperTimeField
                        value={draft.time}
                        onChange={(value) => {
                          const end = eventEnd({
                            id: "",
                            title: "",
                            subjectId: "",
                            date: draft.date,
                            time: value,
                            durationMinutes: draft.minutes,
                          });
                          setDraft({ ...draft, time: value, endDate: end.date, endTime: end.time });
                        }}
                      />
                    )}
                  </div>
                  {draft.kind !== "task" && !draft.allDay && (
                    <label className="field">
                      <span>
                        {draft.kind === "goal" ? "Meta em minutos" : "Duração em minutos"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={
                          draft.kind === "goal"
                            ? "10000"
                            : draft.kind === "study"
                              ? "180"
                              : "527040"
                        }
                        required
                        value={draft.minutes}
                        onChange={(event) => {
                          const minutes = Number(event.target.value);
                          const end = eventEnd({
                            id: "",
                            title: "",
                            subjectId: "",
                            date: draft.date,
                            time: draft.time,
                            durationMinutes: minutes,
                          });
                          setDraft({ ...draft, minutes, endDate: end.date, endTime: end.time });
                        }}
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
                      <PaperChoice
                        label="Frequência"
                        value={draft.recurrence}
                        options={Object.entries(recurrenceLabels).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                        onChange={(value) =>
                          setDraft({ ...draft, recurrence: value as Draft["recurrence"] })
                        }
                      />
                      <AgendaEventDetails
                        allowAllDay={draft.kind === "appointment"}
                        value={draft}
                        date={draft.date}
                        repeating={draft.recurrence}
                        onChange={(value) =>
                          setDraft((current) => (current ? { ...current, ...value } : null))
                        }
                        onBusy={setFormBusy}
                        onAttachment={(asset) =>
                          setDraft((current) =>
                            current
                              ? { ...current, attachments: [...current.attachments, asset] }
                              : null,
                          )
                        }
                      />
                      {draft.recurrence !== "none" && (
                        <PaperDateField
                          label="Repetir até (opcional)"
                          optional
                          min={draft.date}
                          value={draft.until}
                          onChange={(value) => setDraft({ ...draft, until: value })}
                        />
                      )}
                      {draft.id &&
                        frequency(workspace.events.find((item) => item.id === draft.id)!) !==
                          "none" && (
                          <PaperChoice
                            label="Aplicar alteração ou exclusão"
                            value={draft.scope}
                            options={[
                              { value: "all", label: "Toda a série" },
                              { value: "this", label: "Só este evento" },
                              { value: "following", label: "Este e os próximos" },
                            ]}
                            onChange={(value) => {
                              const original = workspace.events.find(
                                (item) => item.id === draft.id,
                              )!;
                              const date = value === "all" ? original.date : draft.occurrence;
                              setDraft({
                                ...draft,
                                scope: value as Draft["scope"],
                                date,
                                endDate: addDays(date, eventSpan(original)),
                              });
                            }}
                          />
                        )}
                    </>
                  )}
                </>
              )}
              <footer>
                {formError && <p role="alert">{formError}</p>}
                {deleteRequested && (
                  <div className="agenda-delete-confirm" role="alert">
                    <p>
                      Excluir {draft.title}?{" "}
                      {draft.scope === "this"
                        ? "Só esta ocorrência."
                        : draft.scope === "following"
                          ? "Esta ocorrência e as próximas."
                          : "Toda a série."}{" "}
                      O histórico de estudo será preservado.
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setDeleteRequested(false)}
                    >
                      Cancelar exclusão
                    </button>
                  </div>
                )}
                {draft.id && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={formBusy}
                    onClick={() => {
                      if (!deleteRequested) {
                        setDeleteRequested(true);
                        return;
                      }
                      if (draft.kind === "task") dispatch({ type: "task/removed", id: draft.id! });
                      else {
                        const original = workspace.events.find((item) => item.id === draft.id);
                        if (original)
                          dispatch({
                            type: "event/series-changed",
                            ...changeSeries(original, draft.occurrence, draft.scope, null),
                          });
                      }
                      setDraft(null);
                      setNotice("Item removido da agenda. O histórico de foco foi preservado.");
                    }}
                  >
                    {deleteRequested ? "Confirmar exclusão" : "Excluir"}
                  </button>
                )}
                <button className="primary-button" type="submit" disabled={formBusy}>
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
