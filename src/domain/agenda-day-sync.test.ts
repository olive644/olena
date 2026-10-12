import { expect, it } from "vitest";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";
import { loadWorkspace, saveWorkspace } from "../data/local-workspace";
import { eventsOn } from "./agenda";

it("preserves hours and independent day planning from two devices through sync and reload", () => {
  const base = createInitialWorkspace();
  const subjectId = base.subjects[0]!.id;
  const local = workspaceReducer(base, {
    type: "event/added",
    title: "Revisão",
    subjectId,
    date: "2026-10-12",
    time: "14:30",
    kind: "appointment",
    durationMinutes: 30,
  });
  const remote = workspaceReducer(base, {
    type: "event/added",
    title: "Estudo",
    subjectId,
    date: "2026-10-13",
    time: "09:00",
    kind: "study",
    durationMinutes: 25,
  });
  const merged = mergeWorkspaceStates(base, local, remote);
  expect(merged.conflicts).toBe(0);
  expect(merged.workspace.events).toHaveLength(2);
  saveWorkspace(localStorage, merged.workspace);
  const loaded = loadWorkspace(localStorage);
  expect(eventsOn(loaded, "2026-10-12")[0]?.time).toBe("14:30");
  expect(eventsOn(loaded, "2026-10-13")[0]?.durationMinutes).toBe(25);
  expect(eventsOn(loaded, "2026-10-14")).toHaveLength(0);
  expect(
    mergeWorkspaceStates(merged.workspace, merged.workspace, merged.workspace).workspace.events,
  ).toHaveLength(2);
});
