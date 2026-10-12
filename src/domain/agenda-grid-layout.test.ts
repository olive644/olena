import { expect, it } from "vitest";
import { layoutAgendaDay } from "./agenda-grid-layout";
import type { StudyEvent } from "./workspace";

it("allocates separate lanes for short visually overlapping events", () => {
  const events: StudyEvent[] = ["09:00", "09:15", "09:30", "11:00"].map((time, index) => ({
    id: String(index),
    title: "Evento",
    subjectId: "",
    date: "2026-10-12",
    time,
    durationMinutes: 15,
  }));
  const layout = layoutAgendaDay(events, "2026-10-12");
  expect(layout.slice(0, 3).map((item) => item.lane)).toEqual([0, 1, 2]);
  expect(layout.slice(0, 3).every((item) => item.lanes === 3 && item.height >= 44)).toBe(true);
  expect(layout[3]?.lanes).toBe(1);
});
