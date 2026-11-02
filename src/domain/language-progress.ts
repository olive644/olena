import type { PracticeActivity } from "./workspace";

export type LanguageAttempt = {
  part: number;
  mode: "practice" | "final";
  questions: number[];
  correctQuestions: number[];
};
export const ENGLISH_PARTS = 6;
export const ENGLISH_BANK = 24;
export const ENGLISH_TARGET = 20;

export function validLanguageAttempt(value: unknown): value is LanguageAttempt {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const indexes = (list: unknown): list is number[] =>
    Array.isArray(list) &&
    list.length > 0 &&
    list.length <= 6 &&
    new Set(list).size === list.length &&
    list.every(
      (id: unknown) => Number.isInteger(id) && Number(id) >= 0 && Number(id) < ENGLISH_BANK,
    );
  const questions = item["questions"];
  return (
    Number.isInteger(item["part"]) &&
    Number(item["part"]) >= 0 &&
    Number(item["part"]) < ENGLISH_PARTS &&
    (item["mode"] === "practice" || item["mode"] === "final") &&
    indexes(questions) &&
    Array.isArray(item["correctQuestions"]) &&
    new Set(item["correctQuestions"]).size === item["correctQuestions"].length &&
    item["correctQuestions"].every((id: unknown) => questions.includes(id as number)) &&
    (item["mode"] !== "final" || questions.length === 5)
  );
}

export function englishProgress(activities: readonly PracticeActivity[] = []) {
  const parts = Array.from({ length: ENGLISH_PARTS }, () => ({
    solved: new Set<number>(),
    correct: 0,
    errors: 0,
    confirmed: false,
    review: 0,
  }));
  const accepted: PracticeActivity[] = [];
  const seen = new Set<string>();
  for (const activity of [...activities].sort(
    (a, b) => a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
  )) {
    const attempt = activity.languageAttempt;
    if (
      activity.islandId !== "languages" ||
      !activity.id ||
      !Number.isFinite(Date.parse(activity.completedAt)) ||
      !validLanguageAttempt(attempt) ||
      seen.has(activity.id) ||
      activity.answers !== attempt.questions.length ||
      activity.correct !== attempt.correctQuestions.length
    )
      continue;
    seen.add(activity.id);
    const part = parts[attempt.part]!;
    if (attempt.part > 0 && !parts[attempt.part - 1]!.confirmed) continue;
    if (attempt.mode === "final" && (part.solved.size < ENGLISH_TARGET || part.review > 0))
      continue;
    accepted.push(activity);
    part.correct += activity.correct;
    part.errors += activity.answers - activity.correct;
    if (attempt.mode === "practice") {
      attempt.correctQuestions.forEach((id) => part.solved.add(id));
      part.review = Math.max(0, part.review - activity.correct);
    } else if (activity.correct >= 4) part.confirmed = true;
    else part.review = 4;
  }
  const percent = Math.floor(
    (parts.reduce((sum, part) => sum + (part.confirmed ? 20 : Math.min(19, part.solved.size)), 0) /
      120) *
      100,
  );
  return { parts, percent, accepted };
}
