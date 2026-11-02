import { beforeEach, expect, it } from "vitest";
import { englishProgress, validLanguageAttempt, type LanguageAttempt } from "./language-progress";
import { createInitialWorkspace, workspaceReducer, type PracticeActivity } from "./workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";
import { englishQuestion, ENGLISH_JOURNEY, normalizeEnglish } from "../data/english-journey";
import {
  finishMathPlace,
  mathPlaceRewards,
  MATH_PLACE_REWARDS_KEY,
  ENGLISH_REWARDS_KEY,
  openMathChest,
  revealMathCard,
  oliverCollection,
} from "../data/math-place-rewards";
import { mergeMathRewards } from "../data/math-rewards-sync";
import { mergeSyncedItems } from "../data/sync-conflict";

let sequence = 0;
function attempt(
  part: number,
  questions: number[],
  correct = questions,
  mode: LanguageAttempt["mode"] = "practice",
): PracticeActivity {
  sequence++;
  return {
    id: `attempt-${sequence}`,
    islandId: "languages",
    islandName: "English",
    answers: questions.length,
    correct: correct.length,
    completedAt: new Date(1700000000000 + sequence * 1000).toISOString(),
    languageAttempt: { part, questions, correctQuestions: correct, mode },
  };
}
beforeEach(() => {
  sequence = 0;
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
  localStorage.removeItem(ENGLISH_REWARDS_KEY);
});
it("has 144 answerable original tasks in four formats without duplicate choices", () => {
  expect(ENGLISH_JOURNEY).toHaveLength(6);
  for (let part = 0; part < 6; part++)
    for (let id = 0; id < 24; id++) {
      const question = englishQuestion(part, id);
      expect(question.answer).toBeTruthy();
      expect(new Set(question.options).size).toBe(3);
      expect(question.options).toContain(question.answer);
      expect(question.phrase).not.toContain("____");
    }
  expect(normalizeEnglish(" I’d like a coffee, please. ")).toBe("i'd like a coffee please");
});
it("keeps later parts locked, deduplicates mastery and requires the final", () => {
  const records = [
    attempt(1, [0]),
    ...Array.from({ length: 4 }, (_, index) =>
      attempt(
        0,
        Array.from({ length: 6 }, (_, id) => id + index * 6),
      ),
    ),
  ];
  records.push(records[1]!);
  const before = englishProgress(records);
  expect(before.parts[0]!.solved.size).toBe(24);
  expect(before.parts[0]!.correct).toBe(24);
  expect(before.parts[1]!.solved.size).toBe(0);
  expect(before.percent).toBe(15);
  records.push(attempt(0, [0, 1, 2, 3, 4], [0, 1, 2, 3], "final"));
  records.push(attempt(1, [0, 1]));
  expect(englishProgress(records).parts[1]!.solved.size).toBe(2);
});
it("failed confirmation requires four correct reviews, errors never advance mastery", () => {
  const records = Array.from({ length: 4 }, (_, index) =>
    attempt(
      0,
      Array.from({ length: 6 }, (_, id) => id + index * 6),
    ),
  );
  records.push(attempt(0, [0, 1, 2, 3, 4], [0, 1, 2], "final"));
  records.push(attempt(0, [5, 6, 7, 8, 9], [5, 6, 7, 8, 9], "final"));
  expect(englishProgress(records).parts[0]!.confirmed).toBe(false);
  records.push(attempt(0, [0, 1, 2, 3, 4, 5], [0, 1, 2, 3]));
  expect(englishProgress(records).parts[0]!.review).toBe(0);
  records.push(attempt(0, [5, 6, 7, 8, 9], [5, 6, 7, 8], "final"));
  expect(englishProgress(records).parts[0]!.confirmed).toBe(true);
});
it("reaches 100 percent only after all six confirmations", () => {
  const records: PracticeActivity[] = [];
  for (let part = 0; part < 6; part++) {
    for (let group = 0; group < 4; group++)
      records.push(
        attempt(
          part,
          Array.from({ length: 6 }, (_, id) => id + group * 6),
        ),
      );
    records.push(attempt(part, [0, 5, 10, 15, 20], [0, 5, 10, 15], "final"));
  }
  expect(englishProgress(records).percent).toBe(100);
});
it("rejects malformed attempts and keeps account workspace merge additive", () => {
  expect(
    validLanguageAttempt({ part: 0, mode: "practice", questions: [0, 0], correctQuestions: [0] }),
  ).toBe(false);
  expect(
    validLanguageAttempt({ part: 0, mode: "practice", questions: [0], correctQuestions: [1] }),
  ).toBe(false);
  const base = createInitialWorkspace();
  const one = attempt(0, [0, 1]),
    two = attempt(0, [2, 3]);
  const left = workspaceReducer(base, { type: "practice/recorded", activity: one });
  const right = workspaceReducer(base, { type: "practice/recorded", activity: two });
  const merged = mergeWorkspaceStates(base, left, right);
  expect(englishProgress(merged.workspace.practiceActivities).parts[0]!.solved.size).toBe(4);
  expect(
    workspaceReducer(base, { type: "practice/recorded", activity: { ...one, correct: 0 } }),
  ).toBe(base);
});
it("shares Arcana cards and chest rules while isolating math points and reconciling receipts", () => {
  finishMathPlace("foundations", "math", 50);
  finishMathPlace("english-a1", "english", 120, () => 0.5);
  const raw = localStorage.getItem(ENGLISH_REWARDS_KEY)!;
  finishMathPlace("english-a1", "english", 120);
  expect(mathPlaceRewards("english-a1").points).toBe(120);
  expect(mathPlaceRewards("foundations").points).toBe(50);
  expect(mergeMathRewards(undefined, raw, raw).conflict).toBe(false);
  openMathChest("english-a1", "english", Date.now() + 11000, () => 0);
  revealMathCard("english-a1", "english");
  expect(oliverCollection()["major-00"]).toBe(1);
});

it("keeps English rewards when an old math client replaces only its own ledger", () => {
  finishMathPlace("english-a1", "english", 120, () => 0.5);
  const english = localStorage.getItem(ENGLISH_REWARDS_KEY);
  localStorage.setItem(
    MATH_PLACE_REWARDS_KEY,
    JSON.stringify({ foundations: { points: 40, receipts: ["old"], chests: [] } }),
  );
  expect(localStorage.getItem(ENGLISH_REWARDS_KEY)).toBe(english);
  expect(mathPlaceRewards("english-a1").points).toBe(120);
  expect(mathPlaceRewards("foundations").points).toBe(40);
});

it("merges English round receipts from different devices without duplicating rewards", () => {
  finishMathPlace("english-a1", "left", 60);
  const left = localStorage.getItem(ENGLISH_REWARDS_KEY)!;
  localStorage.removeItem(ENGLISH_REWARDS_KEY);
  finishMathPlace("english-a1", "right", 80);
  const right = localStorage.getItem(ENGLISH_REWARDS_KEY)!;
  const result = mergeSyncedItems(
    {},
    { [ENGLISH_REWARDS_KEY]: left },
    { [ENGLISH_REWARDS_KEY]: right },
  );
  expect(result.conflicts).toEqual([]);
  expect(JSON.parse(result.items[ENGLISH_REWARDS_KEY]!)["english-a1"].points).toBe(140);
});
