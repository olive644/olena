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
  expect(screen.queryByRole("group", { name: "Prévia das ilhas" })).toBeNull();
});
it("hides undated math progress and shows only practice from the selected dates", () => {
  localStorage.setItem(
    "helena.mathLearning.v1",
    JSON.stringify({ foundations: { level: 1, mastery: 1, correct: 12, best: 80 } }),
  );
  const workspace = createInitialWorkspace();
  const { rerender } = render(
    <AgendaStudyHistory
      workspace={workspace}
      history={focusHistory([])}
      range={{ start: "2026-10-06", end: "2026-10-06" }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Praticar" }));
  expect(screen.queryByRole("group", { name: "Prévia das ilhas" })).toBeNull();
  expect(document.querySelectorAll(".agenda-charts")).toHaveLength(0);
  expect(document.querySelector(".agenda-chart-heading")).toBeNull();
  fireEvent(window, new Event(SYNCED_STORAGE_APPLIED_EVENT));
  expect(screen.queryByText("Progresso acumulado de Matemática")).toBeNull();
  expect(localStorage.getItem("helena.mathLearning.v1")).toContain('"correct":12');
  workspace.practiceActivities = [
    {
      id: "day6",
      islandId: "mathematics:foundations",
      islandName: "Matemática",
      completedAt: "2026-10-06T12:00:00",
      answers: 3,
      correct: 2,
    },
    {
      id: "day7",
      islandId: "mathematics:foundations",
      islandName: "Matemática",
      completedAt: "2026-10-07T12:00:00",
      answers: 4,
      correct: 1,
    },
    {
      id: "zero",
      islandId: "mathematics:foundations",
      islandName: "Matemática",
      completedAt: "2026-10-08T12:00:00",
      answers: 0,
      correct: 0,
    },
  ];
  const props = { workspace, history: focusHistory([]) };
  rerender(<AgendaStudyHistory {...props} range={{ start: "2026-10-06", end: "2026-10-06" }} />);
  expect(screen.getByText("3 respostas no período")).toBeTruthy();
  expect(screen.getByText("2 acertos no período")).toBeTruthy();
  expect(document.querySelectorAll(".agenda-charts")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Próxima ilha" }));
  expect(screen.queryByRole("img", { name: "Prévia: Oficina das Equações" })).toBeNull();
  fireEvent.keyDown(screen.getByRole("group", { name: "Prévia das ilhas" }), { key: "End" });
  expect(screen.getByRole("button", { name: "Próxima ilha" }).hasAttribute("disabled")).toBe(true);
  fireEvent.keyDown(screen.getByRole("group", { name: "Prévia das ilhas" }), { key: "Home" });
  rerender(<AgendaStudyHistory {...props} range={{ start: "2026-10-06", end: "2026-10-07" }} />);
  expect(screen.getByText("7 respostas no período")).toBeTruthy();
  expect(screen.getByText("3 acertos no período")).toBeTruthy();
  rerender(<AgendaStudyHistory {...props} range={{ start: "2026-10-08", end: "2026-10-08" }} />);
  expect(document.querySelector(".agenda-island-progress")).toBeNull();
  expect(document.querySelector(".agenda-charts")).toBeNull();
  expect(screen.getByText(/Nenhuma resposta registrada nas ilhas neste período/)).toBeTruthy();
  expect(screen.queryByText(/Melhor sequência no período/)).toBeNull();
  expect(screen.queryByText(/Use as setas, arraste a ilha/)).toBeNull();
});
it("filters charts through only islands practiced in the selected dates", () => {
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = [
    {
      id: "a",
      islandId: "mathematics:foundations",
      islandName: "Fundamental",
      completedAt: "2026-10-11T12:00:00",
      answers: 2,
      correct: 1,
    },
    {
      id: "b",
      islandId: "mathematics:school",
      islandName: "Médio",
      completedAt: "2026-10-11T13:00:00",
      answers: 7,
      correct: 3,
    },
    {
      id: "c",
      islandId: "mathematics:college",
      islandName: "Superior",
      completedAt: "2026-10-12T12:00:00",
      answers: 9,
      correct: 4,
    },
  ];
  const props = { workspace, history: focusHistory([]) };
  const { rerender } = render(
    <AgendaStudyHistory {...props} range={{ start: "2026-10-11", end: "2026-10-11" }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Praticar" }));
  expect(document.querySelector(".agenda-chart-heading > strong")?.textContent).toBe("2 respostas");
  fireEvent.click(screen.getByRole("button", { name: "Próxima ilha" }));
  expect(document.querySelector(".agenda-chart-heading > strong")?.textContent).toBe("7 respostas");
  expect(screen.getByRole("img", { name: "Prévia: Oficina das Equações" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Próxima ilha" }).hasAttribute("disabled")).toBe(true);
  rerender(<AgendaStudyHistory {...props} range={{ start: "2026-10-13", end: "2026-10-13" }} />);
  expect(screen.queryByRole("group", { name: "Prévia das ilhas" })).toBeNull();
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
  expect(screen.queryByText(/Dias registrados dentro do filtro ficam vivos/)).toBeNull();
  expect(screen.queryByText(/Semana de 05\/10\/2026/)).toBeNull();
});
