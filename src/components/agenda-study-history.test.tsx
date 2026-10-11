import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialWorkspace } from "../domain/workspace";
import { focusHistory } from "../domain/agenda-history";
import { AgendaStudyHistory } from "./agenda-study-history";

afterEach(cleanup);
describe("agenda category dashboard", () => {
  it("switches charts without navigating and keeps legacy sessions separate", () => {
    const workspace = createInitialWorkspace();
    const onNavigate = vi.fn();
    render(
      <AgendaStudyHistory
        workspace={workspace}
        onNavigate={onNavigate}
        history={focusHistory([
          {
            id: "timer",
            mode: "timer",
            subjectId: "math",
            durationMinutes: 12,
            completedAt: "2026-10-06T12:00:00",
          },
          {
            id: "pomo",
            mode: "pomodoro",
            subjectId: "math",
            durationMinutes: 25,
            completedAt: "2026-10-06T12:30:00",
          },
          {
            id: "legacy",
            subjectId: "math",
            durationMinutes: 8,
            completedAt: "2026-10-06T13:00:00",
          },
        ])}
        range={{ start: "2026-10-06", end: "2026-10-08" }}
      />,
    );
    const region = screen.getByRole("region", { name: "Histórico de estudo" });
    expect(region.querySelector(".agenda-chart-heading > strong")?.textContent).toBe("12 min");
    expect(region.textContent).toContain("1 sessões antigas sem modalidade");
    fireEvent.click(within(region).getByRole("button", { name: "Pomodoro" }));
    expect(region.querySelector(".agenda-chart-heading > strong")?.textContent).toBe("25 min");
    expect(
      within(region).getByRole("button", { name: "Pomodoro" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(within(region).getByRole("button", { name: "Caderno" }));
    expect(within(region).getByRole("button", { name: /^Cadernos criados:/ })).toBeTruthy();
    fireEvent.click(within(region).getByRole("button", { name: "Ilhas" }));
    expect(region.textContent).toContain("sem filtro de datas");
    fireEvent.click(within(region).getByRole("button", { name: "Explorar ilhas" }));
    expect(onNavigate).toHaveBeenLastCalledWith("learn");
  });
  it("keeps categories usable with empty charts and without a navigation callback", () => {
    render(
      <AgendaStudyHistory
        workspace={createInitialWorkspace()}
        history={focusHistory([])}
        range={{ start: "2026-10-06", end: "2026-10-08" }}
      />,
    );
    expect(screen.getByRole("img", { name: "Sem dados para distribuição" })).toBeTruthy();
    for (const button of screen.getAllByRole("button"))
      expect(button.hasAttribute("disabled")).toBe(false);
  });
});
