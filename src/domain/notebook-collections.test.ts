import { expect, it } from "vitest";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { loadWorkspace, saveWorkspace } from "../data/local-workspace";

it("limita cada vitrine a três pastas e cada pasta a três cadernos, preservando-os ao desfazer", () => {
  let state = createInitialWorkspace();
  for (let i = 0; i < 4; i++) {
    state = workspaceReducer(state, {
      type: "notebook/added",
      id: `folder-${i}`,
      title: "Pasta",
      kind: "collection",
      shelf: 0,
      subjectId: "",
      createdAt: "2026-09-26",
    });
    state = workspaceReducer(state, {
      type: "notebook/added",
      id: `book-${i}`,
      title: "Caderno",
      subjectId: "",
      createdAt: "2026-09-26",
    });
    state = workspaceReducer(state, {
      type: "notebook/stored",
      id: `book-${i}`,
      folderId: "folder-0",
    });
  }
  expect(state.notebooks.filter((b) => b.kind === "collection")).toHaveLength(3);
  expect(state.notebooks.filter((b) => b.parentId === "folder-0")).toHaveLength(3);
  expect(state.notebooks.find((b) => b.id === "book-3")?.parentId).toBeUndefined();
  expect(
    workspaceReducer(state, { type: "notebook/stored", id: "folder-1", folderId: "folder-0" }),
  ).toBe(state);
  state = workspaceReducer(state, {
    type: "notebook/added",
    id: "another-shelf",
    title: "Outra vitrine",
    kind: "collection",
    shelf: 1,
    subjectId: "",
    createdAt: "2026-09-26",
  });
  expect(state.notebooks.filter((b) => b.kind === "collection")).toHaveLength(4);
  saveWorkspace(localStorage, state);
  expect(loadWorkspace(localStorage).notebooks).toEqual(state.notebooks);
  state = workspaceReducer(state, { type: "notebook/removed", ids: ["folder-0"] });
  expect(state.notebooks.filter((b) => b.id.startsWith("book-"))).toHaveLength(4);
  expect(state.notebooks.some((b) => b.parentId === "folder-0")).toBe(false);
});

it("folha recebida sem PNG preserva tinta e pasta após recarregar", () => {
  let state = workspaceReducer(createInitialWorkspace(), {
    type: "notebook/added",
    id: "shared",
    title: "Compartilhado",
    subjectId: "",
    createdAt: "2026-09-26",
  });
  const document = {
    version: 1 as const,
    paper: "ruled" as const,
    strokes: [],
    pageText: "Tinta do colega",
  };
  state = workspaceReducer(state, {
    type: "notebook/shared-received",
    notebookId: "shared",
    pages: [{ id: "received", title: "Recebida", document }],
  });
  saveWorkspace(localStorage, state);
  const restored = loadWorkspace(localStorage);
  expect(restored.notes.find((note) => note.id === "received")?.assets[0]?.handwriting).toEqual(
    document,
  );
  expect(restored.notebooks.find((book) => book.id === "shared")?.pageIds).toEqual(["received"]);
});
