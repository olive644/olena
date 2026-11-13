import { describe, expect, it } from "vitest";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";
import { isWorkspaceState } from "../data/local-workspace";

describe("nome da prateleira", () => {
  it("aceita estado legado e limita o nome sem tocar nos cadernos", () => {
    const before = createInitialWorkspace();
    expect(isWorkspaceState(before)).toBe(true);
    const after = workspaceReducer(before, {
      type: "notebook/shelf-named",
      name: "  " + "a".repeat(70) + "  ",
    });
    expect(after.notebookShelfName).toHaveLength(40);
    expect(after.notebooks).toBe(before.notebooks);
    expect(isWorkspaceState(JSON.parse(JSON.stringify(after)))).toBe(true);
    expect(isWorkspaceState({ ...after, notebookShelfName: "a".repeat(41) })).toBe(false);
  });
  it("conserva o nome quando outro aparelho antigo muda apenas uma tarefa", () => {
    const base = createInitialWorkspace();
    const named = workspaceReducer(base, { type: "notebook/shelf-named", name: "Meu canto" });
    const merged = mergeWorkspaceStates(base, base, named).workspace;
    expect(merged.notebookShelfName).toBe("Meu canto");
    const cleared = workspaceReducer(merged, { type: "notebook/shelf-named", name: "" });
    expect(mergeWorkspaceStates(merged, cleared, merged).workspace.notebookShelfName).toBe("");
  });
});
