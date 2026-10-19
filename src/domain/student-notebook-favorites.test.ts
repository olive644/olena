import { expect, it } from "vitest";
import { createInitialWorkspace, workspaceReducer, type StudyNotebook } from "./workspace";
import { studentNotebookFavorites } from "./notebook-shelves";
import { loadWorkspace, serializeWorkspace } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";

const item = (id: string, kind?: StudyNotebook["kind"]): StudyNotebook => ({
  id,
  title: id,
  subjectId: "",
  pageIds: [],
  createdAt: "2026-10-18",
  ...(kind ? { kind } : {}),
});
const fixture = () => ({
  ...createInitialWorkspace(),
  notebooks: [
    item("book"),
    item("note", "note"),
    item("folder", "collection"),
    item("folder-two", "folder"),
    item("fourth"),
  ],
});

it("preserva favorito ao recuperar cadernos padrão duplicados antigos", () => {
  const state = createInitialWorkspace();
  state.notebooks = [
    { ...item("primary"), title: "Meu caderno" },
    { ...item("duplicate"), title: "Meu caderno 2", homeFavorite: true },
  ];
  const loaded = loadWorkspace({ getItem: () => JSON.stringify(state) });
  expect(loaded.notebooks).toHaveLength(1);
  expect(loaded.notebooks[0]?.homeFavorite).toBe(true);
});

it("limita três favoritos, apenas uma pasta, e permite trocar sem apagar conteúdo", () => {
  let state = fixture();
  const toggle = (id: string) => {
    state = workspaceReducer(state, { type: "notebook/favorite-toggled", id });
  };
  toggle("folder");
  const before = state;
  toggle("folder-two");
  expect(state).toBe(before);
  toggle("book");
  toggle("note");
  expect(studentNotebookFavorites(state.notebooks).map((book) => book.id)).toEqual([
    "book",
    "note",
    "folder",
  ]);
  const full = state;
  toggle("fourth");
  expect(state).toBe(full);
  toggle("book");
  toggle("fourth");
  expect(studentNotebookFavorites(state.notebooks)).toHaveLength(3);
  expect(state.notebooks).toHaveLength(5);
  expect(state.notebooks.find((book) => book.id === "book")?.homeFavorite).toBe(false);
  expect(loadWorkspace({ getItem: () => serializeWorkspace(state) }).notebooks).toEqual(
    state.notebooks,
  );
});

it("normaliza importações e favoritos concorrentes de dois aparelhos sem perder cadernos", () => {
  const state = fixture();
  const local = {
    ...state,
    notebooks: state.notebooks.map((book) => ({
      ...book,
      homeFavorite: ["book", "folder", "note"].includes(book.id),
    })),
  };
  const remote = {
    ...state,
    notebooks: state.notebooks.map((book) => ({
      ...book,
      homeFavorite: ["folder-two", "fourth"].includes(book.id),
    })),
  };
  const merged = mergeWorkspaceStates(state, local, remote).workspace;
  expect(studentNotebookFavorites(merged.notebooks)).toHaveLength(3);
  expect(merged.notebooks.filter((book) => book.homeFavorite)).toHaveLength(3);
  expect(merged.notebooks).toHaveLength(5);
  const imported = {
    ...state,
    notebooks: state.notebooks.map((book) => ({ ...book, homeFavorite: true })),
  };
  const loaded = loadWorkspace({ getItem: () => JSON.stringify(imported) });
  expect(loaded.notebooks.filter((book) => book.homeFavorite)).toHaveLength(3);
  expect(loaded.notebooks).toHaveLength(5);
});
