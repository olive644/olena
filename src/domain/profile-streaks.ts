import { shiftDate } from "./agenda";
import { focusFlowerState } from "./focus-flower";
import type { WorkspaceState } from "./workspace";
export function currentDailyStreak(days: string[], today: string): number {
  const dates = new Set(days.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today));
  let cursor = dates.has(today) ? today : shiftDate(today, -1),
    count = 0;
  while (dates.has(cursor)) {
    count++;
    cursor = shiftDate(cursor, -1);
  }
  return count;
}
export function mathematicsStreak(workspace: WorkspaceState, now: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const records = (workspace.practiceActivities ?? []).filter(
    (item) =>
      /^(math|mathematics)(:|$)/.test(item.islandId) &&
      item.answers > 0 &&
      Number.isFinite(Date.parse(item.completedAt)) &&
      Date.parse(item.completedAt) <= now.getTime(),
  );
  if (
    !records.length ||
    now.getTime() - Math.max(...records.map((item) => Date.parse(item.completedAt))) >= 86400000
  )
    return 0;
  return currentDailyStreak(
    records.map((item) => formatter.format(new Date(item.completedAt))),
    formatter.format(now),
  );
}
export function profileStreaks(
  workspace: WorkspaceState,
  pomodoro: unknown,
  now: Date,
  timeZone: string,
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = (value: string) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? formatter.format(date) : "";
  };
  const today = formatter.format(now);
  const timerDays = workspace.focusSessions
    .filter((session) => session.durationMinutes > 0 && session.mode !== "pomodoro")
    .map((session) => day(session.completedAt));
  const pomodoroDays = workspace.focusSessions
    .filter((session) => session.durationMinutes > 0 && session.mode === "pomodoro")
    .map((session) => day(session.completedAt));
  if (Array.isArray(pomodoro))
    pomodoroDays.push(...pomodoro.filter((value): value is string => typeof value === "string"));
  return {
    timer: focusFlowerState(workspace.focusSessions, now.getTime(), timeZone).wilted
      ? 0
      : currentDailyStreak(timerDays, today),
    pomodoro: currentDailyStreak(pomodoroDays, today),
    islands: mathematicsStreak(workspace, now, timeZone),
  };
}
