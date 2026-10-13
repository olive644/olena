import { expect, it } from "vitest";
import { agendaSearchDate } from "./agenda-search";
import { agendaSearchText, matchesCalendarFilter } from "./agenda-calendar";
import type { StudyEvent } from "./workspace";
const event: StudyEvent = {
  id: "test",
  title: "Reunião escolar",
  subjectId: "",
  date: "2026-10-12",
  time: "23:30",
  timeZone: "America/Manaus",
};
it("normalizes spaces, accents and case for events and tasks", () => {
  expect(agendaSearchText("  REUNIÃO   ESCOLAR ")).toBe("reuniao escolar");
  expect(matchesCalendarFilter(event, "  reuniao ", "", "")).toBe(true);
});
it("finds one real occurrence without a visible-month limit and projects the account date", () => {
  expect(agendaSearchDate(event, "America/Sao_Paulo")).toBe("2026-10-13");
  expect(agendaSearchDate({ ...event, allDay: true }, "America/Sao_Paulo")).toBe("2026-10-12");
  expect(
    agendaSearchDate({ ...event, date: "2028-01-01", time: "10:00" }, "America/Sao_Paulo"),
  ).toBe("2028-01-01");
});
it("skips excluded starts, missing month days and leap-year exceptions", () => {
  expect(
    agendaSearchDate(
      { ...event, allDay: true, recurrenceFrequency: "weekly", excludedDates: [event.date] },
      "America/Sao_Paulo",
    ),
  ).toBe("2026-10-19");
  expect(
    agendaSearchDate(
      {
        ...event,
        allDay: true,
        date: "2026-01-31",
        recurrenceFrequency: "monthly",
        excludedDates: ["2026-01-31"],
      },
      "America/Sao_Paulo",
    ),
  ).toBe("2026-03-31");
  expect(
    agendaSearchDate(
      {
        ...event,
        allDay: true,
        date: "2024-02-29",
        recurrenceFrequency: "yearly",
        excludedDates: ["2024-02-29"],
      },
      "America/Sao_Paulo",
    ),
  ).toBe("2028-02-29");
  expect(
    agendaSearchDate(
      {
        ...event,
        recurrenceFrequency: "daily",
        recurrenceUntil: event.date,
        excludedDates: [event.date],
      },
      "America/Sao_Paulo",
    ),
  ).toBeNull();
});
