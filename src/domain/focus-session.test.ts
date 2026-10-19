import { describe, expect, it } from "vitest";
import { readFocusSession, type FocusSession } from "./focus-session";
const session: FocusSession = {
  mode: "pomodoro",
  phase: "focus",
  completed: 0,
  duration: 25,
  secondsRemaining: 1490,
  elapsedMilliseconds: 0,
  running: true,
  timerStartedAt: null,
  pomodoroDeadline: 1_500_000,
  savedAt: 10_000,
};
describe("sessão local de Foco", () => {
  it("restaura uma duração personalizada e recusa durações fora do relógio", () => {
    const custom = {
      ...session,
      duration: 90,
      secondsRemaining: 5400,
      pomodoroDeadline: 5_410_000,
    };
    expect(readFocusSession(JSON.stringify(custom), 10_000)?.duration).toBe(90);
    expect(readFocusSession(JSON.stringify({ ...custom, duration: 6000 }), 10_000)).toBeUndefined();
  });
  it("restores another device's snapshot paused without losing elapsed time", () => {
    const timer = {
      ...session,
      mode: "timer" as const,
      deviceId: "phone",
      elapsedMilliseconds: 120000,
      timerStartedAt: 10000,
      pomodoroDeadline: null,
      savedAt: 130000,
    };
    const restored = readFocusSession(JSON.stringify(timer), 140000, "desktop");
    expect(restored?.running).toBe(false);
    expect(restored?.elapsedMilliseconds).toBe(120000);
    expect(restored?.timerStartedAt).toBeNull();
    expect(readFocusSession(JSON.stringify(timer), 140000, "phone")?.running).toBe(true);
  });
  it("preserves validated agenda context and rejects invalid targets", () => {
    const planned = {
      ...session,
      agendaEventId: "study-1",
      agendaDate: "2026-10-11",
      subjectId: "math",
      plannedMinutes: 15,
    };
    expect(readFocusSession(JSON.stringify(planned), 60_000)).toEqual(planned);
    expect(
      readFocusSession(JSON.stringify({ ...planned, plannedMinutes: 0 }), 60_000),
    ).toBeUndefined();
    expect(
      readFocusSession(JSON.stringify({ ...planned, agendaDate: "not-a-date" }), 60_000),
    ).toBeUndefined();
  });
  it("restaura o prazo, não só os segundos exibidos", () => {
    expect(readFocusSession(JSON.stringify(session), 60_000)).toEqual(session);
  });
  it("ignora conteúdo inválido ou sem prazo", () => {
    expect(readFocusSession("{", 60_000)).toBeUndefined();
    expect(
      readFocusSession(JSON.stringify({ ...session, pomodoroDeadline: null }), 60_000),
    ).toBeUndefined();
    expect(readFocusSession(JSON.stringify({ ...session, completed: -1 }), 60_000)).toBeUndefined();
  });
  it("retoma pausada após mais de 24 horas", () => {
    expect(readFocusSession(JSON.stringify(session), 90_000_000)?.running).toBe(false);
  });
});
