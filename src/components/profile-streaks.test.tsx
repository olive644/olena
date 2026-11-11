import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileStreaks, ProfileStreakValues } from "./profile-streaks";
import { createInitialWorkspace } from "../domain/workspace";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("não mostra fogo quando não há ofensiva ativa", () => {
  localStorage.removeItem("noteoli.pomodoro-streak.v1");
  render(<ProfileStreaks workspace={createInitialWorkspace()} />);
  expect(screen.queryByLabelText("Ilhas: 0 dias seguidos")).toBeNull();
});
it("remove o fogo sem recarregar quando completa 24h", () => {
  vi.useFakeTimers();
  const at = Date.parse("2026-10-18T10:00:00Z");
  vi.setSystemTime(at + 86400000 - 500);
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = [
    {
      id: "a",
      islandId: "math",
      islandName: "Matemática",
      answers: 1,
      correct: 1,
      completedAt: new Date(at).toISOString(),
    },
  ];
  const { container } = render(<ProfileStreaks workspace={workspace} />);
  const inspect = screen.getByRole("button", { name: /Ilhas: 1/ });
  fireEvent.click(inspect);
  expect(inspect.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("status").textContent).toContain("Ilhas: 1");
  expect(container.querySelector('img[src="/math-islands/flame.svg"]')).not.toBeNull();
  act(() => vi.advanceTimersByTime(1000));
  expect(container.querySelector('img[src="/math-islands/flame.svg"]')).toBeNull();
});

it("shows an inspectable English flame and supports legacy public profiles", () => {
  const { rerender } = render(
    <ProfileStreakValues streaks={{ pomodoro: 0, timer: 0, islands: 0, english: 3 }} />,
  );
  const button = screen.getByRole("button", { name: /Inglês: 3/ });
  expect(button.querySelector("img")?.getAttribute("src")).toBe(
    "/languages/english-streak-flame.svg",
  );
  fireEvent.click(button);
  expect(screen.getByRole("status").textContent).toContain("Inglês: 3");
  rerender(<ProfileStreakValues streaks={{ pomodoro: 0, timer: 0, islands: 0 }} />);
  expect(screen.queryByRole("button", { name: /Inglês/ })).toBeNull();
});

it("groups multiple active streaks without adding their day counts", () => {
  const { container } = render(
    <ProfileStreakValues streaks={{ pomodoro: 1, timer: 0, islands: 7, english: 3 }} />,
  );
  const group = container.querySelector("details")!;
  const summary = within(group).getByText("3", { selector: "summary > strong" });
  expect(group.open).toBe(false);
  expect(summary.parentElement?.getAttribute("aria-label")).toBe("Suas ofensivas: 3");
  expect(group.querySelectorAll(".profile-streak-stack > span")).toHaveLength(3);
  expect(group.querySelectorAll(".profile-streak-group-row")).toHaveLength(3);
  expect(group.textContent).toContain("Pomodoro");
  expect(group.textContent).toContain("Ilhas");
  expect(group.textContent).toContain("Inglês");
  expect(group.textContent).not.toContain("Cronômetro");
  expect(group.querySelector(".profile-streak-group-list")?.textContent).toContain(
    "7 dias seguidos",
  );
  expect(group.querySelector(".profile-streak-group-list")?.textContent).toContain("1 dia seguido");
  group.open = true;
  fireEvent.keyDown(group.querySelector("summary")!, { key: "Escape" });
  expect(group.open).toBe(false);
  expect(document.activeElement).toBe(group.querySelector("summary"));
});

it("returns to a single streak and hides the group when streaks expire", () => {
  const { container, rerender } = render(
    <ProfileStreakValues streaks={{ pomodoro: 1, timer: 2, islands: 3, english: 4 }} />,
  );
  expect(container.querySelectorAll(".profile-streak-stack > span")).toHaveLength(4);
  container.querySelector("details")!.open = true;
  rerender(<ProfileStreakValues streaks={{ pomodoro: 1, timer: 0, islands: 3 }} />);
  expect(container.querySelector("details")!.open).toBe(false);
  expect(container.querySelectorAll(".profile-streak-group-row")).toHaveLength(2);
  rerender(<ProfileStreakValues streaks={{ pomodoro: 0, timer: 0, islands: 3 }} />);
  expect(container.querySelector("details")).toBeNull();
  expect(screen.getByRole("button", { name: /Ilhas: 3/ })).toBeTruthy();
  rerender(<ProfileStreakValues streaks={{ pomodoro: 0, timer: 0, islands: 0 }} />);
  expect(container.childElementCount).toBe(0);
});
