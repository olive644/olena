import {
  ENGLISH_PART_COUNT,
  LEGACY_ENGLISH_PART_COUNT,
  englishPartUnlocked,
} from "./english-part-order.js";
import { englishBankSize } from "./english-difficulty.js";
import { ENGLISH_AREAS, isEnglishArea, type EnglishArea } from "./english-areas.js";
import type { PracticeActivity } from "./workspace";
import { A1_BANK, a1Coverage } from "./english-a1.js";
import { ENGLISH_LEVELS, isEnglishLevel, type EnglishLevel } from "./english-levels.js";
import type { EnglishLedger } from "./english-progress-ledger.js";

export type LanguageAttempt = {
  curriculum?: 2 | 3 | 4 | 5;
  area?: EnglishArea;
  level?: EnglishLevel;
  part: number;
  mode: "practice" | "final";
  questions: number[];
  correctQuestions: number[];
};
export const ENGLISH_PARTS = ENGLISH_PART_COUNT;
export const ENGLISH_TARGET = 100;

export function validLanguageAttempt(value: unknown): value is LanguageAttempt {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const indexes = (list: unknown): list is number[] =>
    Array.isArray(list) &&
    list.length > 0 &&
    list.length <= 6 &&
    new Set(list).size === list.length &&
    list.every(
      (id: unknown) =>
        Number.isInteger(id) &&
        Number(id) >= 0 &&
        Number(id) <
          (item["curriculum"] === 5
            ? A1_BANK
            : item["curriculum"] === 4
              ? englishBankSize(Number(item["part"]))
              : 24),
    );
  const questions = item["questions"];
  return (
    (item["curriculum"] === undefined ||
      item["curriculum"] === 2 ||
      item["curriculum"] === 3 ||
      item["curriculum"] === 4 ||
      item["curriculum"] === 5) &&
    (item["curriculum"] !== 5 || item["part"] === 0) &&
    (item["area"] === undefined || isEnglishArea(item["area"])) &&
    (![3, 4, 5].includes(Number(item["curriculum"])) || isEnglishArea(item["area"])) &&
    (item["level"] === undefined || isEnglishLevel(item["level"])) &&
    Number.isInteger(item["part"]) &&
    Number(item["part"]) >= 0 &&
    Number(item["part"]) <
      (Number(item["curriculum"]) >= 3 ? ENGLISH_PARTS : LEGACY_ENGLISH_PART_COUNT) &&
    (item["mode"] === "practice" || item["mode"] === "final") &&
    indexes(questions) &&
    Array.isArray(item["correctQuestions"]) &&
    new Set(item["correctQuestions"]).size === item["correctQuestions"].length &&
    item["correctQuestions"].every((id: unknown) => questions.includes(id as number)) &&
    (item["mode"] !== "final" || questions.length === 5)
  );
}

export function englishProgress(
  activities: readonly PracticeActivity[] = [],
  area: EnglishArea = "english",
  ledger: EnglishLedger = {},
) {
  // O livro guardado na conta é o ponto de partida: o que já foi resolvido ou confirmado não
  // depende de a lista de atividades ainda existir. As atividades só acrescentam a partir dele.
  const areas = ENGLISH_AREAS.map((name) =>
    Array.from({ length: ENGLISH_PARTS }, (_, index) => ({
      solved: new Set<number>(ledger[name]?.[index]?.solved ?? []),
      correct: 0,
      errors: 0,
      confirmed: ledger[name]?.[index]?.confirmed === true,
      review: 0,
    })),
  );
  const accepted: PracticeActivity[] = [];
  const legacy = ENGLISH_LEVELS.map(() =>
    Array.from({ length: LEGACY_ENGLISH_PART_COUNT }, () => ({
      solved: new Set<number>(),
      correct: 0,
      errors: 0,
      confirmed: false,
      review: 0,
    })),
  );
  const seen = new Set<string>();
  for (const activity of [...activities].sort(
    (a, b) => a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
  )) {
    const attempt = englishAttemptOf(activity);
    if (
      (activity.islandId !== "languages" && activity.islandId !== "english") ||
      !activity.id ||
      !Number.isFinite(Date.parse(activity.completedAt)) ||
      !validLanguageAttempt(attempt) ||
      seen.has(activity.id) ||
      activity.answers !== attempt.questions.length ||
      activity.correct !== attempt.correctQuestions.length
    )
      continue;
    seen.add(activity.id);
    const currentCurriculum =
      attempt.curriculum === 3 || attempt.curriculum === 4 || attempt.curriculum === 5;
    const islandIndex = currentCurriculum
      ? ENGLISH_AREAS.indexOf(attempt.area!)
      : ENGLISH_LEVELS.indexOf(attempt.level ?? "a1");
    const islands = currentCurriculum ? areas : legacy;
    if (islandIndex > 0 && !islands[islandIndex - 1]!.every((part) => part.confirmed)) continue;
    const parts = islands[islandIndex]!;
    const part = parts[attempt.part]!;
    if (!englishPartUnlocked(parts, attempt.part)) continue;
    if (
      attempt.mode === "final" &&
      (part.solved.size <
        (attempt.curriculum === 4 || attempt.curriculum === 5 ? ENGLISH_TARGET : 20) ||
        part.review > 0 ||
        (attempt.curriculum === 5 && !a1Coverage(part.solved).ready))
    )
      continue;
    accepted.push(activity);
    part.correct += activity.correct;
    part.errors += activity.answers - activity.correct;
    if (activity.englishFinalFailure || activity.englishA1FinalFailure) part.review = 4;
    else if (attempt.mode === "practice") {
      attempt.correctQuestions.forEach((id) => part.solved.add(id));
      part.review = Math.max(0, part.review - activity.correct);
    } else if (activity.correct >= 4) part.confirmed = true;
    else part.review = 4;
  }
  const selected = ENGLISH_AREAS.indexOf(area);
  const parts = areas[selected]!;
  const percent = Math.floor(
    (parts.reduce(
      (sum, part) =>
        sum + (part.confirmed ? ENGLISH_TARGET : Math.min(ENGLISH_TARGET - 1, part.solved.size)),
      0,
    ) /
      (ENGLISH_TARGET * ENGLISH_PARTS)) *
      100,
  );
  return {
    overall: Math.floor(
      (areas
        .flat()
        .reduce(
          (sum, part) =>
            sum +
            (part.confirmed ? ENGLISH_TARGET : Math.min(ENGLISH_TARGET - 1, part.solved.size)),
          0,
        ) /
        (ENGLISH_TARGET * ENGLISH_PARTS)) *
        100,
    ),
    parts,
    percent,
    accepted,
    areas,
    legacy: legacy.flat().some((part) => part.correct + part.errors > 0),
    unlocked: selected === 0 || areas[selected - 1]!.every((part) => part.confirmed),
  };
}

export function englishAttemptOf(activity: PracticeActivity) {
  return activity.englishA1Attempt ?? activity.englishAttempt ?? activity.languageAttempt;
}
