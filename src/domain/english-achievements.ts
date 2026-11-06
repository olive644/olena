import type { PracticeActivity } from "./workspace.js";
import { englishProgress, englishAttemptOf } from "./language-progress.js";
import { zonedDateTime } from "./agenda-calendar.js";
import {
  ENGLISH_ACHIEVEMENTS,
  type EnglishAchievementMetric,
} from "./english-achievement-catalog.js";

export function englishAchievements(
  activities: readonly PracticeActivity[] = [],
  zone = "America/Sao_Paulo",
  now = new Date(),
) {
  const records = englishProgress(
    activities.filter((record) => Date.parse(record.completedAt) <= now.getTime()),
  ).accepted;
  const counters: Record<EnglishAchievementMetric, number> = {
    rounds: 0,
    correct: 0,
    days: 0,
    parts: 0,
    perfect: 0,
    variety: 0,
  };
  const dates = new Map<string, string>();
  const days = new Set<string>(),
    parts = new Set<number>(),
    tasks = new Set<string>();
  const rounds = new Map<string, { answers: number; correct: number; complete: boolean }>();
  for (const record of records) {
    const attempt = englishAttemptOf(record)!;
    const root = record.id.match(/^(english:arcade:[^:]+):\d+(?::completed)?$/)?.[1] ?? record.id;
    const round = rounds.get(root) ?? { answers: 0, correct: 0, complete: false };
    const wasPerfect = round.complete && round.answers >= 5 && round.answers === round.correct;
    round.answers += record.answers;
    round.correct += record.correct;
    round.complete ||= record.id.endsWith(":completed") || attempt.mode === "final";
    rounds.set(root, round);
    counters.perfect +=
      Number(round.complete && round.answers >= 5 && round.answers === round.correct) -
      Number(wasPerfect);
    counters.rounds = rounds.size;
    counters.correct += record.correct;
    days.add(zonedDateTime(Date.parse(record.completedAt), zone).date);
    counters.days = days.size;
    // Legacy levels do not claim confirmation of the current eight locations.
    if (Number(attempt.curriculum) >= 3 && attempt.mode === "final" && record.correct >= 4)
      parts.add(attempt.part);
    counters.parts = parts.size;
    for (const id of attempt.correctQuestions)
      tasks.add(
        `${Number(attempt.curriculum) >= 3 ? "current" : (attempt.level ?? "a1")}:${attempt.part}:${id}`,
      );
    counters.variety = tasks.size;
    for (const goal of ENGLISH_ACHIEVEMENTS)
      if (
        (goal.part !== undefined ? Number(parts.has(goal.part)) : counters[goal.metric]) >=
          goal.target &&
        !dates.has(goal.id)
      )
        dates.set(goal.id, record.completedAt);
  }
  return ENGLISH_ACHIEVEMENTS.map((goal) => ({
    ...goal,
    value: Math.min(
      goal.target,
      goal.part !== undefined ? Number(parts.has(goal.part)) : counters[goal.metric],
    ),
    earned: dates.has(goal.id),
    earnedAt: dates.get(goal.id),
  }));
}
