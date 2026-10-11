import { shiftDate } from "./agenda";
import { toDateKey, type FocusSession } from "./workspace";

export type AgendaRange = { start: string; end: string };
export function orderedRange(first: string, last: string): AgendaRange {
  return first <= last ? { start: first, end: last } : { start: last, end: first };
}

export function focusHistory(sessions: FocusSession[]) {
  const days = new Map<string, { minutes: number; sessions: FocusSession[] }>();
  for (const session of sessions) {
    const completed = new Date(session.completedAt);
    if (
      !Number.isFinite(completed.getTime()) ||
      !Number.isFinite(session.durationMinutes) ||
      session.durationMinutes <= 0
    )
      continue;
    const key = toDateKey(completed);
    const day = days.get(key) ?? { minutes: 0, sessions: [] };
    day.minutes += session.durationMinutes;
    day.sessions.push(session);
    days.set(key, day);
  }
  for (const day of days.values())
    day.sessions.sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );
  return days;
}

export function historySummary(history: ReturnType<typeof focusHistory>, range: AgendaRange) {
  const dates = [...history.keys()]
    .filter((date) => date >= range.start && date <= range.end)
    .sort();
  let minutes = 0;
  let longest = 0;
  let streak = 0;
  let previous = "";
  for (const date of dates) {
    minutes += history.get(date)!.minutes;
    streak = previous && shiftDate(previous, 1) === date ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = date;
  }
  return { minutes, days: dates.length, longest };
}
