import { expect, it } from "vitest";
import { formatFocusDuration, isPomodoroDuration } from "./pomodoro-duration";
import { createInitialWorkspace } from "./workspace";
import { loadWorkspace, serializeWorkspace } from "../data/local-workspace";
import { nextPomodoroStep } from "../views/focus-view";

it("mantém os padrões antigos e restaura preferências personalizadas", () => {
  const workspace = createInitialWorkspace();
  expect(workspace.focusPreferences).toEqual({ pomodoroMinutes: 25, longBreaks: true });
  workspace.focusPreferences = {
    pomodoroMinutes: 1000,
    longBreaks: true,
    shortBreakMinutes: 10,
    longBreakMinutes: 60,
  };
  const restored = loadWorkspace({ getItem: () => serializeWorkspace(workspace) });
  expect(restored.focusPreferences).toEqual(workspace.focusPreferences);
  expect(nextPomodoroStep("focus", 0, true, 1000, 10, 60).duration).toBe(10);
  expect(nextPomodoroStep("focus", 3, true, 1000, 10, 60).duration).toBe(60);
  expect(nextPomodoroStep("shortBreak", 1, true, 1000, 10, 60).duration).toBe(1000);
});
it("formata horas sem centenas de minutos e rejeita durações inválidas", () => {
  expect(formatFocusDuration(25)).toBe("25 min");
  expect(formatFocusDuration(60)).toBe("1 h");
  expect(formatFocusDuration(1000)).toBe("16 h 40 min");
  expect([0, -1, 1.5, Infinity, NaN, 6000, "25"].some(isPomodoroDuration)).toBe(false);
  expect(isPomodoroDuration(5999)).toBe(true);
});
