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
