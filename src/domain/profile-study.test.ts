import { expect, it } from "vitest";
import { profileLevel, profileNotebook } from "./profile-study";
import { createInitialWorkspace } from "./workspace";
it("nível usa XP registrado e exige mais XP em cada nível", () => {
  expect(profileLevel(0)).toEqual({ xp: 0, level: 1, current: 0, next: 100 });
  expect(profileLevel(99)).toMatchObject({ level: 1, current: 99 });
  expect(profileLevel(100)).toMatchObject({ level: 2, current: 0, next: 150 });
  expect(profileLevel(249)).toMatchObject({ level: 2, current: 149, next: 150 });
  expect(profileLevel(250)).toMatchObject({ level: 3, current: 0, next: 200 });
  expect(profileLevel(5000).level).toBeGreaterThanOrEqual(6);
  expect(profileLevel(-1).xp).toBe(0);
});
it("destaca conteúdo real, ignora folhas removidas e preserva a pasta sem ciclos", () => {
  const workspace = createInitialWorkspace();
  workspace.notebooks = [
    {
      id: "folder",
      title: "Ciências",
      kind: "folder",
      parentId: "folder",
      subjectId: "",
      pageIds: [],
      createdAt: "2026-10-17",
    },
    {
      id: "book",
      title: "Biologia",
      parentId: "folder",
      subjectId: "",
      pageIds: ["one", "removed"],
      createdAt: "2026-10-17",
    },
    { id: "empty", title: "Vazio", subjectId: "", pageIds: [], createdAt: "2026-10-17" },
  ];
  workspace.notes = [
    {
      id: "one",
      title: "Células",
      subjectId: "",
      content: "Minha ideia",
      assets: [],
      updatedAt: "2026-10-17T12:00:00Z",
    },
  ];
  const before = JSON.stringify(workspace);
  expect(profileNotebook(workspace)).toMatchObject({
    notebook: { id: "book" },
    count: 1,
    trail: ["Ciências"],
    page: { id: "one" },
  });
  expect(JSON.stringify(workspace)).toBe(before);
  workspace.notebooks = [];
  expect(profileNotebook(workspace)).toBeUndefined();
});
