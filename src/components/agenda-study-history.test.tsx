import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialWorkspace } from "../domain/workspace";
import { focusHistory } from "../domain/agenda-history";
import { AgendaStudyHistory } from "./agenda-study-history";

afterEach(cleanup);
describe("agenda dashboard", () => {
  it("shows only recorded totals and configured Pomodoro, with original assets and navigation", () => {
    const workspace = createInitialWorkspace();
    workspace.focusPreferences.pomodoroMinutes = 50;
    const onNavigate = vi.fn();
    render(
      <AgendaStudyHistory
        workspace={workspace}
        onNavigate={onNavigate}
        history={focusHistory([
          {
            id: "session",
            subjectId: "math",
            durationMinutes: 12,
            completedAt: "2026-10-06T12:00:00",
          },
        ])}
        range={{ start: "2026-10-06", end: "2026-10-08" }}
      />,
    );
    const region = screen.getByRole("region", { name: "Histórico de estudo" });
    expect([...region.querySelectorAll("dd")].map((value) => value.textContent)).toEqual([
      "12",
      "1",
      "1 dia",
    ]);
    expect(within(region).getByRole("button", { name: /Pomodoro/ }).textContent).toContain(
      "Ciclo de 50 min",
    );
    expect(region.querySelector('[data-icon="focus"]')).not.toBeNull();
    expect(region.querySelector('[data-icon="notes"]')).not.toBeNull();
    expect(region.querySelector(".agenda-island-icon")?.getAttribute("src")).toBe(
      "/practice-islands/mathematics-small.webp",
    );
    for (const [name, target] of [
      ["Cronômetro", "focus"],
      ["Caderno", "notes"],
      ["Pomodoro", "focus"],
      ["Ilhas", "learn"],
    ]) {
      fireEvent.click(within(region).getByRole("button", { name: new RegExp(name!) }));
      expect(onNavigate).toHaveBeenLastCalledWith(target);
    }
  });
  it("does not fabricate sessions in an empty interval", () => {
    render(
      <AgendaStudyHistory
        workspace={createInitialWorkspace()}
        history={focusHistory([])}
        range={{ start: "2026-10-06", end: "2026-10-08" }}
      />,
    );
    expect(
      [...screen.getByRole("region").querySelectorAll("dd")].map((value) => value.textContent),
    ).toEqual(["0", "0", "0 dias"]);
    for (const button of screen.getAllByRole("button"))
      expect(button.hasAttribute("disabled")).toBe(true);
  });
});
