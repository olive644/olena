import { describe, expect, it } from "vitest";
import {
  addDays,
  changeSeries,
  displayEventsOn,
  eventInstant,
  occurrenceOn,
  startsOn,
  validateCalendarEvent,
} from "./agenda-calendar";
import { exportAgenda, importAgenda } from "./agenda-ics";
import { createInitialWorkspace, workspaceReducer, type StudyEvent } from "./workspace";
import { loadWorkspace, serializeWorkspace } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";

const base: StudyEvent = {
  id: "a",
  title: "Revisão",
  subjectId: "subject-english",
  date: "2026-10-12",
  time: "18:00",
  durationMinutes: 30,
  timeZone: "America/Sao_Paulo",
};
describe("calendar events", () => {
  it("does not transfer a completed occurrence onto a different date", () => {
    const original = {
      ...base,
      recurrenceFrequency: "daily" as const,
      completedDates: [base.date],
    };
    const moved = changeSeries(original, base.date, "this", { ...original, date: "2026-10-13" });
    expect(moved.events[1]?.completedDates).toEqual([]);
    expect(moved.events[0]?.completedDates).toEqual([base.date]);
  });
  it("keeps long appointments readable in the v7 carrier", () => {
    const event = {
      ...base,
      durationMinutes: 180,
      calendarDurationMinutes: 240,
      endDate: base.date,
      endTime: "22:00",
    };
    const state = createInitialWorkspace();
    state.events = [event];
    expect(loadWorkspace({ getItem: () => serializeWorkspace(state) }).events).toEqual([event]);
    const imported = importAgenda(exportAgenda([event]), base.subjectId);
    expect(imported.events[0]?.durationMinutes).toBe(180);
    expect(imported.events[0]?.calendarDurationMinutes).toBe(240);
  });
  it("keeps old weekly data and new optional metadata through reducer/storage", () => {
    const event = {
      ...base,
      recurrence: "none" as const,
      recurrenceFrequency: "daily" as const,
      endDate: "2026-10-12",
      endTime: "18:30",
      reminders: [15],
      links: ["https://example.com"],
      description: "Descrição",
      guests: ["test@example.com"],
      attachments: [
        { id: "f", name: "test.png", mime: "image/png", data: "data:image/png;base64,AA==" },
      ],
    };
    const state = workspaceReducer(createInitialWorkspace(), {
      type: "event/series-changed",
      removeIds: [],
      events: [event],
    });
    expect(loadWorkspace({ getItem: () => serializeWorkspace(state) }).events).toEqual([event]);
    expect(startsOn({ ...base, recurrence: "weekly" }, "2026-10-19")).toBe(true);
    expect(startsOn(event, "2026-10-13")).toBe(true);
  });
  it("supports intervals, selected weekdays, month-end and leap-day without date drift", () => {
    expect(
      startsOn({ ...base, recurrenceFrequency: "daily", recurrenceInterval: 2 }, "2026-10-14"),
    ).toBe(true);
    expect(
      startsOn({ ...base, recurrenceFrequency: "daily", recurrenceInterval: 2 }, "2026-10-13"),
    ).toBe(false);
    const weekly = {
      ...base,
      recurrenceFrequency: "weekly" as const,
      recurrenceDays: [1, 3],
      recurrenceUntil: "2026-11-01",
      recurrenceInterval: 2,
    };
    expect(startsOn(weekly, "2026-10-14")).toBe(true);
    expect(startsOn(weekly, "2026-10-21")).toBe(false);
    expect(startsOn(weekly, "2026-10-28")).toBe(true);
    expect(
      startsOn({ ...base, date: "2026-01-31", recurrenceFrequency: "monthly" }, "2026-02-28"),
    ).toBe(false);
    expect(
      startsOn({ ...base, date: "2026-01-31", recurrenceFrequency: "monthly" }, "2026-03-31"),
    ).toBe(true);
    expect(
      startsOn({ ...base, date: "2024-02-29", recurrenceFrequency: "yearly" }, "2025-02-28"),
    ).toBe(false);
    expect(
      startsOn({ ...base, date: "2024-02-29", recurrenceFrequency: "yearly" }, "2028-02-29"),
    ).toBe(true);
  });
  it("includes multi-day and all-day events but not the exclusive midnight end", () => {
    const event = { ...base, endDate: "2026-10-14", endTime: "00:00" };
    expect(occurrenceOn(event, "2026-10-12")).toBe(base.date);
    expect(occurrenceOn(event, "2026-10-13")).toBe(base.date);
    expect(occurrenceOn(event, "2026-10-14")).toBeNull();
    expect(occurrenceOn({ ...event, allDay: true }, "2026-10-14")).toBe(base.date);
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
  it("resolves the actual timezone and rejects nonexistent DST wall times", () => {
    expect(eventInstant(base.date, base.time, base.timeZone)).toBe(
      Date.parse("2026-10-12T21:00:00Z"),
    );
    expect(Number.isNaN(eventInstant("2026-03-08", "02:30", "America/New_York"))).toBe(true);
    expect(validateCalendarEvent({ ...base, endDate: base.date, endTime: "17:00" })).toBeTruthy();
    expect(validateCalendarEvent({ ...base, links: ["javascript:alert(1)"] })).toBeTruthy();
    expect(validateCalendarEvent({ ...base, date: "2026-02-31" })).toBeTruthy();
  });
  it("projects UTC events onto the correct local calendar day without changing stored data", () => {
    const event = { ...base, date: "2026-10-13", time: "01:00", timeZone: "UTC" };
    const displayed = displayEventsOn([event], "2026-10-12", "America/Sao_Paulo");
    expect(displayed[0]).toMatchObject({
      date: "2026-10-12",
      time: "22:00",
      displayOccurrence: "2026-10-13",
    });
    expect(displayEventsOn([event], "2026-10-13", "America/Sao_Paulo")).toEqual([]);
    expect(event.time).toBe("01:00");
    expect(displayEventsOn([{ ...event, time: "invalid" }], "2026-10-12")).toEqual([]);
  });
  it("changes one occurrence or following events atomically while preserving past focus and exceptions", () => {
    const event = {
      ...base,
      recurrence: "weekly" as const,
      completedDates: [base.date],
      excludedDates: ["2026-11-02"],
    };
    const single = changeSeries(event, "2026-10-19", "this", {
      ...event,
      title: "Só esta",
      date: "2026-10-20",
    });
    expect(startsOn(single.events[0]!, "2026-10-19")).toBe(false);
    expect(startsOn(single.events[0]!, "2026-10-26")).toBe(true);
    expect(single.events[1]?.recurrenceFrequency).toBe("none");
    const future = changeSeries(event, "2026-10-19", "following", {
      ...event,
      date: "2026-10-19",
      time: "20:00",
    });
    expect(startsOn(future.events[0]!, "2026-10-12")).toBe(true);
    expect(startsOn(future.events[0]!, "2026-10-19")).toBe(false);
    expect(future.events[0]?.completedDates).toEqual([base.date]);
    expect(
      changeSeries(event, base.date, "all", { ...event, title: "Toda" }).events[0]?.excludedDates,
    ).toEqual(["2026-11-02"]);
  });
  it("merges independent field edits and completion days without discarding either device", () => {
    const original = { ...createInitialWorkspace(), events: [base] };
    const local = {
      ...original,
      events: [{ ...base, title: "PC", completedDates: ["2026-10-12"] }],
    };
    const remote = {
      ...original,
      events: [{ ...base, description: "Celular", completedDates: ["2026-10-19"] }],
    };
    const merged = mergeWorkspaceStates(original, local, remote);
    expect(merged.conflicts).toBe(0);
    expect(merged.workspace.events[0]).toMatchObject({
      title: "PC",
      description: "Celular",
      completedDates: ["2026-10-12", "2026-10-19"],
    });
    expect(
      mergeWorkspaceStates(original, local, { ...original, events: [{ ...base, title: "Outro" }] })
        .conflicts,
    ).toBe(1);
    expect(
      mergeWorkspaceStates(original, { ...original, events: [] }, original).workspace.events,
    ).toEqual([]);
  });
});
describe("ICS exchange", () => {
  it("round trips Unicode, escaped text, zone, weekdays and all-day inclusive ends", () => {
    const event = {
      ...base,
      title: "Ação; revisão, matemática",
      description: "Linha 1\nLinha 2",
      recurrenceUntil: "2026-11-01",
      recurrenceFrequency: "weekly" as const,
      recurrenceDays: [1, 3],
      excludedDates: ["2026-10-19"],
    };
    const result = importAgenda(
      exportAgenda([event, { ...base, id: "day", allDay: true, endDate: "2026-10-14" }]),
      base.subjectId,
    );
    expect(result.skipped).toBe(0);
    expect(result.events[0]).toMatchObject({
      title: event.title,
      description: event.description,
      timeZone: base.timeZone,
      recurrenceDays: [1, 3],
      excludedDates: ["2026-10-19"],
      recurrenceUntil: "2026-11-01",
    });
    expect(result.events[1]).toMatchObject({ allDay: true, endDate: "2026-10-14" });
    expect(importAgenda(exportAgenda([event]), base.subjectId).events[0]?.id).toBe(
      result.events[0]?.id,
    );
  });
  it("reports unsupported rules and invalid dates instead of inventing events", () => {
    expect(
      importAgenda(
        "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20260231T180000\r\nEND:VEVENT\r\nEND:VCALENDAR",
        "",
      ).skipped,
    ).toBe(1);
    expect(
      importAgenda(
        exportAgenda([base]).replace("END:VEVENT", "RRULE:FREQ=DAILY;COUNT=10\r\nEND:VEVENT"),
        "",
      ).skipped,
    ).toBe(1);
    expect(() => importAgenda("not a calendar", "")).toThrow();
  });
});
