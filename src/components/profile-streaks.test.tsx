import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileStreaks } from "./profile-streaks";
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
