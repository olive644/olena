import type { StudyEvent } from "./workspace";

export const recurrenceLabels = {
  none: "Não repetir",
  daily: "Diariamente",
  weekly: "Semanalmente",
  monthly: "Mensalmente",
  yearly: "Anualmente",
};
export type EventScope = "all" | "this" | "following";
export const frequency = (event: StudyEvent) =>
  event.recurrenceFrequency ?? event.recurrence ?? "none";
const DAY = 86_400_000;
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function dayDistance(start: string, end: string): number {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY;
}
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}
export function startsOn(event: StudyEvent, date: string): boolean {
  if (
    !validDate(date) ||
    !validDate(event.date) ||
    date < event.date ||
    event.excludedDates?.includes(date) ||
    (event.recurrenceUntil && date > event.recurrenceUntil)
  )
    return false;
  if (date === event.date) return true;
  const interval = event.recurrenceInterval ?? 1;
  const start = new Date(`${event.date}T00:00:00Z`),
    next = new Date(`${date}T00:00:00Z`);
  const days = dayDistance(event.date, date);
  switch (frequency(event)) {
    case "daily":
      return days % interval === 0;
    case "weekly": {
      const startMonday = dayDistance("1970-01-05", event.date) - ((start.getUTCDay() + 6) % 7);
      const nextMonday = dayDistance("1970-01-05", date) - ((next.getUTCDay() + 6) % 7);
      return (
        ((nextMonday - startMonday) / 7) % interval === 0 &&
        (event.recurrenceDays?.length ? event.recurrenceDays : [start.getUTCDay()]).includes(
          next.getUTCDay(),
        )
      );
    }
    case "monthly":
      return (
        ((next.getUTCFullYear() - start.getUTCFullYear()) * 12 +
          next.getUTCMonth() -
          start.getUTCMonth()) %
          interval ===
          0 && next.getUTCDate() === start.getUTCDate()
      );
    case "yearly":
      return (
        (next.getUTCFullYear() - start.getUTCFullYear()) % interval === 0 &&
        next.getUTCMonth() === start.getUTCMonth() &&
        next.getUTCDate() === start.getUTCDate()
      );
    default:
      return false;
  }
}
export function eventSpan(event: StudyEvent): number {
  return event.endDate && validDate(event.endDate)
    ? Math.max(0, Math.min(366, dayDistance(event.date, event.endDate)))
    : Math.floor(
        (Number(event.time.slice(0, 2)) * 60 +
          Number(event.time.slice(3)) +
          (event.calendarDurationMinutes ?? event.durationMinutes ?? 30)) /
          1440,
      );
}
export function occurrenceOn(event: StudyEvent, date: string): string | null {
  for (let offset = 0; offset <= eventSpan(event); offset++) {
    const start = addDays(date, -offset);
    if (
      startsOn(event, start) &&
      !(offset === eventSpan(event) && offset > 0 && !event.allDay && event.endTime === "00:00")
    )
      return start;
  }
  return null;
}
export function safeWebLink(value: string): boolean {
  if (
    [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
  )
    return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
const zoneFormats = new Map<string, Intl.DateTimeFormat>();
function zoneFormat(zone: string) {
  const cached = zoneFormats.get(zone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  if (zoneFormats.size >= 100) zoneFormats.clear();
  zoneFormats.set(zone, formatter);
  return formatter;
}
export function validZone(value: string): boolean {
  try {
    zoneFormat(value);
    return true;
  } catch {
    return false;
  }
}
/* Resolve wall time in its IANA zone. Reject nonexistent times at DST transitions. */
export function eventInstant(date: string, time: string, zone?: string): number {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || (zone && !validZone(zone)))
    return NaN;
  if (!zone) return new Date(`${date}T${time}`).getTime();
  const target = Date.parse(`${date}T${time}:00Z`);
  let instant = target;
  const formatter = zoneFormat(zone);
  for (let index = 0; index < 3; index++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    const wall = Date.parse(
      `${parts["year"]}-${parts["month"]}-${parts["day"]}T${parts["hour"]}:${parts["minute"]}:00Z`,
    );
    if (wall === target) return instant;
    instant += target - wall;
  }
  return NaN;
}
export function eventEnd(
  event: StudyEvent,
  occurrence = event.date,
): { date: string; time: string } {
  if (event.endDate && event.endTime)
    return { date: addDays(occurrence, eventSpan(event)), time: event.endTime };
  const total =
    Number(event.time.slice(0, 2)) * 60 +
    Number(event.time.slice(3)) +
    (event.calendarDurationMinutes ?? event.durationMinutes ?? 30);
  return {
    date: addDays(occurrence, Math.floor(total / 1440)),
    time: `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
  };
}
export function zonedDateTime(instant: number, zone: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    zoneFormat(zone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`,
    time: `${parts["hour"]}:${parts["minute"]}`,
  };
}
export function occurrenceDuration(event: StudyEvent, occurrence = event.date): number {
  if (event.allDay) return (eventSpan(event) + 1) * 1440;
  if (!event.endDate || !event.endTime)
    return event.calendarDurationMinutes ?? event.durationMinutes ?? 25;
  const end = eventEnd(event, occurrence);
  const minutes = Math.round(
    (eventInstant(end.date, end.time, event.timeZone) -
      eventInstant(occurrence, event.time, event.timeZone)) /
      60000,
  );
  return Number.isFinite(minutes) && minutes > 0 ? minutes : (event.durationMinutes ?? 25);
}
export type DisplayEvent = StudyEvent & { displayOccurrence: string };
export function displayEventsOn(
  events: StudyEvent[],
  date: string,
  zone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): DisplayEvent[] {
  const dayStart = eventInstant(date, "00:00", zone),
    dayEnd = eventInstant(addDays(date, 1), "00:00", zone);
  const result: DisplayEvent[] = [];
  for (const event of events) {
    if (event.allDay) {
      const occurrence = occurrenceOn(event, date);
      if (occurrence) result.push({ ...event, displayOccurrence: occurrence });
      continue;
    }
    if (
      !validDate(event.date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) ||
      (event.endDate && !validDate(event.endDate)) ||
      (event.endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.endTime)) ||
      (event.timeZone && !validZone(event.timeZone))
    )
      continue;
    const candidates =
      frequency(event) === "none"
        ? [event.date]
        : Array.from({ length: eventSpan(event) + 3 }, (_, index) =>
            addDays(date, index - eventSpan(event) - 1),
          );
    for (const occurrence of candidates) {
      if (!startsOn(event, occurrence)) continue;
      const end = eventEnd(event, occurrence),
        startInstant = eventInstant(occurrence, event.time, event.timeZone),
        endInstant = eventInstant(end.date, end.time, event.timeZone);
      if (!(startInstant < dayEnd && endInstant > dayStart)) continue;
      const startView = zonedDateTime(startInstant, zone),
        endView = zonedDateTime(endInstant, zone);
      result.push({
        ...event,
        date: startView.date,
        time: startView.time,
        endDate: endView.date,
        endTime: endView.time,
        timeZone: zone,
        recurrence: "none",
        recurrenceFrequency: "none",
        excludedDates: [],
        displayOccurrence: occurrence,
      });
    }
  }
  return result.sort(
    (a, b) => Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) || a.time.localeCompare(b.time),
  );
}
export function validateCalendarEvent(event: StudyEvent): string | null {
  if (
    event.reminders &&
    (event.reminders.length > 5 ||
      event.reminders.some(
        (minutes) => !Number.isInteger(minutes) || minutes < 0 || minutes > 10080,
      ))
  )
    return "Use até cinco lembretes, de 0 a 10080 minutos antes.";
  if (
    !event.title.trim() ||
    !validDate(event.date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)
  )
    return "Confira título, data e horário.";
  if (
    event.endDate &&
    (!validDate(event.endDate) ||
      event.endDate < event.date ||
      dayDistance(event.date, event.endDate) > 366)
  )
    return "O fim deve estar entre o início e 366 dias depois.";
  if (event.timeZone && !validZone(event.timeZone)) return "Escolha um fuso horário válido.";
  if (event.color !== undefined && !/^#[0-9a-f]{6}$/i.test(event.color))
    return "Escolha uma cor válida para o evento.";
  if (
    event.recurrenceInterval !== undefined &&
    (!Number.isInteger(event.recurrenceInterval) ||
      event.recurrenceInterval < 1 ||
      event.recurrenceInterval > 365)
  )
    return "O intervalo da repetição deve estar entre 1 e 365.";
  if (event.recurrenceDays?.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
    return "Confira os dias da repetição.";
  if (!event.allDay) {
    const end = eventEnd(event);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(end.time)) return "Confira o horário de término.";
    const start = eventInstant(event.date, event.time, event.timeZone),
      finish = eventInstant(end.date, end.time, event.timeZone);
    if (!Number.isFinite(start) || !Number.isFinite(finish) || finish <= start)
      return "O término deve ser depois do início. Confira também o fuso e o horário de verão.";
  }
  if (
    event.recurrenceUntil &&
    (!validDate(event.recurrenceUntil) || event.recurrenceUntil < event.date)
  )
    return "A repetição não pode terminar antes do início.";
  if (event.links?.some((link) => !safeWebLink(link)))
    return "Use links completos com http ou https.";
  if (event.guests?.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return "Confira os e-mails dos participantes.";
  return null;
}
export function changeSeries(
  original: StudyEvent,
  occurrence: string,
  scope: EventScope,
  next: StudyEvent | null,
): { removeIds: string[]; events: StudyEvent[] } {
  if (scope === "all" || frequency(original) === "none")
    return {
      removeIds: [original.id],
      events: next
        ? [
            {
              ...original,
              ...next,
              id: original.id,
              excludedDates: frequency(next) === "none" ? [] : (original.excludedDates ?? []),
              completedDates: original.completedDates ?? [],
            },
          ]
        : [],
    };
  if (scope === "this")
    return {
      removeIds: [original.id],
      events: [
        {
          ...original,
          excludedDates: [...new Set([...(original.excludedDates ?? []), occurrence])],
        },
        ...(next
          ? [
              {
                ...next,
                id: crypto.randomUUID(),
                recurrence: "none" as const,
                recurrenceFrequency: "none" as const,
                recurrenceUntil: "",
                excludedDates: [],
                completedDates:
                  next.date === occurrence && original.completedDates?.includes(occurrence)
                    ? [next.date]
                    : [],
              },
            ]
          : []),
      ],
    };
  if (occurrence === original.date) return changeSeries(original, occurrence, "all", next);
  return {
    removeIds: [original.id],
    events: [
      { ...original, recurrenceUntil: addDays(occurrence, -1) },
      ...(next
        ? [
            {
              ...next,
              id: crypto.randomUUID(),
              excludedDates: (original.excludedDates ?? []).filter((date) => date >= occurrence),
              completedDates: (original.completedDates ?? []).filter((date) => date >= occurrence),
            },
          ]
        : []),
    ],
  };
}
export function matchesCalendarFilter(
  event: StudyEvent,
  query: string,
  subject: string,
  type: string,
): boolean {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  return (
    (!subject || event.subjectId === subject) &&
    (!type || (event.kind ?? "appointment") === type) &&
    normalize(`${event.title} ${event.description ?? ""} ${event.location ?? ""}`).includes(
      normalize(query),
    )
  );
}
