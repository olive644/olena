import { ENGLISH_BANK } from "./language-progress.js";

export type EnglishEvidence = { id: number; correct: boolean };
export type EnglishSelection = { solved: number[]; recent: EnglishEvidence[]; exclude: number[] };
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
    ids(item["solved"]) &&
    ids(item["exclude"]) &&
    item["exclude"].length <= 6 &&
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
  const difficulty = !recent.length
    ? 0
    : last && !last.correct
      ? Math.max(0, (last.id % 4) - 1)
      : Math.min(3, Math.floor(success / 2));
  const excluded = new Set(input.exclude);
  const solved = new Set(input.solved);
  const failedScene = last && !last.correct ? Math.floor(last.id / 4) : undefined;
  const candidates = Array.from({ length: ENGLISH_BANK }, (_, id) => id).filter(
    (id) => !excluded.has(id),
  );
  candidates.sort((a, b) => {
    const score = (id: number) =>
      Number(solved.has(id)) * 10000 +
      Math.abs((id % 4) - difficulty) * 100 +
      (failedScene !== undefined ? Math.abs(Math.floor(id / 4) - failedScene) : Math.floor(id / 4));
    return score(a) - score(b) || a - b;
  });
  return { id: candidates[0] ?? 0, difficulty, recovery: Boolean(last && !last.correct) };
}
