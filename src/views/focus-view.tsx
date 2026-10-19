import { uiWeekdays, uiText, useLanguage, uiLocale } from "../i18n/runtime";
import { readStudentResume, saveStudentResume } from "../data/student-resume";
import { Plus } from "lucide-react";
import { FocusPaperArrow } from "../components/focus-paper-arrow";
import { FocusRose } from "../components/focus-art";
import { AnimatedPomodoroTomato } from "../components/pomodoro-tomato";
import { useDisplayedTomatoStage } from "../hooks/use-displayed-tomato-stage";
import { focusFlowerState } from "../domain/focus-flower";
import { formatFocusDuration } from "../domain/pomodoro-duration";
import { useWallClock } from "../hooks/use-wall-clock";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { FOCUS_SESSION_KEY, readFocusSession, type FocusSession } from "../domain/focus-session";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { PaperDigits } from "../components/paper-digits";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import "../components/paper-object-controls.css";
import { useEffect, useRef, useState, type Dispatch, type FormEvent } from "react";
import { PageHeader } from "../components/app-navigation";
import { SYNCED_STORAGE_APPLIED_EVENT, writeSyncedStorage } from "../data/synced-storage";
import { SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import { focusDeviceId } from "../data/focus-device";
import {
  minutesFocusedForSubject,
  toDateKey,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

type FocusViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

const FULL_BLOOM_MINUTES = 60;
const POMODORO_SHORT_BREAK_MINUTES = 5;
const POMODORO_LONG_BREAK_MINUTES = 15;
const POMODORO_STREAK_KEY = "noteoli.pomodoro-streak.v1";
type TimerMode = "timer" | "pomodoro";
type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

export function nextPomodoroStep(
  phase: PomodoroPhase,
  completed: number,
  longBreaks = true,
  focusMinutes = 25,
  shortBreakMinutes = POMODORO_SHORT_BREAK_MINUTES,
  longBreakMinutes = POMODORO_LONG_BREAK_MINUTES,
) {
  if (phase === "focus") {
    const nextCompleted = completed + 1;
    const longBreak = longBreaks && nextCompleted % 4 === 0;
    return {
      phase: longBreak ? ("longBreak" as const) : ("shortBreak" as const),
      duration: longBreak ? longBreakMinutes : shortBreakMinutes,
      completed: nextCompleted,
    };
  }
  return { phase: "focus" as const, duration: focusMinutes, completed };
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function calendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatTimer(totalSeconds: number): string {
  if (totalSeconds >= 3600) return formatStopwatch(totalSeconds * 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatStopwatch(totalMilliseconds: number): string {
  const seconds = Math.floor(totalMilliseconds / 1000) % 60;
  const minutes = Math.floor(totalMilliseconds / 60000) % 60;
  const hours = Math.floor(totalMilliseconds / 3600000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function weekDays(reference = new Date()) {
  const monday = new Date(reference);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(reference.getDate() - ((reference.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { key: toDateKey(date), label: "STQQSSD"[index] };
  });
}

function FocusPaperControlIcon({ paused }: { paused: boolean }) {
  useLanguage();

  return (
    <svg
      className={`focus-paper-control-icon ${paused ? "is-pause" : "is-play"}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path className="focus-paper-control-icon__depth" d="M7 7 42 25 9 44Z" />
      {paused ? (
        <>
          <path className="focus-paper-control-icon__face" d="m8 5 14 4-2 33-13-2Z" />
          <path className="focus-paper-control-icon__face" d="m27 8 14-3-1 35-13 3Z" />
          <path className="focus-paper-control-icon__fold" d="m8 5 14 4-6 6-8-2Z" />
        </>
      ) : (
        <>
          <path className="focus-paper-control-icon__face" d="M5 4 40 22 7 41Z" />
          <path className="focus-paper-control-icon__fold" d="m5 4 35 18-21 1Z" />
        </>
      )}
    </svg>
  );
}

export function FocusView({ workspace, dispatch }: FocusViewProps) {
  useLanguage();

  const [deviceId] = useState(focusDeviceId);
  const sharedSnapshot = useRef("");
  const [restored] = useState(() => {
    const session = readFocusSession(localStorage.getItem(FOCUS_SESSION_KEY), Date.now(), deviceId);
    if (
      session &&
      !session.running &&
      session.phase === "focus" &&
      session.secondsRemaining === session.duration * 60
    ) {
      const duration = workspace.focusPreferences.pomodoroMinutes;
      return { ...session, duration, secondsRemaining: duration * 60 };
    }
    return session;
  });
  const hasSession = useRef(Boolean(restored));
  const ownsSession = useRef(!restored?.deviceId || restored.deviceId === deviceId);
  const defaultSubject =
    workspace.subjects.find((subject) => subject.id === restored?.subjectId) ??
    workspace.subjects[0];
  const [mode, setMode] = useState<TimerMode>(
    restored?.mode ?? readStudentResume().focus?.mode ?? "timer",
  );
  useEffect(() => {
    saveStudentResume({ focus: { mode, at: Date.now() } });
  }, [mode]);
  const [modeDirection, setModeDirection] = useState(1);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>(restored?.phase ?? "focus");
  const [completedPomodoros, setCompletedPomodoros] = useState(restored?.completed ?? 0);
  const [duration, setDuration] = useState<number>(
    restored?.duration ?? workspace.focusPreferences.pomodoroMinutes,
  );
  const [secondsRemaining, setSecondsRemaining] = useState(
    restored?.secondsRemaining ?? duration * 60,
  );
  const [timerElapsedMilliseconds, setTimerElapsedMilliseconds] = useState(() =>
    restored?.running && restored.mode === "timer" && restored.timerStartedAt !== null
      ? Date.now() - restored.timerStartedAt
      : (restored?.elapsedMilliseconds ?? 0),
  );
  const timerStartedAt = useRef<number | null>(restored?.timerStartedAt ?? null);
  const pomodoroDeadline = useRef<number | null>(restored?.pomodoroDeadline ?? null);
  const [running, setRunning] = useState(restored?.running ?? false);
  const [pomodoroDays, setPomodoroDays] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(POMODORO_STREAK_KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const refresh = () => {
      try {
        setPomodoroDays(JSON.parse(localStorage.getItem(POMODORO_STREAK_KEY) ?? "[]") as string[]);
      } catch {
        setPomodoroDays([]);
      }
    };
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    return () => window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
  }, []);

  useEffect(() => {
    document.body.classList.add("focus-page-active");
    return () => document.body.classList.remove("focus-page-active");
  }, []);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAmount, setGoalAmount] = useState(300);
  const [deadline, setDeadline] = useState(toDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => dateFromKey(deadline));
  const now = useWallClock();
  const pomodoroElapsedSeconds = duration * 60 - secondsRemaining;
  const elapsedSeconds =
    mode === "timer" ? Math.floor(timerElapsedMilliseconds / 1000) : pomodoroElapsedSeconds;
  const persistedTimerSeconds = Math.floor(timerElapsedMilliseconds / 1000);
  useEffect(() => {
    if (!ownsSession.current) return;
    if (
      !hasSession.current &&
      mode === "timer" &&
      !running &&
      persistedTimerSeconds === 0 &&
      pomodoroPhase === "focus" &&
      completedPomodoros === 0
    )
      return;
    hasSession.current = true;
    const session: FocusSession = {
      mode,
      phase: pomodoroPhase,
      completed: completedPomodoros,
      duration,
      secondsRemaining,
      elapsedMilliseconds: persistedTimerSeconds * 1000,
      running,
      timerStartedAt: timerStartedAt.current,
      pomodoroDeadline: pomodoroDeadline.current,
      savedAt: Date.now(),
      deviceId,
      ...(restored?.agendaEventId
        ? {
            agendaEventId: restored.agendaEventId,
            agendaDate: restored.agendaDate,
            subjectId: restored.subjectId,
            plannedMinutes: restored.plannedMinutes,
          }
        : {}),
    };
    localStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
    const signature = `${mode}:${pomodoroPhase}:${completedPomodoros}:${duration}:${running}:${Math.floor(persistedTimerSeconds / 30)}:${Math.floor(secondsRemaining / 30)}`;
    if (sharedSnapshot.current !== signature) {
      sharedSnapshot.current = signature;
      window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
    }
  }, [
    mode,
    pomodoroPhase,
    completedPomodoros,
    duration,
    secondsRemaining,
    persistedTimerSeconds,
    running,
    restored,
    deviceId,
  ]);
  useEffect(() => {
    const publish = () => window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
    window.addEventListener("pagehide", publish);
    return () => {
      window.removeEventListener("pagehide", publish);
      publish();
    };
  }, []);

  useEffect(() => {
    if (!running || mode !== "timer") return;
    timerStartedAt.current ??= Date.now();
    const timer = window.setInterval(() => {
      setTimerElapsedMilliseconds(Date.now() - (timerStartedAt.current ?? Date.now()));
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode, running]);

  useEffect(() => {
    if (!running || mode !== "pomodoro") return;
    pomodoroDeadline.current ??= Date.now() + secondsRemaining * 1000;
    const timer = window.setInterval(() => {
      const now = Date.now();
      let deadline = pomodoroDeadline.current!;
      let phase = pomodoroPhase;
      let completed = completedPomodoros;
      let minutes = duration;
      const days: string[] = [];
      while (now >= deadline) {
        if (phase === "focus") {
          dispatch({
            type: "focus/recorded",
            mode: "pomodoro",
            subjectId: defaultSubject?.id ?? "",
            durationMinutes: minutes,
            completedAt: new Date(deadline).toISOString(),
            ...(restored?.agendaEventId
              ? { agendaEventId: restored.agendaEventId, agendaDate: restored.agendaDate }
              : {}),
          });
          days.push(toDateKey(new Date(deadline)));
        }
        const next = nextPomodoroStep(
          phase,
          completed,
          workspace.focusPreferences.longBreaks,
          workspace.focusPreferences.pomodoroMinutes,
          workspace.focusPreferences.shortBreakMinutes ?? 5,
          workspace.focusPreferences.longBreakMinutes ?? 15,
        );
        phase = next.phase;
        completed = next.completed;
        minutes = next.duration;
        deadline += minutes * 60_000;
      }
      pomodoroDeadline.current = deadline;
      setPomodoroPhase(phase);
      setCompletedPomodoros(completed);
      setDuration(minutes);
      setSecondsRemaining(Math.ceil((deadline - now) / 1000));
      if (days.length) {
        const nextDays = [...new Set([...pomodoroDays, ...days])];
        setPomodoroDays(nextDays);
        writeSyncedStorage(POMODORO_STREAK_KEY, JSON.stringify(nextDays));
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [
    completedPomodoros,
    defaultSubject?.id,
    dispatch,
    duration,
    mode,
    pomodoroPhase,
    running,
    secondsRemaining,
    pomodoroDays,
    workspace.focusPreferences.longBreaks,
    workspace.focusPreferences.pomodoroMinutes,
    workspace.focusPreferences.shortBreakMinutes,
    workspace.focusPreferences.longBreakMinutes,
    restored,
  ]);

  const tomatoStage = useDisplayedTomatoStage(pomodoroPhase, secondsRemaining / (duration * 60));
  if (!defaultSubject) return null;
  const subject = defaultSubject;

  function chooseDuration(minutes: number) {
    ownsSession.current = true;
    setDuration(minutes);
    setSecondsRemaining(minutes * 60);
    setRunning(false);
    pomodoroDeadline.current = null;
  }

  function chooseMode(nextMode: TimerMode) {
    setMode(nextMode);
    setPomodoroPhase("focus");
    setCompletedPomodoros(0);
    setGoalAmount(nextMode === "pomodoro" ? 4 : 300);
    chooseDuration(workspace.focusPreferences.pomodoroMinutes);
    setTimerElapsedMilliseconds(0);
    timerStartedAt.current = null;
  }

  function slideMode(direction: -1 | 1) {
    setModeDirection(direction);
    chooseMode(mode === "timer" ? "pomodoro" : "timer");
  }

  function reset() {
    ownsSession.current = true;
    setRunning(false);
    pomodoroDeadline.current = null;
    if (mode === "timer") {
      setTimerElapsedMilliseconds(0);
      timerStartedAt.current = null;
    } else {
      setSecondsRemaining(duration * 60);
    }
  }

  function toggleRunning() {
    ownsSession.current = true;
    const next = !running;
    if (!next && mode === "timer" && timerStartedAt.current !== null) {
      setTimerElapsedMilliseconds(Date.now() - timerStartedAt.current);
    }
    timerStartedAt.current =
      next && mode === "timer" ? Date.now() - timerElapsedMilliseconds : null;
    if (mode === "pomodoro") {
      if (!next && pomodoroDeadline.current !== null)
        setSecondsRemaining(Math.max(0, Math.ceil((pomodoroDeadline.current - Date.now()) / 1000)));
      pomodoroDeadline.current = next ? Date.now() + secondsRemaining * 1000 : null;
    }
    setRunning(next);
  }

  function finish() {
    if (elapsedSeconds < (restored?.agendaEventId ? 60 : 1)) return;
    if (mode === "timer" || pomodoroPhase === "focus") {
      dispatch({
        type: "focus/recorded",
        mode,
        subjectId: subject.id,
        durationMinutes: restored?.agendaEventId
          ? Math.floor(elapsedSeconds / 60)
          : Math.max(1, Math.round(elapsedSeconds / 60)),
        completedAt: new Date().toISOString(),
        ...(restored?.agendaEventId
          ? { agendaEventId: restored.agendaEventId, agendaDate: restored.agendaDate }
          : {}),
      });
    }
    reset();
  }

  const liveMinutes = elapsedSeconds / 60;
  const flower = focusFlowerState(
    workspace.focusSessions,
    now,
    agendaTimeZone(),
    mode === "timer" && running ? liveMinutes : 0,
  );
  const todayMinutes = flower.minutesToday;
  const bloomProgress = flower.progress;
  const caredToday = todayMinutes > 0;
  const missedYesterday = flower.wilted;
  const focusedMinutes = minutesFocusedForSubject(workspace, subject.id);
  const subjectGoals = workspace.goals.filter((goal) => goal.subjectId === subject.id);

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalTitle.trim();
    if (!title) return;
    const targetMinutes =
      mode === "pomodoro" ? goalAmount * workspace.focusPreferences.pomodoroMinutes : goalAmount;
    dispatch({ type: "goal/added", subjectId: subject.id, title, targetMinutes, deadline });
    setGoalTitle("");
  }

  const todayKey = toDateKey(new Date());
  const selectedDeadline = dateFromKey(deadline);
  const days = calendarDays(calendarMonth);

  return (
    <main className="main-content focus-page" id="main-content">
      <PageHeader />
      <div className="focus-layout">
        <section className="focus-card" aria-labelledby="focus-timer-title">
          <div className="focus-mode-carousel">
            <button
              className="focus-mode-arrow focus-mode-arrow--previous"
              type="button"
              disabled={running || elapsedSeconds > 0}
              onClick={() => slideMode(-1)}
              aria-label={uiText(1159)}
            >
              <FocusPaperArrow />
            </button>
            <div className="focus-mode-viewport">
              <span className="focus-mode-name" aria-live="polite">
                {mode === "timer" ? uiText(103) : uiText(1606)}
              </span>
              <div
                className={`focus-mode-slide${modeDirection < 0 ? " is-backward" : ""}`}
                key={mode}
              >
                <div
                  className={`focus-rose-stage${mode === "pomodoro" ? " focus-rose-stage--pomodoro" : ""}`}
                >
                  {mode === "timer" ? (
                    <FocusRose progress={bloomProgress} wilted={flower.wilted} />
                  ) : (
                    <div className="pomodoro-dial">
                      <AnimatedPomodoroTomato stage={tomatoStage} />
                      <div className="pomodoro-dial__time">
                        <img
                          className="pomodoro-worm"
                          src="/pomodoro-tomato/minhoca.svg"
                          alt=""
                          aria-hidden="true"
                          width="320"
                          height="120"
                          draggable={false}
                        />
                        <h2
                          id="focus-timer-title"
                          className={`timer${secondsRemaining >= 3600 ? " timer--hours" : ""}`}
                        >
                          <PaperDigits value={formatTimer(secondsRemaining)} />
                        </h2>
                        {pomodoroPhase !== "focus" && <p>{uiText(1160)}</p>}
                      </div>
                    </div>
                  )}
                  <div className="focus-rose-copy">
                    <span>
                      {mode === "pomodoro"
                        ? pomodoroPhase === "longBreak"
                          ? uiText(1957)
                          : pomodoroPhase === "shortBreak"
                            ? uiText(1958)
                            : ""
                        : caredToday
                          ? uiText(1959)
                          : uiText(1161)}
                    </span>
                    <strong>
                      {mode === "pomodoro"
                        ? pomodoroPhase === "longBreak"
                          ? uiText(1162)
                          : pomodoroPhase === "shortBreak"
                            ? uiText(1163)
                            : ""
                        : !flower.hasHistory && !running
                          ? uiText(
                              "Sua flor está adormecida. Comece seu primeiro cronômetro para cuidar dela.",
                            )
                          : missedYesterday && !caredToday
                            ? uiText(1164)
                            : caredToday
                              ? uiText(1165)
                              : uiText(1166)}
                    </strong>
                    {mode === "timer" ? (
                      <small>
                        {Math.min(FULL_BLOOM_MINUTES, Math.floor(todayMinutes + liveMinutes))}/
                        {FULL_BLOOM_MINUTES} {uiText(1167)}
                      </small>
                    ) : (
                      <div className="pomodoro-progress">
                        <span>{uiText(1168)}</span>
                        <div className="pomodoro-week">
                          {weekDays().map((day) => (
                            <span className="pomodoro-week__day" key={day.key}>
                              <i
                                className={`streak-tomato${pomodoroDays.includes(day.key) ? " is-active" : ""}`}
                                aria-hidden="true"
                              />
                              <small>{day.label}</small>
                            </span>
                          ))}
                        </div>
                        <small>
                          {uiText("{0} de estudo · {1} de pausa", [
                            formatFocusDuration(workspace.focusPreferences.pomodoroMinutes),
                            formatFocusDuration(workspace.focusPreferences.shortBreakMinutes ?? 5),
                          ])}
                          {workspace.focusPreferences.longBreaks
                            ? ` · ${uiText("{0} após quatro rodadas", [formatFocusDuration(workspace.focusPreferences.longBreakMinutes ?? 15)])}`
                            : uiText(1171)}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                {mode === "timer" && (
                  <h2 id="focus-timer-title" className="timer timer--stopwatch" aria-live="off">
                    <PaperDigits value={formatStopwatch(timerElapsedMilliseconds)} />
                  </h2>
                )}
                <div className="timer-controls">
                  <button
                    className="primary-button timer-primary"
                    type="button"
                    onClick={toggleRunning}
                  >
                    <FocusPaperControlIcon paused={running} />
                    {running ? uiText(1960) : elapsedSeconds > 0 ? uiText(1436) : uiText(1172)}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={reset}
                    aria-label={uiText(1173)}
                  >
                    <PaperEditorIcon name="reset" />
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={finish}
                    disabled={elapsedSeconds < (restored?.agendaEventId ? 60 : 1)}
                  >
                    {uiText(1174)}
                  </button>
                </div>
              </div>
            </div>
            <button
              className="focus-mode-arrow focus-mode-arrow--next"
              type="button"
              disabled={running || elapsedSeconds > 0}
              onClick={() => slideMode(1)}
              aria-label={uiText(1175)}
            >
              <FocusPaperArrow />
            </button>
          </div>
        </section>
      </div>

      <div className="learn-grid focus-goals focus-goals--hidden" style={{ display: "none" }}>
        <section className="module-panel" aria-labelledby="new-goal-title">
          <div className="module-heading">
            <h2 id="new-goal-title">{uiText(1176)}</h2>
          </div>
          <form className="compact-form" onSubmit={addGoal}>
            <label className="field">
              <span>{uiText(1059)}</span>
              <input
                value={goalTitle}
                onChange={(event) => setGoalTitle(event.target.value)}
                placeholder={uiText(1177)}
                required
              />
            </label>
            <div className="focus-goal-grid">
              <label className="field focus-goal-amount">
                <span>{mode === "pomodoro" ? uiText(1961) : uiText(1962)}</span>
                <input
                  type="number"
                  min="1"
                  step={mode === "pomodoro" ? 1 : 5}
                  value={goalAmount}
                  onChange={(event) => setGoalAmount(Number(event.target.value))}
                  required
                />
              </label>
              <div className="paper-calendar" aria-label={uiText(1178)}>
                <div className="paper-calendar__heading">
                  <button
                    type="button"
                    aria-label={uiText(84)}
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                      )
                    }
                  >
                    ‹
                  </button>
                  <strong>
                    {new Intl.DateTimeFormat(uiLocale(), { month: "long", year: "numeric" }).format(
                      calendarMonth,
                    )}
                  </strong>
                  <button
                    type="button"
                    aria-label={uiText(85)}
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                      )
                    }
                  >
                    ›
                  </button>
                </div>
                <div className="paper-calendar__week" aria-hidden="true">
                  {uiWeekdays().map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>
                <div className="paper-calendar__days">
                  {days.map((date) => {
                    const dateKey = toDateKey(date);
                    const outside = date.getMonth() !== calendarMonth.getMonth();
                    const inRange = dateKey >= todayKey && dateKey <= deadline;
                    return (
                      <button
                        className={`${outside ? "is-outside " : ""}${inRange ? "is-in-range " : ""}${dateKey === todayKey ? "is-start " : ""}${dateKey === deadline ? "is-end" : ""}`}
                        type="button"
                        disabled={dateKey < todayKey}
                        aria-label={date.toLocaleDateString(uiLocale(), {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        aria-pressed={dateKey === deadline}
                        onClick={() => setDeadline(dateKey)}
                        key={dateKey}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
                <p>
                  {uiText(1179)} {selectedDeadline.toLocaleDateString(uiLocale())}
                </p>
              </div>
            </div>
            <button className="secondary-button" type="submit">
              <Plus size={16} /> {uiText(1180)}
            </button>
          </form>
        </section>

        <section className="module-panel goals-panel" aria-labelledby="goal-list-title">
          <div className="module-heading">
            <h2 id="goal-list-title">{uiText(1181)}</h2>
            <span>
              {focusedMinutes} {uiText(1182)} {subject.name}
            </span>
          </div>
          {subjectGoals.length === 0 ? (
            <div className="empty-state">
              <p>{uiText(1183)}</p>
            </div>
          ) : (
            <ul className="goal-list">
              {subjectGoals.map((goal) => {
                const progress = Math.min(
                  100,
                  Math.round((focusedMinutes / goal.targetMinutes) * 100),
                );
                return (
                  <li className={goal.completed ? "is-complete" : undefined} key={goal.id}>
                    <button
                      type="button"
                      aria-label={`${goal.completed ? uiText(1963) : uiText(25)} ${goal.title}`}
                      onClick={() => dispatch({ type: "goal/toggled", id: goal.id })}
                    >
                      <PaperCheckIcon size={15} />
                    </button>
                    <div>
                      <strong>{goal.title}</strong>
                      <small>
                        {progress}% · {focusedMinutes}/{goal.targetMinutes} {uiText(1184)}{" "}
                        {goal.deadline}
                      </small>
                      <span>
                        <i style={{ width: `${progress}%` }} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
