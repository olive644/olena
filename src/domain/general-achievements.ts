import type { WorkspaceState } from "./workspace";
import { zonedDateTime } from "./agenda-calendar.js";
import { shiftDate } from "./agenda.js";
import { GENERAL_ACHIEVEMENTS, type GeneralMetric } from "./general-achievement-catalog.js";
export * from "./general-achievement-catalog.js";

export function generalAchievements(
  workspace: WorkspaceState,
  social?: { following: number; followers: number },
  zone = "America/Sao_Paulo",
  now = new Date(),
) {
  const validDate = (date: string) =>
    Number.isFinite(Date.parse(date)) && Date.parse(date) <= now.getTime();
  const unique = <T extends { id: string }>(items: readonly T[]) => [
    ...new Map(items.map((item) => [item.id, item])).values(),
  ];
  const focus = unique(workspace.focusSessions)
    .filter(
      (item) =>
        Number.isFinite(item.durationMinutes) &&
        item.durationMinutes > 0 &&
        item.durationMinutes <= 1440 &&
        validDate(item.completedAt),
    )
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt));
  const notebooks = unique(workspace.notebooks).filter(
    (item) =>
      item.kind !== "folder" &&
      (!Number.isFinite(Date.parse(item.createdAt)) || validDate(item.createdAt)),
  );
  const pages = unique(workspace.notes).filter(
    (item) =>
      (item.content.trim() || item.assets.length) &&
      (!Number.isFinite(Date.parse(item.updatedAt)) || validDate(item.updatedAt)),
  );
  const quizzes = unique(workspace.quizAttempts).filter(
    (item) =>
      item.total > 0 &&
      item.correct >= 0 &&
      item.correct <= item.total &&
      validDate(item.completedAt),
  );
  const practice = unique(workspace.practiceActivities ?? []).filter(
    (item) => item.answers > 0 && validDate(item.completedAt),
  );
  const dated = [...focus, ...quizzes, ...practice].sort(
    (a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt),
  );
  const counters = Object.fromEntries(
    GENERAL_ACHIEVEMENTS.map(({ metric }) => [metric, 0]),
  ) as Record<GeneralMetric, number>;
  const dates = new Map<string, string>();
  const credit = (metric: GeneralMetric, amount: number, at?: string) => {
    counters[metric] = amount;
    if (at && validDate(at))
      for (const item of GENERAL_ACHIEVEMENTS) {
        if (item.metric === metric && amount >= item.target && !dates.has(item.id))
          dates.set(item.id, at);
      }
  };
  const subjects = new Set<string>();
  let pomodoro = 0,
    timer = 0;
  for (const [index, session] of focus.entries()) {
    if (session.mode === "pomodoro") pomodoro += session.durationMinutes;
    else timer += session.durationMinutes;
    credit("pomodoro", pomodoro, session.completedAt);
    credit("timer", timer, session.completedAt);
    credit("sessions", index + 1, session.completedAt);
    if (session.subjectId) subjects.add(session.subjectId);
    credit("subjects", subjects.size >= 3 ? 1 : 0, session.completedAt);
    credit("balanced", pomodoro > 0 && timer > 0 ? 1 : 0, session.completedAt);
  }
  const days = new Set<string>();
  let last = "",
    run = 0,
    longest = 0;
  for (const item of dated) {
    const day = zonedDateTime(Date.parse(item.completedAt), zone).date;
    if (days.has(day)) continue;
    days.add(day);
    run = last && shiftDate(last, 1) === day ? run + 1 : 1;
    last = day;
    longest = Math.max(longest, run);
    credit("streak", longest, item.completedAt);
    credit("studyDays", days.size, item.completedAt);
  }
  for (const [metric, records] of [
    ["notebooks", notebooks.map((item) => item.createdAt)],
    ["pages", pages.map((item) => item.updatedAt)],
  ] as const) {
    const sorted = records.filter(validDate).sort((a, b) => Date.parse(a) - Date.parse(b));
    sorted.forEach((at, index) => credit(metric, index + 1, at));
    credit(metric, records.length);
  }
  let correct = 0;
  [...quizzes]
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))
    .forEach((item, index) => {
      credit("quizzes", index + 1, item.completedAt);
      credit("quizCorrect", (correct += item.correct), item.completedAt);
      if (item.total >= 10 && item.correct === item.total) credit("perfect", 1, item.completedAt);
    });
  credit("tasks", workspace.tasks.filter((item) => item.completed).length);
  credit("following", Math.max(0, social?.following ?? 0));
  credit("followers", Math.max(0, social?.followers ?? 0));
  credit("flashcards", workspace.flashcards.length >= 5 ? 1 : 0);
  const appointment = workspace.events
    .flatMap((item) => item.completedDates ?? [])
    .filter(
      (day) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= zonedDateTime(now.getTime(), zone).date,
    );
  credit("agenda", appointment.length ? 1 : 0);
  const filled = new Set(pages.map((item) => item.id));
  credit(
    "author",
    notebooks.some((item) => new Set(item.pageIds.filter((id) => filled.has(id))).size >= 3)
      ? 1
      : 0,
  );
  credit("collection", notebooks.length && pages.length && workspace.materials.length ? 1 : 0);
  credit("explorer", focus.length && pages.length && quizzes.length ? 1 : 0);
  return GENERAL_ACHIEVEMENTS.map((item) => ({
    ...item,
    value: Math.min(item.target, counters[item.metric]),
    earned: counters[item.metric] >= item.target,
    earnedAt: dates.get(item.id),
  }));
}
