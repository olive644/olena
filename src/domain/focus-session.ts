import { isPomodoroDuration } from "./pomodoro-duration.js";
export const FOCUS_SESSION_KEY = "olena.focus-session.v1";
// Tolera o throttling de um minuto de abas em segundo plano, não suspensão do aparelho.
export const FOCUS_HEARTBEAT_LIMIT = 120_000;
export type FocusSession = {
  mode: "timer" | "pomodoro";
  phase: "focus" | "shortBreak" | "longBreak";
  completed: number;
  duration: number;
  secondsRemaining: number;
  elapsedMilliseconds: number;
  running: boolean;
  timerStartedAt: number | null;
  pomodoroDeadline: number | null;
  savedAt: number;
  deviceId?: string;
  agendaEventId?: string;
  agendaDate?: string;
  subjectId?: string;
  plannedMinutes?: number;
};

export function readFocusSession(
  value: string | null,
  now: number,
  deviceId?: string,
): FocusSession | undefined {
  try {
    const saved: unknown = JSON.parse(value ?? "null");
    if (!saved || typeof saved !== "object") return;
    const s = saved as Partial<FocusSession>;
    if (
      (s.deviceId !== undefined && (typeof s.deviceId !== "string" || s.deviceId.length > 100)) ||
      (s.agendaEventId !== undefined && typeof s.agendaEventId !== "string") ||
      (s.agendaDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(s.agendaDate)) ||
      (s.subjectId !== undefined && typeof s.subjectId !== "string") ||
      (s.plannedMinutes !== undefined &&
        (!Number.isFinite(s.plannedMinutes) || s.plannedMinutes < 1 || s.plannedMinutes > 180))
    )
      return;
    if (
      !["timer", "pomodoro"].includes(s.mode ?? "") ||
      !["focus", "shortBreak", "longBreak"].includes(s.phase ?? "") ||
      typeof s.running !== "boolean" ||
      !isPomodoroDuration(s.duration) ||
      typeof s.completed !== "number" ||
      !Number.isInteger(s.completed) ||
      s.completed < 0 ||
      typeof s.secondsRemaining !== "number" ||
      !Number.isFinite(s.secondsRemaining) ||
      s.secondsRemaining < 0 ||
      s.secondsRemaining > (s.duration ?? 0) * 60 ||
      typeof s.elapsedMilliseconds !== "number" ||
      !Number.isFinite(s.elapsedMilliseconds) ||
      s.elapsedMilliseconds < 0 ||
      typeof s.savedAt !== "number" ||
      !Number.isFinite(s.savedAt) ||
      s.savedAt > now ||
      (s.timerStartedAt !== null &&
        (typeof s.timerStartedAt !== "number" ||
          !Number.isFinite(s.timerStartedAt) ||
          s.timerStartedAt > now)) ||
      (s.pomodoroDeadline !== null &&
        (typeof s.pomodoroDeadline !== "number" ||
          !Number.isFinite(s.pomodoroDeadline) ||
          s.pomodoroDeadline < s.savedAt - 86_400_000 ||
          s.pomodoroDeadline > s.savedAt + s.duration! * 60_000))
    )
      return;
    if (
      s.running &&
      ((s.mode === "timer" && s.timerStartedAt === null) ||
        (s.mode === "pomodoro" && s.pomodoroDeadline === null))
    )
      return;
    const session = s as FocusSession;
    // Sem heartbeat recente, preservar o último progresso sem contar o tempo ausente.
    return now - session.savedAt > FOCUS_HEARTBEAT_LIMIT ||
      (deviceId !== undefined && session.deviceId !== undefined && session.deviceId !== deviceId)
      ? { ...session, running: false, timerStartedAt: null, pomodoroDeadline: null }
      : session;
  } catch {
    return;
  }
}
