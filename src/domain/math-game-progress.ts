import { MATH_COURSES, type MathCourseId, type MathProgress } from "../data/math-courses.js";

export const MATH_GAME_KEY = "helena.mathGame.v3";
export const QUESTIONS_PER_STAGE = 24;
export const STAGE_TARGET = 20;
export const QUESTION_MASK = (1 << QUESTIONS_PER_STAGE) - 1;
export type MathGameProgress = MathProgress & {
  mastered: number;
  solved: number[];
  seen: number[];
};
export function countSolved(mask: number): number {
  let count = 0;
  for (let bits = mask; bits; bits &= bits - 1) count++;
  return count;
}
export function gameCompletion(solved: readonly number[]) {
  const mastered = solved.reduce(
    (mask, answers, level) => mask | (countSolved(answers) >= STAGE_TARGET ? 1 << level : 0),
    0,
  );
  const level =
    Array.from({ length: 6 }, (_, index) => index).find(
      (index) => (mastered & (1 << index)) === 0,
    ) ?? 5;
  const percent = Math.floor(
    (solved.reduce((total, mask) => total + Math.min(STAGE_TARGET, countSolved(mask)), 0) /
      (STAGE_TARGET * 6)) *
      100,
  );
  return { mastered, level, percent };
}
export function emptyMathGame(history?: MathProgress): MathGameProgress {
  return {
    level: 0,
    mastery: 0,
    correct: history?.correct ?? 0,
    best: history?.best ?? 0,
    mastered: 0,
    solved: Array<number>(6).fill(0),
    seen: Array<number>(6).fill(0),
  };
}
export function validMathGame(value: unknown): value is MathGameProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (
    Object.keys(item).some(
      (key) =>
        !["level", "mastery", "correct", "best", "errors", "mastered", "solved", "seen"].includes(
          key,
        ),
    )
  )
    return false;
  for (const field of ["solved", "seen"]) {
    const masks = item[field];
    if (
      !Array.isArray(masks) ||
      masks.length !== 6 ||
      masks.some((mask) => !Number.isSafeInteger(mask) || mask < 0 || mask > QUESTION_MASK)
    )
      return false;
  }
  const solved = item["solved"] as number[];
  const seen = item["seen"] as number[];
  const completion = gameCompletion(solved);
  return (
    item["level"] === completion.level &&
    item["mastered"] === completion.mastered &&
    item["mastery"] === Math.min(5, countSolved(solved[completion.level]!)) &&
    ["correct", "best"].every(
      (key) =>
        Number.isSafeInteger(item[key]) &&
        Number(item[key]) >= 0 &&
        Number(item[key]) <= (key === "best" ? 1000000 : 100000),
    ) &&
    (item["errors"] === undefined ||
      (Number.isSafeInteger(item["errors"]) &&
        Number(item["errors"]) >= 0 &&
        Number(item["errors"]) <= 2)) &&
    solved.every((mask, index) => (mask & seen[index]!) === mask) &&
    solved.every((mask, index) => index <= completion.level || mask === 0)
  );
}
export function unlockedMathCourse(
  course: MathCourseId,
  progress: Partial<Record<MathCourseId, MathGameProgress>>,
): boolean {
  const index = MATH_COURSES.findIndex((item) => item.id === course);
  return MATH_COURSES.slice(0, index).every(
    (item) => gameCompletion(progress[item.id]?.solved ?? []).percent === 100,
  );
}
export function mergeMathGame(left: MathGameProgress, right: MathGameProgress): MathGameProgress {
  const solved = left.solved.map((mask, index) => mask | right.solved[index]!);
  const seen = left.seen.map((mask, index) => mask | right.seen[index]!);
  const completion = gameCompletion(solved);
  return {
    ...left,
    level: completion.level,
    mastered: completion.mastered,
    mastery: Math.min(5, countSolved(solved[completion.level]!)),
    solved,
    seen,
    correct: Math.max(left.correct, right.correct),
    best: Math.max(left.best, right.best),
  };
}
export function parseMathGame(raw: string | null): Partial<Record<MathCourseId, MathGameProgress>> {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([id, progress]) =>
          MATH_COURSES.some((course) => course.id === id) && validMathGame(progress),
      ),
    );
  } catch {
    return {};
  }
}
