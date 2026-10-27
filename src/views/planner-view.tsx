import { uiText, useLanguage, localizeLabels, uiLocale } from "../i18n/runtime";
import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent } from "react";
import { PageHeader, type AppView } from "../components/app-navigation";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import { PaperActionIcon } from "../components/paper-action-icon";
import { AgendaActionIcon } from "../components/agenda-action-icon";
import { AgendaToolbarIcon } from "../components/agenda-toolbar-icon";
import { AgendaDurationClock } from "../components/agenda-duration-clock";
import { AgendaFilters } from "../components/agenda-filters";
import { AgendaEventShare } from "../components/agenda-event-share";
import { AgendaDetailIcon } from "../components/agenda-detail-icon";
import { LibraryLinks } from "../components/library-links";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import { AgendaAttachmentPreview } from "../components/agenda-attachment-preview";
import { agendaTimeZone, AGENDA_ZONE_KEY } from "../data/agenda-time-zone";
import { SYNCED_STORAGE_APPLIED_EVENT, writeSyncedStorage } from "../data/synced-storage";
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
import { AgendaColorPalette } from "../components/agenda-color-palette";
import { AgendaCalendarViews, type CalendarView } from "../components/agenda-calendar-views";
import {
  addDays,
  agendaSearchText,
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
import { agendaSubjects, agendaSubjectName, agendaItemColor } from "../domain/agenda-subjects";
import { brazilianHoliday } from "../domain/brazilian-holidays";
import { focusHistory, orderedRange, type AgendaRange } from "../domain/agenda-history";
import { dateForKey, monthDates, overdueTasks, shiftDate } from "../domain/agenda";
import { FOCUS_SESSION_KEY, readFocusSession, type FocusSession } from "../domain/focus-session";
import {
  type StudyEvent,
  type StudyTask,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import "./planner-view.css";
import "./agenda-calendar.css";
import "../components/agenda-detail-controls.css";

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
const labels: Record<Kind, string> = localizeLabels(() => ({
  task: uiText(2021),
  appointment: uiText(2022),
  study: uiText(1438),
  subject: uiText(1270),
  goal: uiText(2023),
}));
function PaperCalendarText({ value }: { value: string }) {
  useLanguage();

  return value
    .split(/(\d[\d:]*)/)
    .map((part, index) => (/^\d/.test(part) ? <PaperDigits key={index} value={part} /> : part));
}

function dayLabel(date: string, long = false) {
  return dateForKey(date).toLocaleDateString(
    uiLocale(),
    long
      ? { weekday: "long", day: "numeric", month: "long" }
      : { weekday: "short", day: "numeric" },
  );
}

export function PlannerView({ workspace, dispatch, onNavigate, cloud }: Props) {
  const currentUiLanguage = useLanguage();

  const [now, setNow] = useState(() => new Date());
  const [timeZone, setTimeZone] = useState(agendaTimeZone);
  useEffect(() => {
    const refresh = () => setTimeZone(agendaTimeZone());
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    return () => window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
  }, []);
  useEffect(() => {
    if ((cloud?.ready ?? true) && localStorage.getItem(AGENDA_ZONE_KEY) !== timeZone)
      writeSyncedStorage(AGENDA_ZONE_KEY, timeZone);
  }, [timeZone, cloud?.ready, cloud?.revision]);
  const today = zonedDateTime(now.getTime(), timeZone).date;
  const [selected, setSelected] = useState(today);
  const [range, setRange] = useState<AgendaRange | null>(null);
  const [intervalMode, setIntervalMode] = useState(false);
  const [intervalStart, setIntervalStart] = useState<string | null>(null);
  const drag = useRef<{
    pointer: number;
    start: string;
    end: string;
    previous: AgendaRange | null;
    since: number;
    x: number;
    y: number;
    armed: boolean;
  } | null>(null);
  const monthGrid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = monthGrid.current;
    if (!grid) return;
    const holdScroll = (event: TouchEvent) => {
      const active = drag.current;
      if (active && performance.now() - active.since >= 350 && event.touches.length === 1)
        event.preventDefault();
    };
    const cancel = () => {
      if (drag.current?.armed) setRange(drag.current.previous);
      drag.current = null;
    };
    grid.addEventListener("touchmove", holdScroll, { passive: false });
    window.addEventListener("scroll", cancel, true);
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("blur", cancel);
    return () => {
      grid.removeEventListener("touchmove", holdScroll);
      window.removeEventListener("scroll", cancel, true);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("blur", cancel);
      drag.current = null;
    };
  }, []);
  const suppressClick = useRef(false);
  const history = useMemo(
    () => focusHistory(workspace.focusSessions),
    [workspace.focusSessions, currentUiLanguage],
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const [dayOpen, setDayOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [notificationStatus, setNotificationStatus] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!notificationStatus) return;
    const timer = window.setTimeout(() => setNotificationStatus(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notificationStatus]);
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const daySheet = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const formTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (dayOpen && !document.activeElement?.classList.contains("agenda-block-title")) {
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
      agendaSearchText(task.title).includes(agendaSearchText(query)),
  );
  const scheduled = displayEventsOn(visibleEvents, selected, timeZone);
  const tasks = visibleTasks.filter((task) => task.dueDate === selected);
  const subjects = agendaSubjects(workspace);
  const selectedSubject = workspace.subjects.find((subject) => subject.id === draft?.subjectId);
  const subjectOptions =
    selectedSubject && !subjects.some((subject) => subject.value === selectedSubject.id)
      ? [...subjects, { value: selectedSubject.id, label: selectedSubject.name }]
      : subjects;
  const subjectName = (id: string) => agendaSubjectName(workspace, id);
  function searchAgenda() {
    if (!query.trim()) {
      searchInput.current?.focus();
      return;
    }
    setSearching(true);
    setCalendarView("list");
    setDayOpen(false);
  }
  function saveGridEvent(original: StudyEvent, occurrence: string, changes: StudyEvent) {
    const adjusted =
      frequency(original) === "none"
        ? changes
        : {
            ...changes,
            recurrence: "none" as const,
            recurrenceFrequency: "none" as const,
            recurrenceUntil: "",
          };
    const error = validateCalendarEvent(adjusted);
    if (error || (changes.kind === "study" && (changes.calendarDurationMinutes ?? 25) > 180)) {
      setNotice(error ?? uiText(2283));
      return false;
    }
    dispatch({
      type: "event/series-changed",
      ...changeSeries(
        original,
        occurrence,
        frequency(original) === "none" ? "all" : "this",
        adjusted,
      ),
    });
    return true;
  }
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
      timeZone,
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
    if (!("dueDate" in item) && !item.allDay && item.timeZone && item.timeZone !== timeZone) {
      const start = zonedDateTime(eventInstant(item.date, item.time, item.timeZone), timeZone);
      const end = eventEnd(item);
      const finish = zonedDateTime(eventInstant(end.date, end.time, item.timeZone), timeZone);
      item = {
        ...item,
        date: start.date,
        time: start.time,
        endDate: finish.date,
        endTime: finish.time,
        timeZone,
      };
    }
    formTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft(
      "dueDate" in item
        ? {
            ...initialEventDetails(item.dueDate),
            ...(item.color ? { color: item.color } : {}),
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
        setNotice(uiText(1439));
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
      const changes = {
        title,
        subjectId: draft.subjectId,
        dueDate: draft.date,
        color: draft.color,
      };
      dispatch(
        draft.id
          ? { type: "task/updated", id: draft.id, changes }
          : { type: "task/added", ...changes },
      );
    } else {
      const changes: StudyEvent = {
        ...(draft.id
          ? {
              materialIds: workspace.events.find((item) => item.id === draft.id)?.materialIds ?? [],
            }
          : {}),
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
        color: draft.color,
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
        setFormError(uiText(1440));
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
    setNotice("");
    if (draft.kind === "task" || draft.kind === "study" || draft.kind === "appointment") {
      const localDate =
        draft.kind === "task" || draft.allDay
          ? draft.date
          : zonedDateTime(eventInstant(draft.date, draft.time, draft.timeZone), timeZone).date;
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
      setNotice(uiText(1441));
      return;
    }
    const active = readFocusSession(localStorage.getItem(FOCUS_SESSION_KEY), timestamp);
    if (
      active?.running ||
      (active?.elapsedMilliseconds ?? 0) > 0 ||
      (active && active.secondsRemaining < active.duration * 60)
    ) {
      setNotice(uiText(1442));
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
      setNotice(uiText(1443));
    }
  }
  function taskCard(task: StudyTask) {
    return (
      <article
        className={`agenda-item agenda-item--task${task.completed ? " is-complete" : ""}`}
        style={{ borderLeft: `4px solid ${agendaItemColor(task)}` }}
        key={task.id}
      >
        <button
          type="button"
          className="agenda-check"
          aria-label={`${task.completed ? uiText(1963) : uiText(25)} ${task.title}`}
          aria-pressed={task.completed}
          onClick={() => dispatch({ type: "task/toggled", id: task.id })}
        >
          <PaperCheckIcon />
        </button>
        <div className="agenda-item-copy">
          <strong>{task.title}</strong>
          <LibraryLinks workspace={workspace} dispatch={dispatch} kind="task" item={task} />
          <small>
            {subjectName(task.subjectId)} {uiText(1444)}
          </small>
        </div>
        <button
          type="button"
          className="primary-button agenda-edit"
          aria-label={uiText(2024, [task.title])}
          title={uiText(2024, [task.title])}
          onClick={() => edit(task)}
        >
          <AgendaActionIcon name="edit" />
        </button>
      </article>
    );
  }
  function eventCard(event: StudyEvent, date = selected, share = false) {
    const original = workspace.events.find((item) => item.id === event.id) ?? event;
    const displays = displayEventsOn([original], date, timeZone);
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
        style={{ borderLeftColor: agendaItemColor(event) }}
      >
        <time>
          {event.allDay ? uiText(29) : <PaperDigits value={displayed?.time ?? event.time} />}
        </time>
        <div className="agenda-item-copy">
          <strong>{event.title}</strong>
          <small>
            {subjectName(event.subjectId)} ·{" "}
            <PaperCalendarText
              value={event.kind === "study" ? `${plannedMinutes} min de estudo` : "Compromisso"}
            />
            {frequency(original) !== "none"
              ? ` · ${uiText(recurrenceLabels[frequency(original)])}`
              : ""}
          </small>
          {original.timeZone && (
            <small>
              {uiText(1445)} {original.timeZone.replace(/_/g, " ")}
            </small>
          )}
          {displayed?.endDate && (
            <small>
              {event.allDay ? uiText(1446) : uiText(2025)}{" "}
              {displayed.endDate === date ? "" : dayLabel(displayed.endDate)}{" "}
              {!event.allDay && displayed.endTime}
            </small>
          )}
          <AgendaAttachmentPreview attachments={event.attachments} />
          <LibraryLinks workspace={workspace} dispatch={dispatch} kind="event" item={event} />
          {event.description || event.location || event.links?.length || event.guests?.length ? (
            <div className="agenda-event-info">
              {event.description && <p>{event.description}</p>}
              {event.location && (
                <p>
                  {uiText(1447)} {event.location}
                </p>
              )}
              {event.links?.filter(safeWebLink).map((link) => (
                <a key={link} href={link} target="_blank" rel="noopener noreferrer">
                  {link}
                </a>
              ))}
              {event.guests?.length ? (
                <p>
                  {uiText(1448)} {event.guests.join(", ")}
                </p>
              ) : null}
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
            </div>
          ) : null}
          {reminder && (
            <span className="agenda-reminder">
              <PaperCalendarText
                value={minutesAway === 0 ? uiText(92) : `Começa em ${minutesAway} min`}
              />
            </span>
          )}
          {complete && <small>{uiText(1449)}</small>}
          {event.kind === "study" && recorded > 0 && (
            <small>
              <PaperDigits value={String(recorded)} />/
              <PaperDigits value={String(plannedMinutes)} /> {uiText(1450)}
            </small>
          )}
        </div>
        <div className="agenda-item-actions">
          {share && (
            <AgendaEventShare
              event={displayed ?? event}
              date={date}
              subject={subjectName(event.subjectId)}
            />
          )}
          {event.kind === "study" && !complete && (
            <button
              type="button"
              className="primary-button"
              aria-label={uiText(2026, [event.title])}
              onClick={() => startStudy(event, occurrence, Date.now())}
            >
              {uiText(1172)} <PaperArrow />
            </button>
          )}
          <button
            type="button"
            className="primary-button agenda-edit"
            aria-label={uiText(2024, [event.title])}
            title={uiText(2024, [event.title])}
            onClick={() => edit(event, occurrence)}
          >
            <AgendaActionIcon name="edit" />
          </button>
          {event.kind !== "study" && (
            <button
              type="button"
              className="agenda-check"
              aria-label={`${complete ? uiText(1963) : uiText(25)} ${event.title}`}
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
            aria-label={uiText(1451)}
            onClick={backToCalendar}
          >
            <AgendaCloseIcon />
          </button>
        )}
      </div>
      {brazilianHoliday(selected) && (
        <p className="agenda-holiday-caption">
          {uiText(1452)} {uiText(brazilianHoliday(selected) ?? "")}
        </p>
      )}
      <div className="agenda-day-actions" role="group" aria-label={uiText(1453)}>
        <button type="button" className="secondary-button" onClick={() => create("task")}>
          <PaperActionIcon name="plus" /> {uiText(1454)}
        </button>
        <button type="button" className="primary-button" onClick={() => create("study")}>
          <AgendaActionIcon name="study" /> {uiText(1455)}
        </button>
        <button type="button" className="secondary-button" onClick={() => create("appointment")}>
          <AgendaActionIcon name="appointment" /> {uiText(1456)}
        </button>
      </div>
      {scheduled.some((event) => event.allDay) && (
        <>
          <h3 className="agenda-section-title">{uiText(29)}</h3>
          {scheduled.filter((event) => event.allDay).map((event) => eventCard(event))}
        </>
      )}
      {scheduled.some((event) => !event.allDay) && (
        <>
          <h3 className="agenda-section-title">{uiText(1457)}</h3>
          {scheduled.filter((event) => !event.allDay).map((event) => eventCard(event))}
        </>
      )}
      {tasks.length > 0 && (
        <>
          <h3 className="agenda-section-title">{uiText(1458)}</h3>
          {tasks.map(taskCard)}
        </>
      )}
    </section>
  );
  return (
    <main className="main-content agenda-page" id="main-content">
      <PageHeader />
      <header className="agenda-heading agenda-heading--minimal">
        <h1 className="agenda-accessible-title">{uiText(1459)}</h1>
      </header>
      <p className="agenda-notice" role="status">
        {notice}
      </p>
      <section className="agenda-toolbar module-panel" aria-label={uiText(1460)}>
        <div className="agenda-sync-caption" aria-live="polite">
          <small>
            {!cloud?.enabled || cloud.status === "signed-out"
              ? uiText(1461)
              : (
                  {
                    disabled: uiText(1462),
                    "signed-out": uiText(1461),
                    loading: "",
                    syncing: "",
                    synced: "",
                    offline: uiText(1463),
                    conflict: uiText(1464),
                  } as const
                )[cloud.status]}
          </small>
          {cloud?.status === "conflict" && onNavigate && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("profile")}
            >
              {uiText(1465)}
            </button>
          )}
        </div>
        <div className="agenda-view-buttons" role="group" aria-label={uiText(1466)}>
          {(
            [
              ["day", uiText(2027)],
              ["week", uiText(2028)],
              ["month", uiText(1467)],
              ["list", uiText(1840)],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className="secondary-button agenda-tool"
              aria-label={label}
              title={label}
              aria-pressed={calendarView === value}
              onClick={() => {
                setSearching(false);
                setCalendarView(value);
              }}
            >
              <AgendaToolbarIcon name={value} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="agenda-filter-fields">
          <label className="field">
            {uiText(1468)}
            <input
              ref={searchInput}
              type="search"
              value={query}
              maxLength={120}
              onChange={(event) => {
                setQuery(event.target.value);
                if (!event.target.value.trim()) setSearching(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  searchAgenda();
                }
              }}
              placeholder={uiText(1469)}
            />
          </label>
          <div className="agenda-search-actions">
            <button
              type="button"
              className="secondary-button agenda-tool"
              aria-label={uiText(1470)}
              onClick={searchAgenda}
            >
              <AgendaDetailIcon name="search" />
              <span>{uiText(1470)}</span>
            </button>
            <AgendaFilters
              subjects={subjects}
              subject={subjectFilter}
              type={typeFilter}
              onSubject={setSubjectFilter}
              onType={setTypeFilter}
            />
          </div>
        </div>
        <div className="agenda-calendar-tools">
          <button
            type="button"
            className="secondary-button agenda-tool"
            aria-label={uiText(1471)}
            title={uiText(1471)}
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
            }}
          >
            <AgendaToolbarIcon name="export" />
            <span>{uiText(1472)}</span>
          </button>
          <label className="secondary-button agenda-tool agenda-import-label" title={uiText(1473)}>
            <AgendaToolbarIcon name="import" />
            <span>{uiText(1474)}</span>
            <input
              type="file"
              aria-label={uiText(1473)}
              accept=".ics,text/calendar"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 2000000) {
                  setNotice(uiText(1475));
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
                    uiText(2029, [
                      events.length,
                      imported.skipped,
                      imported.events.length - events.length,
                    ]),
                  );
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : uiText(808));
                }
              }}
            />
          </label>
          <button
            type="button"
            className="secondary-button agenda-tool"
            aria-label={uiText(681)}
            title={uiText(681)}
            onClick={() => window.print()}
          >
            <AgendaToolbarIcon name="print" />
            <span>{uiText(681)}</span>
          </button>
          <button
            type="button"
            className="secondary-button agenda-tool"
            aria-label={uiText(1476)}
            title={uiText(1476)}
            disabled={Boolean(notificationStatus)}
            onClick={async () => {
              if (typeof Notification === "undefined") {
                setNotificationStatus(uiText(1477));
                return;
              }
              try {
                const permission = await Notification.requestPermission();
                setNotificationStatus(permission === "granted" ? uiText(1478) : uiText(1479));
              } catch {
                setNotificationStatus(uiText(1480));
              }
            }}
          >
            <AgendaToolbarIcon name="reminders" />
            <span>{uiText(1481)}</span>
          </button>
        </div>
        {notificationStatus && (
          <aside className="agenda-notification" role="status">
            <AgendaToolbarIcon name="reminders" />
            <p>{notificationStatus}</p>
            <button
              type="button"
              className="icon-button"
              aria-label={uiText(1482)}
              onClick={() => setNotificationStatus("")}
            >
              <AgendaCloseIcon />
            </button>
            <span className="agenda-notification-countdown" aria-hidden="true" />
          </aside>
        )}
      </section>
      <div className="agenda-overview">
        <div className="agenda-calendar-column">
          {
            <section
              id="agenda-calendar"
              className="agenda-month module-panel"
              aria-label={calendarView === "month" ? uiText(1483) : uiText(194)}
            >
              <div className="agenda-calendar-controls">
                <AgendaMonthPicker value={selected} today={today} onChange={resetDate} />
                <button type="button" className="secondary-button" onClick={() => resetDate(today)}>
                  {uiText(1484)}
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
                  {intervalMode ? (intervalStart ? uiText(2030) : uiText(1485)) : uiText(2031)}
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
                    {uiText(1486)}
                  </button>
                )}
                <small id="agenda-range-hint">{uiText(3146)}</small>
              </div>
              <div className="agenda-weekdays" hidden={calendarView !== "month"}>
                {[
                  uiText(1581),
                  uiText(1582),
                  uiText(1583),
                  uiText(1584),
                  uiText(1585),
                  uiText(34),
                  uiText(1580),
                ].map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
              <div
                className="agenda-month-grid"
                ref={monthGrid}
                hidden={calendarView !== "month"}
                aria-describedby="agenda-range-hint"
                onPointerDown={(event) => {
                  if (!event.isPrimary) {
                    if (drag.current?.armed) setRange(drag.current.previous);
                    drag.current = null;
                    return;
                  }
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
                  suppressClick.current = false;
                  drag.current = {
                    pointer: event.pointerId,
                    start: date,
                    end: date,
                    previous: range,
                    since: performance.now(),
                    x: event.clientX,
                    y: event.clientY,
                    armed: false,
                  };
                }}
                onPointerMove={(event) => {
                  const active = drag.current;
                  if (!active || active.pointer !== event.pointerId) return;
                  if (!active.armed) {
                    if (performance.now() - active.since < 350) {
                      if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8)
                        drag.current = null;
                      return;
                    }
                    active.armed = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
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
                  if (!active.armed) return;
                  suppressClick.current = true;
                  window.setTimeout(() => {
                    suppressClick.current = false;
                  }, 0);
                  setSelected(active.end);
                  setRange(
                    active.start === active.end ? null : orderedRange(active.start, active.end),
                  );
                  setDayOpen(active.start === active.end);
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={() => {
                  if (drag.current) setRange(drag.current.previous);
                  drag.current = null;
                  suppressClick.current = true;
                }}
                onPointerLeave={() => {
                  if (drag.current && !drag.current.armed) drag.current = null;
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  if (drag.current) {
                    const active = drag.current;
                    drag.current = null;
                    suppressClick.current = true;
                    setRange(active.previous);
                    if (event.currentTarget.hasPointerCapture(active.pointer))
                      event.currentTarget.releasePointerCapture(active.pointer);
                  }
                  setIntervalMode(false);
                  setIntervalStart(null);
                }}
                onLostPointerCapture={(event) => {
                  // Touch starts with implicit capture on the date artwork. Its
                  // release bubbles when the deliberate drag captures the grid.
                  if (event.target !== event.currentTarget) return;
                  if (drag.current) {
                    setRange(drag.current.previous);
                    suppressClick.current = true;
                  }
                  drag.current = null;
                }}
              >
                {dates.map((date) => {
                  const dayEvents = displayEventsOn(visibleEvents, date, timeZone);
                  const dayTasks = visibleTasks.filter(
                    (task) => task.dueDate === date && !task.completed,
                  );
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
                      aria-label={uiText(2032, [
                        dayLabel(date, true),
                        count,
                        minutes > 0 ? uiText(2571, [minutes]) : "",
                        holiday ? uiText(2572, [uiText(holiday)]) : "",
                      ])}
                      title={[uiText(holiday ?? ""), ...dayEvents.map((item) => item.title)]
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
                            {count === 1 ? "item" : uiText(2587)}
                          </span>
                        </small>
                      )}
                      {dayEvents.slice(0, 2).map((item) => (
                        <small className="agenda-month-event-title" key={item.id}>
                          <AgendaAttachmentPreview attachments={item.attachments} compact />
                          <i
                            style={{
                              background:
                                item.color ?? (item.kind === "study" ? "#7c3aed" : "#facc15"),
                            }}
                          />
                          {item.title}
                        </small>
                      ))}
                      {dayTasks.slice(0, Math.max(0, 2 - dayEvents.length)).map((task) => (
                        <small className="agenda-month-event-title" key={task.id}>
                          <i style={{ background: task.color ?? "#7c3aed" }} />
                          {task.title}
                        </small>
                      ))}
                      {count > 2 && (
                        <small className="agenda-month-more">
                          +{count - 2} {uiText(1488)}
                        </small>
                      )}
                    </button>
                  );
                })}
              </div>
              <small className="agenda-holiday-legend" hidden={calendarView !== "month"}>
                {uiText(1489)}
              </small>
              {calendarView !== "month" && (
                <AgendaCalendarViews
                  timeZone={timeZone}
                  searchResults={searching}
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
                  renderEvent={(event, date) => eventCard(event, date, true)}
                  renderTask={taskCard}
                  onMove={(event, from, to, time) => {
                    const original = workspace.events.find((item) => item.id === event.id) ?? event;
                    const moved = zonedDateTime(
                      eventInstant(to, time, timeZone),
                      original.timeZone ?? timeZone,
                    );
                    const changes = {
                      ...original,
                      date: moved.date,
                      time: moved.time,
                      calendarDurationMinutes: occurrenceDuration(original, from),
                      endDate: "",
                      endTime: "",
                    };
                    const end = eventEnd(changes);
                    const saved = saveGridEvent(original, from, {
                      ...changes,
                      endDate: end.date,
                      endTime: end.time,
                    });
                    if (saved) setSelected(to);
                  }}
                  onResize={(event, date, minutes) => {
                    const original = workspace.events.find((item) => item.id === event.id) ?? event;
                    const changes = {
                      ...original,
                      date,
                      durationMinutes: Math.min(180, minutes),
                      calendarDurationMinutes: minutes,
                      endDate: "",
                      endTime: "",
                    };
                    const end = eventEnd(changes);
                    saveGridEvent(original, date, {
                      ...changes,
                      endDate: end.date,
                      endTime: end.time,
                    });
                  }}
                />
              )}
            </section>
          }
        </div>
        <div className="agenda-study-column">
          <AgendaStudyHistory
            history={history}
            {...(onNavigate ? { onNavigate } : {})}
            workspace={workspace}
            range={range ?? { start: selected, end: selected }}
          />
          {dayPanel}
        </div>
      </div>
      <div className="agenda-layout">
        <aside className="agenda-aside">
          {pending.length > 0 && (
            <section className="module-panel">
              <h2>{uiText(1490)}</h2>
              {pending.map((task) => (
                <article className="agenda-pending" key={task.id}>
                  <strong>{task.title}</strong>
                  <small>
                    {uiText(1491)} {dateForKey(task.dueDate).toLocaleDateString(uiLocale())}
                  </small>
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={uiText(2033, [task.title])}
                    onClick={() => {
                      dispatch({
                        type: "task/updated",
                        id: task.id,
                        changes: { title: task.title, subjectId: task.subjectId, dueDate: today },
                      });
                      setNotice(uiText(1492));
                    }}
                  >
                    {uiText(1493)} <PaperArrow />
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
              <h2 id="agenda-dialog-title">{draft.id ? uiText(2034) : uiText(1494)}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label={uiText(1495)}
                disabled={formBusy}
                onClick={() => setDraft(null)}
              >
                <AgendaCloseIcon />
              </button>
            </header>
            <form onSubmit={save} className="compact-form">
              <PaperChoice
                label={uiText(1315)}
                value={draft.kind}
                disabled={Boolean(draft.id)}
                options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
                onChange={(value) =>
                  setDraft({ ...draft, kind: value as Kind, minutes: value === "goal" ? 300 : 25 })
                }
              />
              <label className="field">
                <span>{draft.kind === "subject" ? uiText(1496) : uiText(284)}</span>
                <input
                  autoFocus
                  value={draft.title}
                  maxLength={120}
                  required
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder={draft.kind === "study" ? uiText(1497) : uiText(1498)}
                />
              </label>
              {draft.kind !== "subject" && (
                <>
                  <PaperChoice
                    label={uiText(1270)}
                    value={draft.subjectId}
                    options={subjectOptions}
                    onChange={(value) => setDraft({ ...draft, subjectId: value })}
                  />
                  <div className="field-row">
                    <PaperDateField
                      label={
                        draft.kind === "task" || draft.kind === "goal" ? uiText(2035) : uiText(2036)
                      }
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
                  {draft.kind === "task" && (
                    <AgendaColorPalette
                      label={uiText(1499)}
                      value={draft.color}
                      onChange={(color) => setDraft({ ...draft, color })}
                    />
                  )}
                  {draft.kind !== "task" && !draft.allDay && (
                    <AgendaDurationClock
                      value={draft.minutes}
                      max={draft.kind === "goal" ? 10000 : draft.kind === "study" ? 180 : 527040}
                      onChange={(minutes) => {
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
                  )}
                  {(draft.kind === "study" || draft.kind === "appointment") && (
                    <>
                      <div className="field">
                        <span>{uiText(1500)}</span>
                        <div
                          className="agenda-repeat-options"
                          role="group"
                          aria-label={uiText(1500)}
                        >
                          {(["none", "weekly"] as const).map((value) => (
                            <button
                              type="button"
                              key={value}
                              aria-label={value === "none" ? uiText(1091) : uiText(2037)}
                              title={value === "none" ? uiText(1091) : uiText(2038)}
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
                        label={uiText(1501)}
                        value={draft.recurrence}
                        options={Object.entries(recurrenceLabels).map(([value, label]) => ({
                          value,
                          label: uiText(label),
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
                          setDraft((current) => {
                            if (!current) return null;
                            const minutes = Math.round(
                              (eventInstant(value.endDate, value.endTime, value.timeZone) -
                                eventInstant(current.date, current.time, value.timeZone)) /
                                60000,
                            );
                            return {
                              ...current,
                              ...value,
                              ...(Number.isFinite(minutes) && minutes > 0 ? { minutes } : {}),
                            };
                          })
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
                          label={uiText(1502)}
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
                            label={uiText(1503)}
                            value={draft.scope}
                            options={[
                              { value: "all", label: uiText(1504) },
                              { value: "this", label: uiText(1505) },
                              { value: "following", label: uiText(1506) },
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
                      {uiText(1363)} {draft.title}?{" "}
                      {draft.scope === "this"
                        ? uiText(1507)
                        : draft.scope === "following"
                          ? uiText(1508)
                          : uiText(1509)}{" "}
                      {uiText(1510)}
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setDeleteRequested(false)}
                    >
                      {uiText(1511)}
                    </button>
                  </div>
                )}
                {draft.id && (
                  <button
                    type="button"
                    className="secondary-button agenda-delete"
                    aria-label={deleteRequested ? uiText(1512) : uiText(1363)}
                    title={deleteRequested ? uiText(1512) : uiText(1363)}
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
                      setNotice(uiText(1513));
                    }}
                  >
                    <PaperEditorIcon name="trash" />
                  </button>
                )}
                <button className="primary-button" type="submit" disabled={formBusy}>
                  {draft.id ? uiText(1514) : uiText(2039)} <PaperArrow />
                </button>
              </footer>
            </form>
          </>
        )}
      </dialog>
    </main>
  );
}
