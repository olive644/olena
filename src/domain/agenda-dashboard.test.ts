import { describe, expect, it } from "vitest";
import { agendaDashboard } from "./agenda-dashboard";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { loadWorkspace, saveWorkspace } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";

describe("agenda dashboard data", () => {
  it("separates modalities, excludes legacy records, and preserves optional mode through storage", () => {
    let state = createInitialWorkspace();
    for (const mode of [undefined, "timer", "pomodoro"] as const)
      state = workspaceReducer(state, {
        type: "focus/recorded",
        subjectId: state.subjects[0]!.id,
        durationMinutes: 25,
        completedAt: "2026-10-06T12:00:00",
        ...(mode ? { mode } : {}),
      });
    saveWorkspace(window.localStorage, state);
    const loaded = loadWorkspace(window.localStorage);
    expect(loaded.focusSessions.map((session) => session.mode)).toEqual([
      undefined,
      "timer",
      "pomodoro",
    ]);
    for (const category of ["timer", "pomodoro"] as const) {
      const data = agendaDashboard(loaded, { start: "2026-10-05", end: "2026-10-08" }, category);
      expect(data.bars.reduce((sum, item) => sum + item.value, 0)).toBe(25);
      expect(data.pie.reduce((sum, item) => sum + item.value, 0)).toBe(25);
      expect(data.legacy).toBe(1);
    }
  });
  it("filters notebook creation dates and groups long intervals without dropping totals", () => {
    const state = createInitialWorkspace();
    state.notebooks = ["2026-10-01", "2026-10-31", "2026-09-30"].map((date) => ({
      id: date,
      title: "Caderno",
      subjectId: "",
      pageIds: [],
      createdAt: `${date}T12:00:00`,
    }));
    const data = agendaDashboard(state, { start: "2026-10-01", end: "2026-10-31" }, "notes");
    expect(data.bars.length).toBeLessThanOrEqual(7);
    expect(data.bars.reduce((sum, item) => sum + item.value, 0)).toBe(2);
    expect(data.pie).toEqual([{ label: "Cadernos", value: 2 }]);
  });
  it("does not attribute unchosen focus subjects and counts shelf types without double counting Note pages", () => {
    const state = createInitialWorkspace();
    state.focusSessions = [
      {
        id: "timer",
        mode: "timer",
        subjectId: state.subjects[0]!.id,
        completedAt: "2026-10-11T12:00:00",
        durationMinutes: 4,
      },
    ];
    const range = { start: "2026-10-11", end: "2026-10-11" };
    const focus = agendaDashboard(state, range, "timer");
    expect(focus.pieTitle).toBe("Por dia");
    expect(focus.pie).toEqual([{ label: "11/10", value: 4 }]);
    state.notebooks = [undefined, undefined, "collection", "note"].map((kind, index) => ({
      id: String(index),
      title: ["Meu caderno", "Ciências", "Minha pasta", "Minha Note"][index]!,
      subjectId: "",
      pageIds: index === 3 ? ["note-page"] : [],
      createdAt: "2026-10-11T12:00:00",
      ...(kind ? { kind: kind as "collection" | "note" } : {}),
    }));
    state.notes = [
      {
        id: "note-page",
        kind: "note",
        title: "",
        content: "",
        subjectId: "",
        updatedAt: "2026-10-11T12:00:00",
        assets: [],
      },
    ];
    const notes = agendaDashboard(state, range, "notes");
    expect(notes.pie).toEqual([
      { label: "Cadernos", value: 2 },
      { label: "Pastas", value: 1 },
      { label: "Notes", value: 1 },
    ]);
    expect(notes.bars[0]?.value).toBe(4);
    expect(notes.entries.map((entry) => entry.title)).toContain("Meu caderno");
    expect(notes.unit).toBe("itens");
    expect(
      agendaDashboard(state, { start: "2026-10-12", end: "2026-10-12" }, "notes").entries,
    ).toEqual([]);
  });
  it("filters dated island activity and preserves old workspaces, retries and sync", () => {
    const base = createInitialWorkspace();
    const activity = {
      id: "round:question",
      islandId: "mathematics:school",
      islandName: "Matemática · Ensino médio",
      completedAt: "2026-10-01T12:00:00",
      answers: 1,
      correct: 1,
    };
    const state = workspaceReducer(base, { type: "practice/recorded", activity });
    expect(workspaceReducer(state, { type: "practice/recorded", activity })).toBe(state);
    saveWorkspace(window.localStorage, state);
    const loaded = loadWorkspace(window.localStorage);
    expect(loaded.practiceActivities).toEqual([activity]);
    const remote = workspaceReducer(base, {
      type: "practice/recorded",
      activity: { ...activity, id: "other" },
    });
    expect(mergeWorkspaceStates(base, state, remote).workspace.practiceActivities).toHaveLength(2);
    expect(mergeWorkspaceStates(state, state, base).workspace.practiceActivities).toEqual([
      activity,
    ]);
    const data = agendaDashboard(loaded, { start: "2026-10-01", end: "2026-10-01" }, "islands");
    expect(data.bars[0]?.value).toBe(1);
    expect(data.pie).toEqual([{ label: activity.islandName, value: 1 }]);
    expect(
      agendaDashboard(loaded, { start: "2026-10-02", end: "2026-10-02" }, "islands").pie,
    ).toEqual([]);
    expect(
      agendaDashboard(base, { start: "2026-10-01", end: "2026-10-01" }, "islands").pie,
    ).toEqual([]);
    saveWorkspace(window.localStorage, base);
    expect(loadWorkspace(window.localStorage).focusSessions).toEqual(base.focusSessions);
  });
});
