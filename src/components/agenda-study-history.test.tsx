import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AgendaStudyHistory } from "./agenda-study-history";
import { createInitialWorkspace } from "../domain/workspace";
import { focusHistory } from "../domain/agenda-history";
import { SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("preserves modality switching and legacy explanations without open buttons", () => {
  const workspace = createInitialWorkspace();
  const onNavigate = vi.fn();
  const sessions = [
    {
      id: "timer",
      mode: "timer" as const,
      subjectId: "math",
      durationMinutes: 12,
      completedAt: "2026-10-06T12:00:00",
    },
    {
      id: "pomo",
      mode: "pomodoro" as const,
      subjectId: "math",
      durationMinutes: 25,
      completedAt: "2026-10-06T12:30:00",
    },
    { id: "legacy", subjectId: "math", durationMinutes: 8, completedAt: "2026-10-06T13:00:00" },
  ];
  render(
    <AgendaStudyHistory
      workspace={workspace}
      history={focusHistory(sessions)}
      onNavigate={onNavigate}
      range={{ start: "2026-10-06", end: "2026-10-08" }}
    />,
  );
  expect(document.querySelector(".agenda-chart-heading > strong")?.textContent).toBe("12 min");
  expect(screen.getByText(/1 sessão antiga sem modalidade/)).toBeTruthy();
  expect(document.querySelectorAll(".agenda-dashboard button")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Pomodoro" }));
  expect(document.querySelector(".agenda-chart-heading > strong")?.textContent).toBe("25 min");
  expect(onNavigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Caderno" }));
  fireEvent.click(screen.getByRole("button", { name: "Praticar" }));
  expect(document.querySelector(".agenda-charts")).toBeNull();
  expect(screen.queryByRole("button", { name: /^Abrir/ })).toBeNull();
  expect(onNavigate).not.toHaveBeenCalled();
  expect(screen.getByRole("img", { name: "Prévia: Pátio das Primeiras Contas" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Próxima ilha" }));
  expect(screen.getByRole("img", { name: "Prévia: Oficina das Equações" })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("group", { name: "Prévia das ilhas" }), { key: "End" });
  expect(screen.getByRole("button", { name: "Próxima ilha" }).hasAttribute("disabled")).toBe(true);
});
it("shows saved math progress separately without assigning legacy answers to dates, and refreshes sync", () => {
  localStorage.setItem(
    "helena.mathLearning.v1",
    JSON.stringify({ foundations: { level: 1, mastery: 1, correct: 12, best: 80 } }),
  );
  const workspace = createInitialWorkspace();
  render(
    <AgendaStudyHistory
      workspace={workspace}
      history={focusHistory([])}
      range={{ start: "2026-10-06", end: "2026-10-06" }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Praticar" }));
  expect(screen.getByText("12 acertos acumulados")).toBeTruthy();
  expect(screen.getByText("Melhor rodada: 80 pontos")).toBeTruthy();
  expect(document.querySelectorAll(".agenda-charts")).toHaveLength(2);
  expect(document.querySelector(".agenda-chart-heading")).toBeNull();
  localStorage.removeItem("helena.mathLearning.v1");
  fireEvent(window, new Event(SYNCED_STORAGE_APPLIED_EVENT));
  expect(screen.queryByText("Progresso acumulado de Matemática")).toBeNull();
});

it("keeps the Pomodoro week and timer garden visible on empty dates", () => {
  localStorage.setItem("noteoli.pomodoro-streak.v1", JSON.stringify(["2026-10-06"]));
  const workspace = createInitialWorkspace();
  const props = { workspace, history: focusHistory([]) };
  const { rerender } = render(
    <AgendaStudyHistory {...props} range={{ start: "2026-10-06", end: "2026-10-06" }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Pomodoro" }));
  expect(screen.getByText("Sua semana de Pomodoro")).toBeTruthy();
  expect(document.querySelectorAll(".agenda-pomodoro-day.is-active")).toHaveLength(1);
  rerender(<AgendaStudyHistory {...props} range={{ start: "2026-10-07", end: "2026-10-07" }} />);
  expect(screen.getByText("Sua semana de Pomodoro")).toBeTruthy();
  expect(document.querySelectorAll(".agenda-pomodoro-day.is-active")).toHaveLength(0);
  expect(document.querySelectorAll(".streak-tomato")).toHaveLength(7);
  fireEvent.click(screen.getByRole("button", { name: "Cronômetro" }));
  expect(document.querySelectorAll(".agenda-week-flower")).toHaveLength(7);
  expect(document.querySelectorAll(".agenda-week-flower.is-active")).toHaveLength(0);
});
