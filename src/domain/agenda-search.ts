import type { StudyEvent } from "./workspace";
import {
  addDays,
  eventInstant,
  frequency,
  startsOn,
  validDate,
  zonedDateTime,
} from "./agenda-calendar";

/** Uma ocorrência válida por série, sem limitar pesquisa ao mês ou materializar rotinas. */
export function agendaSearchDate(event: StudyEvent, zone: string): string | null {
  if (!validDate(event.date)) return null;
  const start = new Date(`${event.date}T00:00:00Z`),
    interval = event.recurrenceInterval ?? 1;
  const mode = frequency(event);
  for (let cycle = 0; cycle <= (event.excludedDates?.length ?? 0) + 24; cycle++) {
    let candidates: string[];
    if (mode === "weekly") {
      const monday = addDays(event.date, -((start.getUTCDay() + 6) % 7) + cycle * interval * 7);
      candidates = (event.recurrenceDays?.length ? event.recurrenceDays : [start.getUTCDay()])
        .map((day) => addDays(monday, (day + 6) % 7))
        .sort();
      if (cycle === 0) candidates = [event.date, ...candidates];
    } else if (mode === "monthly" || mode === "yearly") {
      const next = new Date(
        Date.UTC(
          start.getUTCFullYear() + (mode === "yearly" ? cycle * interval : 0),
          start.getUTCMonth() + (mode === "monthly" ? cycle * interval : 0),
          start.getUTCDate(),
        ),
      );
      candidates = [next.toISOString().slice(0, 10)];
    } else candidates = [addDays(event.date, mode === "daily" ? cycle * interval : 0)];
    for (const date of candidates) {
      if (startsOn(event, date))
        return event.allDay
          ? date
          : zonedDateTime(eventInstant(date, event.time, event.timeZone), zone).date;
    }
    if (
      mode === "none" ||
      candidates.every((date) => event.recurrenceUntil && date > event.recurrenceUntil)
    )
      break;
  }
  return null;
}
