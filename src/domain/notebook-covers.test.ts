import { describe, expect, it } from "vitest";
import { NOTEBOOK_COVERS, notebookCoverTheme, notebookCoverUnlocked } from "./notebook-covers";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { isWorkspaceState } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";

describe("capas conquistadas dos cadernos", () => {
  it("usa os mesmos requisitos dos headers e conserva as duas capas legadas", () => {
    expect(NOTEBOOK_COVERS).toHaveLength(4);
    for (const style of [undefined, "helena-estrelas", "oliver-estrelas"] as const)
      expect(notebookCoverTheme(style)).toBe("stars");
    expect(notebookCoverUnlocked("helena-estrelas", new Set())).toBe(true);
    expect(notebookCoverUnlocked("pride", new Set())).toBe(true);
    expect(notebookCoverTheme("pride")).toBe("pride");
    expect(notebookCoverUnlocked("mathematics", new Set())).toBe(false);
    expect(notebookCoverUnlocked("english", new Set(["correct-100"]))).toBe(false);
    expect(notebookCoverUnlocked("english", new Set(["english-correct-100"]))).toBe(true);
    expect(notebookCoverUnlocked("mathematics", new Set(["correct-100"]))).toBe(true);
  });
  it("persiste a capa sem alterar páginas e conserva após merge de edição independente", () => {
    const base = workspaceReducer(createInitialWorkspace(), {
      type: "notebook/added",
      id: "cover-book",
      title: "Ideias",
      subjectId: "",
      createdAt: "2026-11-13T12:00:00Z",
    });
    for (const coverStyle of [
      "pride",
      "mathematics",
      "english",
      "helena-estrelas",
      "oliver-estrelas",
    ] as const) {
      const chosen = workspaceReducer(base, {
        type: "notebook/organized",
        id: "cover-book",
        changes: { coverStyle },
      });
      expect(isWorkspaceState(JSON.parse(JSON.stringify(chosen)))).toBe(true);
      expect(chosen.notebooks[0]?.pageIds).toEqual(base.notebooks[0]?.pageIds);
      const remote = workspaceReducer(base, { type: "notebook/shelf-named", name: "Estudos" });
      const merged = mergeWorkspaceStates(base, chosen, remote).workspace;
      expect(merged.notebooks.find((book) => book.id === "cover-book")?.coverStyle).toBe(
        coverStyle,
      );
      expect(merged.notebookShelfName).toBe("Estudos");
    }
    expect(
      isWorkspaceState({
        ...base,
        notebooks: base.notebooks.map((book) => ({ ...book, coverStyle: "invalid" })),
      }),
    ).toBe(false);
  });
});
