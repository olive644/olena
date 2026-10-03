export const FOCUS_SESSION_KEY = "olena.focus-session.v1";
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
};

export function readFocusSession(value: string | null, now: number): FocusSession | undefined {
  try {
    const saved: unknown = JSON.parse(value ?? "null");
    if (!saved || typeof saved !== "object") return;
    const s = saved as Partial<FocusSession>;
    if (
      !["timer", "pomodoro"].includes(s.mode ?? "") ||
      !["focus", "shortBreak", "longBreak"].includes(s.phase ?? "") ||
      typeof s.running !== "boolean" ||
      ![5, 15, 25, 50].includes(s.duration ?? 0) ||
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
    // Sessions older than a day resume paused rather than registering unattended cycles.
    return now - session.savedAt > 86_400_000
      ? { ...session, running: false, timerStartedAt: null, pomodoroDeadline: null }
      : session;
  } catch {
    return;
  }
}
