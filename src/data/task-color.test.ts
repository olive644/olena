import { expect, it } from "vitest";
import { createInitialWorkspace, workspaceReducer } from "../domain/workspace";
import { loadWorkspace } from "./local-workspace";
import { mergeWorkspaceStates } from "../domain/workspace-sync-merge";

it("preserves task colors through create, edit, toggle and reload", () => {
  let state = workspaceReducer(createInitialWorkspace(), {
    type: "task/added",
    title: "Revisar",
    subjectId: "subject-english",
    dueDate: "2026-10-14",
    color: "#2d8a67",
  });
  const task = state.tasks[0]!;
  expect(task.color).toBe("#2d8a67");
  state = workspaceReducer(state, {
    type: "task/updated",
    id: task.id,
    changes: {
      title: task.title,
      subjectId: task.subjectId,
      dueDate: "2026-10-15",
      color: "#4070c9",
    },
  });
  state = workspaceReducer(state, { type: "task/toggled", id: task.id });
  const reloaded = loadWorkspace({ getItem: () => JSON.stringify(state) });
  expect(reloaded.tasks[0]).toMatchObject({
    color: "#4070c9",
    completed: true,
    dueDate: "2026-10-15",
  });
});

it("accepts old uncolored tasks and rejects unsafe color payloads", () => {
  const state = workspaceReducer(createInitialWorkspace(), {
    type: "task/added",
    title: "Antiga",
    subjectId: "subject-english",
    dueDate: "2026-10-14",
  });
  expect(loadWorkspace({ getItem: () => JSON.stringify(state) }).tasks).toHaveLength(1);
  state.tasks[0]!.color = "url(javascript:alert(1))";
  expect(loadWorkspace({ getItem: () => JSON.stringify(state) }).tasks).toHaveLength(0);
});

it("keeps a task color when account changes merge with another device", () => {
  const base = workspaceReducer(createInitialWorkspace(), {
    type: "task/added",
    title: "Sincronizada",
    subjectId: "subject-english",
    dueDate: "2026-10-14",
  });
  const task = base.tasks[0]!;
  const local = workspaceReducer(base, {
    type: "task/updated",
    id: task.id,
    changes: { ...task, color: "#4070c9" },
  });
  expect(mergeWorkspaceStates(base, local, base).workspace.tasks[0]!.color).toBe("#4070c9");
});
