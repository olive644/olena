import { ENGLISH_BANK } from "./language-progress.js";
import { englishDifficulty } from "./english-difficulty.js";

export type EnglishEvidence = { id: number; correct: boolean };
export type EnglishSelection = {
  part?: number;
  solved: number[];
  recent: EnglishEvidence[];
  exclude: number[];
};
export function validEnglishSelection(value: unknown): value is EnglishSelection {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const id = (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < ENGLISH_BANK;
  const ids = (list: unknown): list is number[] =>
    Array.isArray(list) &&
    list.length <= ENGLISH_BANK &&
    new Set(list).size === list.length &&
    list.every(id);
  return (
    (item["part"] === undefined ||
      (Number.isInteger(item["part"]) && Number(item["part"]) >= 0 && Number(item["part"]) < 6)) &&
    ids(item["solved"]) &&
    ids(item["exclude"]) &&
    Array.isArray(item["recent"]) &&
    item["recent"].length <= 24 &&
    item["recent"].every((entry: unknown) => {
      if (!entry || typeof entry !== "object") return false;
      const e = entry as Record<string, unknown>;
      return id(e["id"]) && typeof e["correct"] === "boolean";
    })
  );
}

/** Deterministic teaching support, not a prediction of a certified language level. */
export function nextEnglishQuestion(input: EnglishSelection) {
  const recent = input.recent.slice(-6);
  const success = recent.filter((entry) => entry.correct).length;
  const last = recent.at(-1);
  const part = input.part ?? 0;
  let difficulty = 0;
  while (
    difficulty < 5 &&
    input.solved.filter((id) => englishDifficulty(part, id) === difficulty).length >= 6
  )
    difficulty++;
  if (last) {
    const previous = englishDifficulty(part, last.id);
    if (
      recent.length === 6 &&
      recent.every((entry) => entry.correct && englishDifficulty(part, entry.id) === previous)
    )
      difficulty = Math.max(difficulty, Math.min(5, previous + 1));
    if (!last.correct)
      difficulty = Math.max(
        0,
        previous - Number(recent.length >= 2 && recent.slice(-2).every((entry) => !entry.correct)),
      );
  }
  const format =
    last && !last.correct ? Math.max(0, (last.id % 4) - 1) : Math.min(3, Math.floor(success / 2));
  const excluded = new Set(input.exclude);
  const solved = new Set(input.solved);
  const failedScene = last && !last.correct ? Math.floor(last.id / 4) : undefined;
  const candidates = Array.from({ length: ENGLISH_BANK }, (_, id) => id).filter(
    (id) => !excluded.has(id),
  );
  candidates.sort((a, b) => {
    const score = (id: number) =>
      Number(solved.has(id)) * (last && !last.correct ? 200 : 10000) +
      Math.abs(englishDifficulty(part, id) - difficulty) * 1000 +
      Math.abs((id % 4) - format) * 100 +
      (failedScene !== undefined ? Math.abs(Math.floor(id / 4) - failedScene) : Math.floor(id / 4));
    return score(a) - score(b) || a - b;
  });
  return { id: candidates[0] ?? 0, difficulty, recovery: Boolean(last && !last.correct) };
}
