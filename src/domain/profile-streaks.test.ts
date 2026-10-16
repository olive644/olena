import { expect, it } from "vitest";
import { currentDailyStreak, profileStreaks } from "./profile-streaks";
import { createInitialWorkspace } from "./workspace";
it("conta dias únicos até hoje ou ontem e ignora futuro, lacunas e dados inválidos", () => {
  expect(
    currentDailyStreak(
      ["2026-10-15", "2026-10-15", "2026-10-14", "2026-10-17", "lixo"],
      "2026-10-16",
    ),
  ).toBe(2);
  expect(currentDailyStreak(["2026-10-14"], "2026-10-16")).toBe(0);
  expect(currentDailyStreak(["2026-10-16", "2026-10-14"], "2026-10-16")).toBe(1);
});
it("separa modalidades, inclui legado pomodoro e usa o fuso da conta", () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [
    {
      id: "1",
      subjectId: "a",
      durationMinutes: 20,
      completedAt: "2026-10-16T01:00:00Z",
      mode: "timer",
    },
    {
      id: "2",
      subjectId: "a",
      durationMinutes: 25,
      completedAt: "2026-10-16T02:00:00Z",
      mode: "pomodoro",
    },
    {
      id: "3",
      subjectId: "a",
      durationMinutes: 0,
      completedAt: "2026-10-16T12:00:00Z",
      mode: "timer",
    },
  ];
  workspace.practiceActivities = [
    {
      id: "a",
      islandId: "math",
      islandName: "Matemática",
      completedAt: "2026-10-15T12:00:00Z",
      answers: 4,
      correct: 2,
    },
    {
      id: "b",
      islandId: "math",
      islandName: "Matemática",
      completedAt: "2026-10-16T12:00:00Z",
      answers: 0,
      correct: 0,
    },
  ];
  expect(
    profileStreaks(
      workspace,
      ["2026-10-14", 7],
      new Date("2026-10-16T15:00:00Z"),
      "America/Sao_Paulo",
    ),
  ).toEqual({ timer: 1, pomodoro: 2, islands: 1 });
});
