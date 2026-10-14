import { MATH_COURSES, isMathCourse, type MathCourseId } from "../data/math-courses.js";
import {
  countSolved,
  QUESTION_MASK,
  emptyMathGame,
  type MathGameProgress,
} from "./math-game-progress.js";

export const CHALLENGE_KEY = "helena.mathGame.v4";
export type ChallengeProgress = MathGameProgress & {
  extraSolved: number[];
  extraSeen: number[];
  attempts: number;
  recent: number[];
  retry: { seed: number; due: number }[];
};
export function challengeCompletion(
  progress: Pick<ChallengeProgress, "solved" | "extraSolved"> &
    Partial<Pick<ChallengeProgress, "mastered">>,
) {
  const counts = progress.solved.map((mask, level) => {
    const extra = progress.extraSolved[level]!;
    const total = countSolved(mask) + countSolved(extra);
    const formats = Array.from(
      { length: 8 },
      (_, format) => (((format < 4 ? mask : extra) >>> ((format % 4) * 6)) & 63) !== 0,
    );
    let hard = 0;
    for (let index = 0; index < 48; index++)
      if (index % 6 >= 4 && ((index < 24 ? mask : extra) & (1 << (index % 24))) !== 0) hard++;
    // Conquistas publicadas e as 20 entradas v3 continuam reconhecidas.
    // Novas etapas mistas precisam de amplitude e quatro variantes difíceis.
    const previous = ((progress.mastered ?? 0) & (1 << level)) !== 0 || countSolved(mask) >= 20;
    return Math.min(previous || (formats.every(Boolean) && hard >= 4) ? 20 : 19, total);
  });
  const mastered = counts.reduce((bits, count, level) => bits | (count >= 20 ? 1 << level : 0), 0);
  return {
    mastered,
    level:
      counts.findIndex((count) => count < 20) === -1 ? 5 : counts.findIndex((count) => count < 20),
    percent: Math.floor((counts.reduce((a, b) => a + b, 0) / 120) * 100),
    counts,
  };
}
export function upgradeChallengeProgress(old = emptyMathGame()): ChallengeProgress {
  return {
    ...old,
    extraSolved: Array<number>(6).fill(0),
    extraSeen: Array<number>(6).fill(0),
    attempts: 0,
    recent: [],
    retry: [],
  };
}
export function hasChallenge(progress: ChallengeProgress, seed: number, solved = false) {
  const level = Math.floor((seed - 1) / 48),
    index = (seed - 1) % 48;
  const masks = solved
    ? index < 24
      ? progress.solved
      : progress.extraSolved
    : index < 24
      ? progress.seen
      : progress.extraSeen;
  return (masks[level]! & (1 << (index % 24))) !== 0;
}
export function normalizeChallenge(progress: ChallengeProgress): ChallengeProgress {
  const completion = challengeCompletion(progress);
  return {
    ...progress,
    level: completion.level,
    mastered: completion.mastered,
    mastery: Math.min(5, completion.counts[completion.level]!),
    retry: progress.retry.filter(
      (item) =>
        Math.floor((item.seed - 1) / 48) === completion.level &&
        !hasChallenge(progress, item.seed, true),
    ),
  };
}
export function validChallengeProgress(value: unknown): value is ChallengeProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  if (
    Object.keys(p).some(
      (key) =>
        ![
          "level",
          "mastery",
          "correct",
          "best",
          "errors",
          "mastered",
          "solved",
          "seen",
          "extraSolved",
          "extraSeen",
          "attempts",
          "recent",
          "retry",
        ].includes(key),
    )
  )
    return false;
  for (const key of ["solved", "seen", "extraSolved", "extraSeen"])
    if (
      !Array.isArray(p[key]) ||
      p[key].length !== 6 ||
      p[key].some(
        (mask: unknown) =>
          !Number.isSafeInteger(mask) || Number(mask) < 0 || Number(mask) > QUESTION_MASK,
      )
    )
      return false;
  if (
    !["correct", "best", "attempts"].every(
      (key) =>
        Number.isSafeInteger(p[key]) &&
        Number(p[key]) >= 0 &&
        Number(p[key]) <= (key === "best" ? 1000000 : 100000),
    )
  )
    return false;
  const validSeed = (seed: unknown) =>
    Number.isSafeInteger(seed) && Number(seed) >= 1 && Number(seed) <= 288;
  if (
    !Array.isArray(p["recent"]) ||
    p["recent"].length > 4 ||
    !p["recent"].every(validSeed) ||
    !Array.isArray(p["retry"]) ||
    p["retry"].length > 48 ||
    !p["retry"].every(
      (item: unknown) =>
        !!item &&
        typeof item === "object" &&
        Object.keys(item).length === 2 &&
        "seed" in item &&
        validSeed(item.seed) &&
        "due" in item &&
        Number.isSafeInteger(item.due) &&
        Number(item.due) >= 0 &&
        Number(item.due) <= 100004,
    )
  )
    return false;
  if (
    p["errors"] !== undefined &&
    (!Number.isSafeInteger(p["errors"]) || Number(p["errors"]) < 0 || Number(p["errors"]) > 2)
  )
    return false;
  const progress = value as ChallengeProgress,
    c = challengeCompletion(progress);
  return (
    p["level"] === c.level &&
    p["mastered"] === c.mastered &&
    p["mastery"] === Math.min(5, c.counts[c.level]!) &&
    progress.solved.every(
      (mask, l) => (mask & progress.seen[l]!) === mask && (l <= c.level || mask === 0),
    ) &&
    progress.extraSolved.every(
      (mask, l) => (mask & progress.extraSeen[l]!) === mask && (l <= c.level || mask === 0),
    ) &&
    new Set(progress.retry.map((item) => item.seed)).size === progress.retry.length &&
    progress.retry.every(
      (item) =>
        Math.floor((item.seed - 1) / 48) === c.level &&
        hasChallenge(progress, item.seed) &&
        !hasChallenge(progress, item.seed, true),
    )
  );
}
export function mergeChallengeProgress(
  a: ChallengeProgress,
  b: ChallengeProgress,
): ChallengeProgress {
  const latest =
    a.attempts > b.attempts
      ? a
      : b.attempts > a.attempts
        ? b
        : JSON.stringify(a.recent) <= JSON.stringify(b.recent)
          ? a
          : b;
  const retry = [...a.retry, ...b.retry]
    .sort((x, y) => x.seed - y.seed || y.due - x.due)
    .filter((item, index, list) => index === 0 || item.seed !== list[index - 1]!.seed);
  return normalizeChallenge({
    ...latest,
    mastered: a.mastered | b.mastered,
    solved: a.solved.map((v, l) => v | b.solved[l]!),
    seen: a.seen.map((v, l) => v | b.seen[l]!),
    extraSolved: a.extraSolved.map((v, l) => v | b.extraSolved[l]!),
    extraSeen: a.extraSeen.map((v, l) => v | b.extraSeen[l]!),
    correct: Math.max(a.correct, b.correct),
    best: Math.max(a.best, b.best),
    retry,
  });
}
export function parseChallengeProgress(
  raw: string | null,
): Partial<Record<MathCourseId, ChallengeProgress>> {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(([id, p]) => isMathCourse(id) && validChallengeProgress(p)),
    );
  } catch {
    return {};
  }
}
export function unlockedChallengeCourse(
  course: MathCourseId,
  progress: Partial<Record<MathCourseId, ChallengeProgress>>,
) {
  return MATH_COURSES.slice(
    0,
    MATH_COURSES.findIndex((item) => item.id === course),
  ).every((item) => progress[item.id] && challengeCompletion(progress[item.id]!).percent === 100);
}
