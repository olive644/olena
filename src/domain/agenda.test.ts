import { describe, expect, it } from "vitest";
import { agendaPrompt, eventOccursOn, eventsOn, monthDates, shiftDate, weekDates } from "./agenda";
import { createInitialWorkspace, workspaceReducer, type StudyEvent } from "./workspace";
import { loadWorkspace, serializeWorkspace } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";

describe("agenda", () => {
  const event: StudyEvent = {
    id: "a",
    title: "Revisar frações",
    subjectId: "subject-1",
    date: "2026-10-11",
    time: "18:00",
    kind: "study" as const,
    durationMinutes: 15,
    recurrence: "weekly" as const,
    recurrenceUntil: "2026-11-01",
  };
  it("expands weekly occurrences without duplicating records, with an inclusive end", () => {
    expect(eventOccursOn(event, "2026-10-04")).toBe(false);
    expect(eventOccursOn(event, "2026-10-11")).toBe(true);
    expect(eventOccursOn(event, "2026-10-12")).toBe(false);
    expect(eventOccursOn(event, "2026-11-01")).toBe(true);
    expect(eventOccursOn(event, "2026-11-08")).toBe(false);
    expect(eventsOn({ ...createInitialWorkspace(), events: [event] }, "2026-10-18")).toEqual([
      event,
    ]);
  });
  it("uses local calendar dates across months, leap years and Sunday weeks", () => {
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekDates("2026-10-11")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    expect(monthDates("2026-10-11")).toHaveLength(42);
  });
  it("keeps legacy events and new metadata through storage and account merge", () => {
    const base = createInitialWorkspace();
    const next = {
      ...base,
      events: [
        event,
        { id: "old", title: "Aula", subjectId: "subject-1", date: "2026-10-11", time: "19:00" },
      ],
    };
    const loaded = loadWorkspace({ getItem: () => serializeWorkspace(next) });
    expect(loaded.events).toEqual(next.events);
    expect(mergeWorkspaceStates(base, loaded, base).workspace.events).toEqual(next.events);
  });
  it("counts real focus minutes per occurrence, not opening or another subject/day", () => {
    const initial = { ...createInitialWorkspace(), events: [event] };
    expect(initial.events[0]?.completedDates).toBeUndefined();
    const partial = workspaceReducer(initial, {
      type: "focus/recorded",
      subjectId: event.subjectId,
      durationMinutes: 5,
      completedAt: "2026-10-11T20:00:00Z",
      agendaEventId: event.id,
      agendaDate: event.date,
    });
    expect(partial.events[0]?.completedDates).toBeUndefined();
    const wrongSubject = workspaceReducer(partial, {
      type: "focus/recorded",
      subjectId: "another-subject",
      durationMinutes: 30,
      completedAt: "2026-10-11T20:05:00Z",
      agendaEventId: event.id,
      agendaDate: event.date,
    });
    expect(wrongSubject.events[0]?.completedDates).toBeUndefined();
    const stillPartial = workspaceReducer(wrongSubject, {
      type: "focus/recorded",
      subjectId: event.subjectId,
      durationMinutes: 2,
      completedAt: "2026-10-11T20:07:00Z",
      agendaEventId: event.id,
      agendaDate: event.date,
    });
    expect(stillPartial.events[0]?.completedDates).toBeUndefined();
    const complete = workspaceReducer(partial, {
      type: "focus/recorded",
      subjectId: event.subjectId,
      durationMinutes: 10,
      completedAt: "2026-10-11T20:10:00Z",
      agendaEventId: event.id,
      agendaDate: event.date,
    });
    expect(complete.events[0]?.completedDates).toEqual([event.date]);
    const anotherDay = workspaceReducer(complete, {
      type: "focus/recorded",
      subjectId: event.subjectId,
      durationMinutes: 5,
      completedAt: "2026-10-18T20:00:00Z",
      agendaEventId: event.id,
      agendaDate: "2026-10-18",
    });
    expect(anotherDay.events[0]?.completedDates).toEqual([event.date]);
  });
  it("edits, reschedules and deletes without deleting focus history", () => {
    let state = workspaceReducer(
      { ...createInitialWorkspace(), events: [event] },
      {
        type: "event/updated",
        id: event.id,
        changes: { ...event, title: "Novo título", date: "2026-10-12" },
      },
    );
    expect(state.events[0]?.date).toBe("2026-10-12");
    state = workspaceReducer(state, {
      type: "focus/recorded",
      subjectId: event.subjectId,
      durationMinutes: 15,
      completedAt: "2026-10-12T20:00:00Z",
      agendaEventId: event.id,
      agendaDate: "2026-10-12",
    });
    state = workspaceReducer(state, { type: "event/removed", id: event.id });
    expect(state.events).toHaveLength(0);
    expect(state.focusSessions).toHaveLength(1);
  });
  it("prepares bounded context only, asking for confirmation rather than changing state", () => {
    const state = { ...createInitialWorkspace(), events: [event] };
    const prompt = agendaPrompt(state, event.date);
    expect(prompt).toContain("18:00 Revisar frações");
    expect(prompt).toContain("Não altere minha agenda");
    expect(prompt.length).toBeLessThanOrEqual(2000);
    expect(state.events).toEqual([event]);
  });
});
