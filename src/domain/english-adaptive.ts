import { ENGLISH_PART_COUNT } from "./english-part-order.js";
import { englishContext, englishSkill } from "./english-skills.js";
import { englishBankSize, englishDifficulty } from "./english-difficulty.js";
import { A1_BANK, A1_UNIT_TARGET, a1Unit, a1Difficulty } from "./english-a1.js";

export type EnglishEvidence = { id: number; correct: boolean };
export type EnglishSelection = {
  curriculum?: 4 | 5;
  part?: number;
  solved: number[];
  recent: EnglishEvidence[];
  exclude: number[];
};
export function validEnglishSelection(value: unknown): value is EnglishSelection {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const bank =
    item["curriculum"] === 5 && item["part"] === 0
      ? A1_BANK
      : englishBankSize(Number(item["part"] ?? 0));
  const id = (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < bank;
  const ids = (list: unknown): list is number[] =>
    Array.isArray(list) &&
    list.length <= bank &&
    new Set(list).size === list.length &&
    list.every(id);
  return (
    (item["curriculum"] === undefined ||
      item["curriculum"] === 4 ||
      (item["curriculum"] === 5 && item["part"] === 0)) &&
    (item["part"] === undefined ||
      (Number.isInteger(item["part"]) &&
        Number(item["part"]) >= 0 &&
        Number(item["part"]) < ENGLISH_PART_COUNT)) &&
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
  if (input.curriculum === 5 && part === 0) {
    const solved = new Set(input.solved),
      excluded = new Set(input.exclude);
    const counts = Array.from(
      { length: 6 },
      (_, unit) => input.solved.filter((id) => a1Unit(id) === unit).length,
    );
    const unit = counts.findIndex((count) => count < A1_UNIT_TARGET);
    const selectedUnit = unit < 0 ? counts.indexOf(Math.min(...counts)) : unit;
    const wrong = last && !last.correct ? last : undefined;
    const targetUnit = wrong ? a1Unit(wrong.id) : selectedUnit;
    const difficulty = Math.min(3, Math.floor(counts[targetUnit]! / 4));
    const candidates = Array.from({ length: A1_BANK }, (_, id) => id).filter(
      (id) => !excluded.has(id),
    );
    if (
      !wrong &&
      recent.length === 6 &&
      recent.every((entry) => entry.correct) &&
      input.exclude.length % 6 === 0
    ) {
      const review = candidates.filter(
        (id) => solved.has(id) && !recent.some((entry) => entry.id === id),
      );
      const id = review[Math.floor(input.exclude.length / 6) % Math.max(1, review.length)];
      if (id !== undefined) return { id, difficulty: a1Difficulty(id), recovery: false };
    }
    const score = (id: number) =>
      Number(a1Unit(id) !== targetUnit) * 100000 +
      Number(
        input.recent.some((entry) =>
          id < 120 && entry.id < 120
            ? Math.floor(id / 4) === Math.floor(entry.id / 4)
            : id === entry.id,
        ),
      ) *
        20000 +
      Number(solved.has(id)) * (wrong ? 100 : 10000) +
      Math.abs(a1Difficulty(id) - (wrong ? Math.max(0, a1Difficulty(wrong.id) - 1) : difficulty)) *
        1000 +
      Number(id < 120) * 500 +
      Math.abs((id % 4) - (wrong ? 0 : Math.min(3, Math.floor(success / 2)))) * 10;
    candidates.sort((a, b) => score(a) - score(b) || a - b);
    return { id: candidates[0] ?? 120, difficulty, recovery: Boolean(wrong) };
  }
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
  let candidates = Array.from({ length: englishBankSize(part) }, (_, id) => id).filter(
    (id) => !excluded.has(id),
  );
  // Variety must not force advanced grammar after an error or at the start.
  const accessible = candidates.filter((id) => englishDifficulty(part, id) <= difficulty + 1);
  if (accessible.length) candidates = accessible;
  const seenContexts = new Set(
    [...input.exclude, ...input.recent.map(({ id }) => id)].map((id) =>
      englishContext(part, Math.floor(id / 4)),
    ),
  );
  const variesContexts = true;
  const reviewDue =
    recent.length === 6 && recent.every((entry) => entry.correct) && input.exclude.length % 6 === 0;
  if (reviewDue) {
    const recentContexts = new Set(
      recent.map(({ id }) => englishContext(part, Math.floor(id / 4))),
    );
    const reviewCandidates = candidates.filter(
      (id) =>
        solved.has(id) &&
        !recentContexts.has(englishContext(part, Math.floor(id / 4))) &&
        englishDifficulty(part, id) <= difficulty,
    );
    if (reviewCandidates.length) candidates = reviewCandidates;
  }
  const recoverySkill =
    variesContexts && failedScene !== undefined ? englishSkill(part, failedScene) : -1;
  const failedContext = failedScene === undefined ? undefined : englishContext(part, failedScene);
  candidates.sort((a, b) => {
    const score = (id: number) => {
      const scene = Math.floor(id / 4);
      const variety = variesContexts
        ? Number(englishContext(part, scene) === failedContext) * 1000000 +
          Number(recoverySkill >= 0 && englishSkill(part, scene) !== recoverySkill) * 100000 +
          Number(seenContexts.has(englishContext(part, scene))) * 20000
        : 0;
      return (
        variety +
        Number(reviewDue && !solved.has(id)) * 12000 +
        Number(solved.has(id)) * (last && !last.correct ? 200 : 10000) +
        Math.abs(englishDifficulty(part, id) - difficulty) * 1000 +
        Math.abs((id % 4) - format) * 100 +
        (failedScene !== undefined
          ? Math.abs(Math.floor(id / 4) - failedScene)
          : Math.floor(id / 4))
      );
    };
    return score(a) - score(b) || a - b;
  });
  return { id: candidates[0] ?? 0, difficulty, recovery: Boolean(last && !last.correct) };
}
