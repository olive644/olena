import type { WorkspaceState } from "./workspace";
export function focusFlowerState(
  sessions: WorkspaceState["focusSessions"],
  now: number,
  timeZone: string,
  liveMinutes = 0,
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatter.format(new Date(now));
  const timers = sessions.filter(
    (session) =>
      session.mode !== "pomodoro" &&
      Number.isFinite(session.durationMinutes) &&
      session.durationMinutes > 0 &&
      Number.isFinite(Date.parse(session.completedAt)) &&
      Date.parse(session.completedAt) <= now,
  );
  const lastAt = timers.length
    ? Math.max(...timers.map((session) => Date.parse(session.completedAt)))
    : undefined;
  const minutesToday = timers
    .filter((session) => formatter.format(new Date(session.completedAt)) === today)
    .reduce((sum, session) => sum + session.durationMinutes, 0);
  return {
    minutesToday,
    hasHistory: lastAt !== undefined,
    wilted: liveMinutes <= 0 && (lastAt === undefined || now - lastAt >= 86400000),
    progress: Math.min(1, (minutesToday + Math.max(0, liveMinutes)) / 60),
  };
}
