import { expect, it } from "vitest";
import { createInitialWorkspace } from "./workspace";
import { GENERAL_ACHIEVEMENTS, generalAchievements } from "./general-achievements";

it("oferece 56 objetivos gerais únicos, incluindo quatro materiais e conquistas especiais", () => {
  expect(GENERAL_ACHIEVEMENTS).toHaveLength(56);
  expect(new Set(GENERAL_ACHIEVEMENTS.map((item) => item.id)).size).toBe(56);
  expect(
    new Set(GENERAL_ACHIEVEMENTS.filter((item) => item.tier).map((item) => item.tier)),
  ).toEqual(new Set(["bronze", "silver", "gold", "emerald"]));
  expect(generalAchievements(createInitialWorkspace()).some((item) => item.earned)).toBe(false);
});
it("conta só foco concluído e válido, deduplica recibos e não confunde os modos", () => {
  const workspace = createInitialWorkspace();
  const session = {
    id: "one",
    subjectId: "s",
    durationMinutes: 25,
    completedAt: "2026-10-20T12:00:00Z",
    mode: "pomodoro" as const,
  };
  workspace.focusSessions = [
    session,
    session,
    { ...session, id: "two", durationMinutes: 30, mode: "timer" },
    { ...session, id: "future", completedAt: "2099-01-01T00:00:00Z" },
    { ...session, id: "invalid", durationMinutes: -25 },
  ];
  const values = generalAchievements(
    workspace,
    undefined,
    "America/Sao_Paulo",
    new Date("2026-10-22T12:00:00Z"),
  );
  expect(values.find((item) => item.id === "general-pomodoro-bronze")).toMatchObject({
    earned: true,
    value: 25,
    earnedAt: session.completedAt,
  });
  expect(values.find((item) => item.id === "general-timer-silver")?.value).toBe(30);
  expect(values.find((item) => item.id === "general-sessions-silver")?.value).toBe(2);
  expect(values.find((item) => item.id === "general-balanced")?.earned).toBe(true);
});
it("reconhece streak histórico com datas no fuso e mantém a conquista após a sequência acabar", () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [1, 2, 3].map((day) => ({
    id: String(day),
    subjectId: "s",
    durationMinutes: 20,
    completedAt: `2026-10-0${day}T12:00:00Z`,
  }));
  const earned = generalAchievements(
    workspace,
    undefined,
    "America/Sao_Paulo",
    new Date("2026-10-22T12:00:00Z"),
  ).find((item) => item.id === "general-streak-bronze");
  expect(earned).toMatchObject({ earned: true, earnedAt: "2026-10-03T12:00:00Z" });
});
it("não inventa data para seguidores e exclui pastas e páginas vazias", () => {
  const workspace = createInitialWorkspace();
  workspace.notebooks = [
    {
      id: "folder",
      kind: "folder",
      title: "Pasta",
      subjectId: "",
      pageIds: [],
      createdAt: "2026-10-20T12:00:00Z",
    },
  ];
  workspace.notes = [
    {
      id: "empty",
      title: "Vazia",
      content: "  ",
      assets: [],
      subjectId: "",
      updatedAt: "2026-10-20T12:00:00Z",
    },
  ];
  const values = generalAchievements(workspace, { following: 3, followers: 1 });
  expect(values.find((item) => item.id === "general-following-silver")).toMatchObject({
    earned: true,
    earnedAt: undefined,
  });
  expect(values.find((item) => item.id === "general-notebooks-bronze")?.earned).toBe(false);
  expect(values.find((item) => item.id === "general-pages-bronze")?.value).toBe(0);
});
