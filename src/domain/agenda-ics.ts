import {
  addDays,
  eventEnd,
  eventInstant,
  frequency,
  safeWebLink,
  validDate,
  validateCalendarEvent,
  validZone,
  zonedDateTime,
} from "./agenda-calendar";
import type { StudyEvent } from "./workspace";

const escape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const unescape = (value: string) =>
  value.replace(/\\([nN,;\\])/g, (_, match: string) =>
    match.toLowerCase() === "n" ? "\n" : match,
  );
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > 73) {
      parts.push(current);
      current = " " + char;
    } else current += char;
  }
  parts.push(current);
  return parts.join("\r\n");
}
export function exportAgenda(events: StudyEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OlenaStudy//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
  ];
  for (const event of events) {
    if (validateCalendarEvent(event)) continue;
    const date = (key: string) => key.replace(/-/g, "");
    const time = (value: string) => value.replace(":", "") + "00";
    const end = eventEnd(event);
    const zone = event.timeZone ? `;TZID=${event.timeZone}` : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escape(event.id)}@olenastudy`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `SUMMARY:${escape(event.title)}`,
    );
    if (event.kind) lines.push(`X-OLENA-KIND:${event.kind}`);
    if (event.allDay)
      lines.push(
        `DTSTART;VALUE=DATE:${date(event.date)}`,
        `DTEND;VALUE=DATE:${date(addDays(event.endDate || event.date, 1))}`,
      );
    else
      lines.push(
        `DTSTART${zone}:${date(event.date)}T${time(event.time)}`,
        `DTEND${zone}:${date(end.date)}T${time(end.time)}`,
      );
    if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
    if (event.links?.[0]) lines.push(`URL:${event.links[0]}`);
    if (frequency(event) !== "none") {
      const weekdays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      let rule = `RRULE:FREQ=${frequency(event).toUpperCase()};INTERVAL=${event.recurrenceInterval ?? 1}`;
      if (frequency(event) === "weekly" && event.recurrenceDays?.length)
        rule += `;BYDAY=${event.recurrenceDays.map((day) => weekdays[day]).join(",")}`;
      if (event.recurrenceUntil) {
        if (event.allDay) rule += `;UNTIL=${date(event.recurrenceUntil)}`;
        else
          rule += `;UNTIL=${new Date(eventInstant(event.recurrenceUntil, "23:59", event.timeZone))
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}/, "")}`;
      }
      lines.push(rule);
    }
    for (const excluded of event.excludedDates ?? [])
      lines.push(
        event.allDay
          ? `EXDATE;VALUE=DATE:${date(excluded)}`
          : `EXDATE${zone}:${date(excluded)}T${time(event.time)}`,
      );
    for (const guest of event.guests ?? []) lines.push(`ATTENDEE:mailto:${guest}`);
    for (const minutes of event.reminders ?? [])
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escape(event.title)}`,
        `TRIGGER:-PT${minutes}M`,
        "END:VALARM",
      );
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
export function importAgenda(
  text: string,
  subjectId: string,
): { events: StudyEvent[]; skipped: number } {
  if (text.length > 2_000_000 || !text.includes("BEGIN:VCALENDAR"))
    throw new Error("Escolha um arquivo .ics de até 2 MB.");
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = [...unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/g)];
  const unsupportedSeries = new Set(
    blocks
      .filter((block) => /^RECURRENCE-ID[;:]/m.test(block[1]!))
      .map((block) => unescape(block[1]!.match(/^UID:(.*)\r?$/m)?.[1]?.trim() ?? "")),
  );
  if (blocks.length > 1000) throw new Error("Importe no máximo 1000 eventos por arquivo.");
  const events: StudyEvent[] = [];
  let skipped = 0;
  for (const block of blocks) {
    const fields = new Map<string, { parameters: string; value: string }[]>();
    let inAlarm = false;
    for (const line of block[1]!.split(/\r?\n/)) {
      if (line === "BEGIN:VALARM") {
        inAlarm = true;
        continue;
      }
      if (line === "END:VALARM") {
        inAlarm = false;
        continue;
      }
      if (inAlarm) continue;
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const [key, ...parameters] = line.slice(0, colon).split(";");
      const entries = fields.get(key!) ?? [];
      entries.push({ parameters: parameters.join(";"), value: line.slice(colon + 1) });
      fields.set(key!, entries);
    }
    const field = (key: string) => fields.get(key)?.[0]?.value ?? "";
    const start = fields.get("DTSTART")?.[0];
    const uid = unescape(field("UID"));
    if (
      !uid ||
      uid === "@olenastudy" ||
      uid.length > (uid.endsWith("@olenastudy") ? 512 : 200) ||
      [...uid].some((character) => character.charCodeAt(0) < 32) ||
      unsupportedSeries.has(uid)
    ) {
      skipped++;
      continue;
    }
    const parse = (value: string) => ({
      date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      time: value.includes("T") ? `${value.slice(9, 11)}:${value.slice(11, 13)}` : "00:00",
    });
    const zone = start?.parameters.match(/TZID=([^;]+)/)?.[1];
    const first = parse(start?.value ?? "");
    const end = parse(field("DTEND") || start?.value || "");
    if (!validDate(first.date) || !validDate(end.date)) {
      skipped++;
      continue;
    }
    const allDay = !start?.value.includes("T");
    const rule: Record<string, string> = Object.fromEntries(
      field("RRULE")
        .split(";")
        .filter(Boolean)
        .map((part) => part.split("=")),
    );
    const freq = rule["FREQ"]?.toLowerCase();
    /* Unsupported recurrence must not silently turn into a one-time event. */
    if (
      field("RECURRENCE-ID") ||
      (freq && !["daily", "weekly", "monthly", "yearly"].includes(freq)) ||
      Object.keys(rule).some((key) => !["FREQ", "INTERVAL", "UNTIL", "BYDAY"].includes(key)) ||
      (rule["BYDAY"] && freq !== "weekly")
    ) {
      skipped++;
      continue;
    }
    const recurrence = freq as StudyEvent["recurrenceFrequency"];
    const event: StudyEvent = {
      id: uid.endsWith("@olenastudy") ? uid.slice(0, -11) : `ics:${uid}`,
      title: unescape(field("SUMMARY")).slice(0, 120) || "Evento importado",
      subjectId,
      date: first.date,
      time: first.time,
      kind: field("X-OLENA-KIND") === "study" ? "study" : "appointment",
      allDay,
      endDate: allDay && field("DTEND") ? addDays(end.date, -1) : end.date,
      endTime: end.time,
      timeZone: start?.value.endsWith("Z")
        ? "UTC"
        : zone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      description: unescape(field("DESCRIPTION")).slice(0, 4000),
      location: unescape(field("LOCATION")).slice(0, 300),
      links: safeWebLink(field("URL")) ? [field("URL")] : [],
      recurrence: recurrence === "weekly" ? "weekly" : "none",
      recurrenceFrequency: recurrence || "none",
      recurrenceInterval: Number(rule["INTERVAL"] || 1),
      recurrenceUntil: rule["UNTIL"] ? parse(rule["UNTIL"]).date : "",
      recurrenceDays:
        rule["BYDAY"]
          ?.split(",")
          .map((day) => ["SU", "MO", "TU", "WE", "TH", "FR", "SA"].indexOf(day)) ?? [],
      excludedDates: (fields.get("EXDATE") ?? []).flatMap((entry) =>
        entry.value.split(",").map((value) => parse(value).date),
      ),
      guests: (fields.get("ATTENDEE") ?? [])
        .map((entry) => entry.value.replace(/^mailto:/i, ""))
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
      reminders: [...block[1]!.matchAll(/TRIGGER:-PT(\d+)M/g)]
        .map((match) => Number(match[1]))
        .filter((minutes) => minutes <= 10080)
        .slice(0, 5),
    };
    if (!field("DTEND") && !allDay) {
      const fallback = eventEnd({ ...event, endDate: "", endTime: "", durationMinutes: 30 });
      event.endDate = fallback.date;
      event.endTime = fallback.time;
    }
    if (rule["UNTIL"]?.endsWith("Z") && event.timeZone && validZone(event.timeZone)) {
      const until = parse(rule["UNTIL"]);
      const instant = Date.parse(
        `${until.date}T${until.time}:${rule["UNTIL"].slice(13, 15) || "00"}Z`,
      );
      if (Number.isFinite(instant))
        event.recurrenceUntil = zonedDateTime(instant, event.timeZone).date;
    }
    if (
      validateCalendarEvent(event) ||
      !Number.isInteger(event.recurrenceInterval) ||
      event.recurrenceInterval! < 1 ||
      event.recurrenceInterval! > 365 ||
      event.recurrenceDays?.some((day) => day < 0)
    ) {
      skipped++;
      continue;
    }
    event.durationMinutes = event.allDay
      ? (Math.round(
          (Date.parse(`${event.endDate}T00:00:00Z`) - Date.parse(`${event.date}T00:00:00Z`)) /
            86400000,
        ) +
          1) *
        1440
      : Math.round(
          (eventInstant(event.endDate!, event.endTime!, event.timeZone) -
            eventInstant(event.date, event.time, event.timeZone)) /
            60000,
        );
    if (event.kind === "study" && event.durationMinutes > 180) {
      skipped++;
      continue;
    }
    event.calendarDurationMinutes = event.durationMinutes;
    event.durationMinutes = Math.min(180, event.durationMinutes);
    events.push(event);
  }
  return { events, skipped };
}
