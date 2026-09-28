import { describe, expect, it } from "vitest";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { loadWorkspace, saveWorkspace } from "../data/local-workspace";

describe("Notes na vitrine", () => {
  it("persiste texto e permite três itens mistos por pasta, com retirada sem perder conteúdo", () => {
    let state = createInitialWorkspace();
    state = workspaceReducer(state, {
      type: "notebook/added",
      id: "folder",
      kind: "collection",
      title: "Ideias",
      subjectId: "",
      createdAt: "2026-09-27",
    });
    for (let i = 0; i < 4; i++) {
      state = workspaceReducer(state, {
        type: "notebook/added",
        id: `item-${i}`,
        ...(i === 1 ? {} : { kind: "note" as const }),
        title: `Ideia ${i}`,
        subjectId: "",
        createdAt: "2026-09-27",
      });
      state = workspaceReducer(state, {
        type: "notebook/stored",
        id: `item-${i}`,
        folderId: "folder",
      });
    }
    expect(state.notebooks.filter((item) => item.parentId === "folder")).toHaveLength(3);
    expect(state.notebooks.find((item) => item.id === "item-3")?.parentId).toBeUndefined();
    state = workspaceReducer(state, {
      type: "note/added",
      id: "text",
      notebookId: "item-0",
      subjectId: "",
      kind: "note",
      updatedAt: "2026-09-27",
    });
    state = workspaceReducer(state, {
      type: "note/updated",
      id: "text",
      title: "Ideia 0",
      content: "Uma ideia que continua aqui.\nSegunda linha.",
      updatedAt: "2026-09-27",
    });
    saveWorkspace(localStorage, state);
    const restored = loadWorkspace(localStorage);
    expect(restored.notebooks.find((item) => item.id === "item-0")?.kind).toBe("note");
    expect(restored.notes.find((item) => item.id === "text")?.content).toContain("Segunda linha.");
    state = workspaceReducer(restored, { type: "notebook/stored", id: "item-0", folderId: null });
    expect(state.notebooks.find((item) => item.id === "item-0")?.parentId).toBeUndefined();
    expect(state.notes.find((item) => item.id === "text")?.content).toContain("Uma ideia");
  });
});
