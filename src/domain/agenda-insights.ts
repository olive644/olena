import { dateForKey, shiftDate } from "./agenda";
import { type AgendaRange } from "./agenda-history";
import { toDateKey, type PracticeActivity } from "./workspace";

export function pomodoroWeek(value: unknown, range: AgendaRange) {
  const dates = new Set(
    Array.isArray(value)
      ? value.filter(
          (day): day is string =>
            typeof day === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(day) &&
            Number.isFinite(dateForKey(day).getTime()) &&
            toDateKey(dateForKey(day)) === day,
        )
      : [],
  );
  const end = dateForKey(range.end);
  const monday = shiftDate(range.end, -((end.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const key = shiftDate(monday, index);
    return {
      key,
      label: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index],
      active: dates.has(key) && key >= range.start && key <= range.end,
    };
  });
}

export function mathAnswerSequence(activities: PracticeActivity[], range: AgendaRange) {
  const rounds = new Map<string, number>();
  let best = 0;
  for (const activity of [...activities].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  )) {
    const date = new Date(activity.completedAt);
    if (!Number.isFinite(date.getTime())) continue;
    const day = toDateKey(date);
    if (
      day < range.start ||
      day > range.end ||
      activity.answers !== 1 ||
      !activity.islandId.startsWith("mathematics:") ||
      !activity.id.startsWith("math:")
    )
      continue;
    const round = activity.id.slice(0, activity.id.lastIndexOf(":"));
    const sequence = activity.correct === 1 ? (rounds.get(round) ?? 0) + 1 : 0;
    rounds.set(round, sequence);
    best = Math.max(best, sequence);
  }
  return best;
}
