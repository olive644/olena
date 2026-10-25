import { uiText, useLanguage } from "../i18n/runtime";
import { readStudentResume, saveStudentResume } from "../data/student-resume";
import { FocusPaperArrow } from "../components/focus-paper-arrow";
import { FocusRose } from "../components/focus-art";
import { PomodoroDial } from "../components/pomodoro-dial";
import { useDisplayedTomatoStage } from "../hooks/use-displayed-tomato-stage";
import { focusFlowerState } from "../domain/focus-flower";
import { PomodoroFloating } from "../components/pomodoro-floating";
import { PomodoroControls } from "../components/pomodoro-controls";
import { requestPomodoroNotifications, notifyPomodoroPhase } from "../data/pomodoro-notifications";
import { playPomodoroSound } from "../data/pomodoro-sfx";
import { formatFocusDuration } from "../domain/pomodoro-duration";
import { useWallClock } from "../hooks/use-wall-clock";
import { agendaTimeZone } from "../data/agenda-time-zone";
import {
  FOCUS_SESSION_KEY,
  FOCUS_HEARTBEAT_LIMIT,
  readFocusSession,
  type FocusSession,
} from "../domain/focus-session";
import { PaperDigits } from "../components/paper-digits";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import "../components/paper-object-controls.css";
import { useEffect, useRef, useState, type Dispatch } from "react";
import { PageHeader } from "../components/app-navigation";
import { SYNCED_STORAGE_APPLIED_EVENT, writeSyncedStorage } from "../data/synced-storage";
import { SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import { focusDeviceId } from "../data/focus-device";
import { toDateKey, type WorkspaceAction, type WorkspaceState } from "../domain/workspace";

type FocusViewProps = {
  initialMaterialId?: string;
  onMaterial?: (id: string) => void;
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

function formatTimer(totalSeconds: number): string {
  return formatStopwatch(totalSeconds * 1000).slice(totalSeconds >= 3600 ? 0 : 3);
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

export function FocusView({ workspace, dispatch, initialMaterialId, onMaterial }: FocusViewProps) {
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
  // O vínculo com a agenda vale só para a sessão recém-aberta pela agenda. Vínculo de dia antigo ou já
  // encerrado não pode exigir 1 minuto nem registrar em outro compromisso.
  const [agendaLink, setAgendaLink] = useState(() =>
    restored?.agendaEventId &&
    restored.agendaDate &&
    restored.agendaDate >= toDateKey(new Date(Date.now() - 86_400_000))
      ? restored
      : undefined,
  );
  const hasSession = useRef(Boolean(restored));
  const [materialId] = useState(
    restored?.materialId ?? (!restored ? initialMaterialId : undefined),
  );
  const material = workspace.materials.find((item) => item.id === materialId);
  const ownsSession = useRef(!restored?.deviceId || restored.deviceId === deviceId);
  const defaultSubject =
    workspace.subjects.find((subject) => subject.id === restored?.subjectId) ??
    workspace.subjects.find((subject) => subject.id === material?.subjectId) ??
    workspace.subjects[0];
  const [mode, setMode] = useState<TimerMode>(
    restored?.mode ?? (material ? "pomodoro" : (readStudentResume().focus?.mode ?? "timer")),
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
  const lastHeartbeat = useRef(0);
  useEffect(() => {
    if (running) lastHeartbeat.current = Date.now();
  }, [running]);
  const askedNotification = useRef(false);
  const [notificationStatus, setNotificationStatus] = useState<
    NotificationPermission | "unsupported" | ""
  >("");
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
      ...(materialId ? { materialId } : {}),
      ...(defaultSubject ? { subjectId: defaultSubject.id } : {}),
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
      ...(agendaLink?.agendaEventId
        ? {
            agendaEventId: agendaLink.agendaEventId,
            agendaDate: agendaLink.agendaDate,
            subjectId: agendaLink.subjectId,
            plannedMinutes: agendaLink.plannedMinutes,
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
    agendaLink,
    deviceId,
    defaultSubject,
    materialId,
  ]);
  useEffect(() => {
    const publish = () => window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
    const leave = () => {
      if (ownsSession.current) {
        const snapshot = readFocusSession(
          localStorage.getItem(FOCUS_SESSION_KEY),
          Date.now(),
          deviceId,
        );
        if (snapshot && (!snapshot.deviceId || snapshot.deviceId === deviceId)) {
          localStorage.setItem(
            FOCUS_SESSION_KEY,
            JSON.stringify({
              ...snapshot,
              running: false,
              timerStartedAt: null,
              pomodoroDeadline: null,
            }),
          );
        }
      }
      publish();
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      publish();
    };
  }, [deviceId]);

  useEffect(() => {
    if (!running || mode !== "timer") return;
    timerStartedAt.current ??= Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - lastHeartbeat.current > FOCUS_HEARTBEAT_LIMIT) {
        timerStartedAt.current = null;
        setRunning(false);
        return;
      }
      lastHeartbeat.current = Date.now();
      setTimerElapsedMilliseconds(Date.now() - (timerStartedAt.current ?? Date.now()));
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode, running]);

  useEffect(() => {
    if (!running || mode !== "pomodoro") return;
    pomodoroDeadline.current ??= Date.now() + secondsRemaining * 1000;
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastHeartbeat.current > FOCUS_HEARTBEAT_LIMIT) {
        pomodoroDeadline.current = null;
        setRunning(false);
        return;
      }
      lastHeartbeat.current = now;
      let deadline = pomodoroDeadline.current!;
      let phase = pomodoroPhase;
      let completed = completedPomodoros;
      let minutes = duration;
      const days: string[] = [];
      let lastBoundary = 0;
      while (now >= deadline) {
        lastBoundary = deadline;
        if (phase === "focus") {
          dispatch({
            type: "focus/recorded",
            ...(materialId ? { materialId } : {}),
            mode: "pomodoro",
            subjectId: defaultSubject?.id ?? "",
            durationMinutes: minutes,
            completedAt: new Date(deadline).toISOString(),
            ...(agendaLink?.agendaEventId
              ? { agendaEventId: agendaLink.agendaEventId, agendaDate: agendaLink.agendaDate }
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
      if (lastBoundary && now - lastBoundary < 60_000) notifyPomodoroPhase(phase);
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
    materialId,
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
    agendaLink,
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
    chooseDuration(workspace.focusPreferences.pomodoroMinutes);
    setTimerElapsedMilliseconds(0);
    timerStartedAt.current = null;
  }

  function slideMode(direction: -1 | 1) {
    setModeDirection(direction);
    chooseMode(mode === "timer" ? "pomodoro" : "timer");
  }

  function reset() {
    playPomodoroSound("reiniciar");
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
    playPomodoroSound(running ? "pausar" : "comecar");
    ownsSession.current = true;
    const next = !running;
    lastHeartbeat.current = Date.now();
    if (next && mode === "pomodoro" && !askedNotification.current) {
      askedNotification.current = true;
      void requestPomodoroNotifications().then(setNotificationStatus);
    }
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
    if (elapsedSeconds < (agendaLink ? 60 : 1)) return;
    if (mode === "timer" || pomodoroPhase === "focus") {
      dispatch({
        type: "focus/recorded",
        ...(materialId ? { materialId } : {}),
        mode,
        subjectId: subject.id,
        durationMinutes: agendaLink
          ? Math.floor(elapsedSeconds / 60)
          : Math.max(1, Math.round(elapsedSeconds / 60)),
        completedAt: new Date().toISOString(),
        ...(agendaLink?.agendaEventId
          ? { agendaEventId: agendaLink.agendaEventId, agendaDate: agendaLink.agendaDate }
          : {}),
      });
    }
    setAgendaLink(undefined);
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
  const pomodoroControls = (collapsible?: boolean) => (
    <PomodoroControls
      collapsible={Boolean(collapsible)}
      label={running ? uiText(1960) : elapsedSeconds > 0 ? uiText(1436) : uiText(1172)}
      icon={<FocusPaperControlIcon paused={running} />}
      finishDisabled={elapsedSeconds < (agendaLink ? 60 : 1)}
      onToggle={toggleRunning}
      onReset={reset}
      onFinish={finish}
    />
  );
  const pomodoroSummary = (
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
        {uiText(2772, [
          formatFocusDuration(workspace.focusPreferences.pomodoroMinutes),
          formatFocusDuration(workspace.focusPreferences.shortBreakMinutes ?? 5),
        ])}
        {workspace.focusPreferences.longBreaks
          ? ` · ${uiText(2773, [formatFocusDuration(workspace.focusPreferences.longBreakMinutes ?? 15)])}`
          : uiText(1171)}
      </small>
    </div>
  );

  return (
    <main className="main-content focus-page" id="main-content">
      <PageHeader />
      {material && (
        <section className="module-panel">
          <strong>{material.title}</strong>
          {onMaterial && (
            <button className="secondary-button" onClick={() => onMaterial(material.id)}>
              {uiText("Voltar ao material")}
            </button>
          )}
        </section>
      )}
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
                    <PomodoroDial stage={tomatoStage} time={formatTimer(secondsRemaining)}>
                      {pomodoroPhase !== "focus" && <p>{uiText(1160)}</p>}
                    </PomodoroDial>
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
                          ? uiText(2730)
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
                      pomodoroSummary
                    )}
                  </div>
                </div>
                {mode === "timer" && (
                  <h2 id="focus-timer-title" className="timer timer--stopwatch" aria-live="off">
                    <PaperDigits value={formatStopwatch(timerElapsedMilliseconds)} />
                  </h2>
                )}
                {mode === "pomodoro" ? (
                  pomodoroControls()
                ) : (
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
                      disabled={elapsedSeconds < (agendaLink ? 60 : 1)}
                    >
                      {uiText(1174)}
                    </button>
                  </div>
                )}
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
          {mode === "pomodoro" && (
            <>
              <PomodoroFloating
                time={formatTimer(secondsRemaining)}
                stage={tomatoStage}
                controls={pomodoroControls(true)}
              />
              {(notificationStatus === "denied" || notificationStatus === "unsupported") && (
                <p className="pomodoro-notification-note">
                  {uiText(notificationStatus === "denied" ? 2784 : 2785)}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
