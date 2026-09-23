import { describe, expect, it } from "vitest";
import { createInitialWorkspace } from "../domain/workspace";
import {
  MAX_WORKSPACE_HISTORY,
  WORKSPACE_HISTORY_KEY,
  loadWorkspaceHistory,
  recordWorkspaceSnapshot,
} from "./workspace-history";

describe("workspace history", () => {
  it("registra versões recentes e ignora duplicatas consecutivas", () => {
    const storage = window.localStorage;
    storage.clear();
    const initial = createInitialWorkspace();

    expect(recordWorkspaceSnapshot(storage, initial, 100)).toBe(true);
    expect(recordWorkspaceSnapshot(storage, initial, 200)).toBe(false);
    const changed = {
      ...initial,
      subjects: [...initial.subjects, { id: "math", name: "Matemática", color: "#7433e0" }],
    };
    expect(recordWorkspaceSnapshot(storage, changed, 300)).toBe(true);

    const history = loadWorkspaceHistory(storage);
    expect(history).toHaveLength(2);
    expect(history[0]?.savedAt).toBe(300);
    expect(history[1]?.workspace.subjects).toHaveLength(1);
  });

  it("limita a quantidade e descarta conteúdo inválido", () => {
    const storage = window.localStorage;
    storage.clear();
    const initial = createInitialWorkspace();
    for (let index = 0; index < MAX_WORKSPACE_HISTORY + 2; index += 1) {
      const workspace = {
        ...initial,
        tasks: [
          {
            id: `task-${index}`,
            title: `Tarefa ${index}`,
            subjectId: "",
            dueDate: "",
            completed: false,
          },
        ],
      };
      recordWorkspaceSnapshot(storage, workspace, index + 1);
    }
    expect(loadWorkspaceHistory(storage)).toHaveLength(MAX_WORKSPACE_HISTORY);
    storage.setItem(
      WORKSPACE_HISTORY_KEY,
      JSON.stringify({ version: 1, entries: [{ broken: true }] }),
    );
    expect(loadWorkspaceHistory(storage)).toEqual([]);
  });
});
