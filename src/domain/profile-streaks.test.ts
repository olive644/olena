import { expect, it } from "vitest";
import { currentDailyStreak, profileStreaks, mathematicsStreak } from "./profile-streaks";
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
  ).toEqual({ timer: 1, pomodoro: 2, islands: 0 });
});
it("fogo matemático expira em 24h, ignora outras ilhas e futuro", () => {
  const workspace = createInitialWorkspace();
  const at = Date.parse("2026-10-18T10:00:00Z");
  workspace.practiceActivities = [
    {
      id: "one",
      islandId: "mathematics:foundations",
      islandName: "Matemática",
      answers: 1,
      correct: 1,
      completedAt: new Date(at).toISOString(),
    },
  ];
  expect(mathematicsStreak(workspace, new Date(at + 86400000 - 1), "America/Sao_Paulo")).toBe(1);
  expect(mathematicsStreak(workspace, new Date(at + 86400000), "America/Sao_Paulo")).toBe(0);
  expect(mathematicsStreak(workspace, new Date(at - 1), "America/Sao_Paulo")).toBe(0);
  workspace.practiceActivities[0]!.islandId = "languages";
  expect(mathematicsStreak(workspace, new Date(at + 1000), "America/Sao_Paulo")).toBe(0);
});

it("a flor do perfil usa a mesma expiração da tela de Cronômetro", () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [
    {
      id: "timer",
      subjectId: "a",
      mode: "timer",
      durationMinutes: 10,
      completedAt: "2026-10-18T10:00:00Z",
    },
  ];
  expect(profileStreaks(workspace, [], new Date("2026-10-19T09:59:59Z"), "UTC").timer).toBe(1);
  expect(profileStreaks(workspace, [], new Date("2026-10-19T10:00:00Z"), "UTC").timer).toBe(0);
});
