import { readFileSync } from "node:fs";
import { ENGLISH_AREAS } from "./english-areas";
import { beforeEach, expect, it } from "vitest";
import { englishProgress, validLanguageAttempt, type LanguageAttempt } from "./language-progress";
import { createInitialWorkspace, workspaceReducer, type PracticeActivity } from "./workspace";
import { isWorkspaceState } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";
import { englishQuestion, validEnglishCourse, normalizeEnglish } from "../data/english-journey";
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
    languageAttempt: {
      curriculum: 3,
      area: "english",
      part,
      questions,
      correctQuestions: correct,
      mode,
    },
  };
}
beforeEach(() => {
  sequence = 0;
  localStorage.removeItem(MATH_PLACE_REWARDS_KEY);
  localStorage.removeItem(ENGLISH_REWARDS_KEY);
});
it("has 720 answerable original tasks in four formats without duplicate choices", () => {
  const raw: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
  if (!validEnglishCourse(raw)) throw new Error("Invalid English content");
  for (let part = 0; part < 6; part++)
    for (let id = 0; id < 120; id++) {
      const question = englishQuestion(raw, part, id);
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
  expect(before.percent).toBe(4);
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

it("validates one English island, six parts and all 720 tasks", () => {
  for (const level of ENGLISH_AREAS) {
    const course: unknown = JSON.parse(
      readFileSync(`public/languages/en/${level}-v4.json`, "utf8"),
    );
    expect(validEnglishCourse(course), level).toBe(true);
    if (!validEnglishCourse(course)) continue;
    for (let part = 0; part < 6; part++)
      for (let id = 0; id < 120; id++) {
        const question = englishQuestion(course, part, id);
        expect(new Set(question.options).size, `${level}:${part}:${id}`).toBe(3);
        expect(question.options).toContain(question.answer);
      }
  }
});

it("uses the same six-part completion formula as mathematics", () => {
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
    expect(englishProgress(records).percent).toBe(Math.floor(((part + 1) * 100) / 6));
  }
  expect(englishProgress(records).overall).toBe(100);
});

it("retains preview history without treating changed curriculum IDs as new mastery", () => {
  const old = attempt(0, [0, 1, 2]);
  delete old.languageAttempt!.curriculum;
  const progress = englishProgress([old]);
  expect(progress.legacy).toBe(true);
  expect(progress.accepted).toEqual([old]);
  expect(progress.percent).toBe(0);
  expect(validLanguageAttempt({ ...old.languageAttempt, level: "z9" })).toBe(false);
});

it("preserves each English level ledger and shares its Arcana collection", () => {
  finishMathPlace("english-a1", "introductions", 40);
  finishMathPlace("english-a2", "present", 120, () => 0.5);
  finishMathPlace("english-c2", "meaning", 60);
  expect(mathPlaceRewards("english-a1").points).toBe(40);
  expect(mathPlaceRewards("english-a2").points).toBe(120);
  expect(mathPlaceRewards("english-c2").points).toBe(60);
  openMathChest("english-a2", "present", Date.now() + 11000, () => 0);
  revealMathCard("english-a2", "present");
  expect(oliverCollection()["major-00"]).toBe(1);
});

it("credits old correct answers without inflating the expanded curriculum and preserves confirmed parts", () => {
  const records = [attempt(0, [0, 1, 2, 3])];
  expect(englishProgress(records).parts[0]!.solved.size).toBe(4);
  const expanded = attempt(0, [24, 25, 26, 27]);
  expanded.islandId = "english";
  expanded.englishAttempt = { ...expanded.languageAttempt!, curriculum: 4 };
  delete expanded.languageAttempt;
  expect(validLanguageAttempt(expanded.englishAttempt)).toBe(true);
  const progress = englishProgress([...records, expanded]);
  expect(progress.parts[0]!.solved.size).toBe(8);
  expect(progress.percent).toBe(1);
  expect(validLanguageAttempt({ ...expanded.englishAttempt, curriculum: 3 })).toBe(false);
});
it("requires 100 distinct answers for new finals, reserves the last percent and never counts errors", () => {
  const records: PracticeActivity[] = [];
  for (let id = 0; id < 100; id++) {
    const entry = attempt(0, [id]);
    entry.islandId = "english";
    entry.englishAttempt = { ...entry.languageAttempt!, curriculum: 4 };
    delete entry.languageAttempt;
    records.push(entry);
  }
  const final = attempt(0, [0, 1, 2, 3, 4], [0, 1, 2, 3], "final");
  final.islandId = "english";
  final.englishAttempt = { ...final.languageAttempt!, curriculum: 4 };
  delete final.languageAttempt;
  expect(englishProgress(records.slice(0, 4)).parts[0]!.solved.size).toBe(4);
  expect(englishProgress([...records.slice(0, 99), final]).parts[0]!.confirmed).toBe(false);
  expect(englishProgress([...records, final]).parts[0]!.confirmed).toBe(true);
});

it("merges expanded evidence additively without putting unsupported IDs in the legacy field", () => {
  const base = createInitialWorkspace();
  const entry = attempt(0, [108], [108]);
  entry.islandId = "english";
  entry.englishAttempt = { ...entry.languageAttempt!, curriculum: 4 };
  delete entry.languageAttempt;
  const saved = workspaceReducer(base, { type: "practice/recorded", activity: entry });
  expect(saved.practiceActivities).toEqual([entry]);
  expect(isWorkspaceState(JSON.parse(JSON.stringify(saved)))).toBe(true);
  const merged = mergeWorkspaceStates(base, saved, { ...base, practiceActivities: [] }).workspace;
  expect(merged.practiceActivities).toEqual([entry]);
  expect(merged.practiceActivities![0]!.languageAttempt).toBeUndefined();
  expect(englishProgress(merged.practiceActivities).parts[0]!.solved.has(108)).toBe(true);
  const invalid = {
    ...entry,
    englishAttempt: { ...entry.englishAttempt, correctQuestions: [109] },
  };
  expect(workspaceReducer(base, { type: "practice/recorded", activity: invalid })).toBe(base);
});

it("records a failed new final after three actual mistakes without inventing unanswered questions", () => {
  const records: PracticeActivity[] = [];
  for (let id = 0; id < 100; id++) {
    const entry = attempt(0, [id]);
    entry.islandId = "english";
    entry.englishAttempt = { ...entry.languageAttempt!, curriculum: 4 };
    delete entry.languageAttempt;
    records.push(entry);
  }
  const failed = attempt(0, [0, 1, 2], [], "practice");
  failed.englishFinalFailure = true;
  failed.islandId = "english";
  failed.englishAttempt = { ...failed.languageAttempt!, curriculum: 4 };
  delete failed.languageAttempt;
  expect(validLanguageAttempt(failed.englishAttempt)).toBe(true);
  const progress = englishProgress([...records, failed]);
  expect(progress.parts[0]!.review).toBe(4);
  expect(progress.parts[0]!.errors).toBe(3);
  expect(progress.parts[0]!.confirmed).toBe(false);
  // Keep the old five-question final contract readable by deployed clients.
  expect(validLanguageAttempt({ ...failed.englishAttempt, mode: "final" })).toBe(false);
  const base = createInitialWorkspace();
  const saved = workspaceReducer(base, { type: "practice/recorded", activity: failed });
  expect(saved.practiceActivities).toEqual([failed]);
  expect(isWorkspaceState(JSON.parse(JSON.stringify(saved)))).toBe(true);
  const merged = mergeWorkspaceStates(base, saved, base).workspace;
  expect(merged.practiceActivities![0]!.englishFinalFailure).toBe(true);
  const invalid = {
    ...failed,
    correct: 1,
    englishAttempt: { ...failed.englishAttempt!, correctQuestions: [0] },
  };
  expect(workspaceReducer(base, { type: "practice/recorded", activity: invalid })).toBe(base);
  expect(isWorkspaceState({ ...base, practiceActivities: [invalid] })).toBe(false);
});

it("keeps 23 mastered A1 questions after reload and additive account merge", () => {
  const base = createInitialWorkspace();
  const entries = Array.from({ length: 23 }, (_, id) => {
    const entry = attempt(0, [id]);
    entry.islandId = "english";
    entry.englishA1Attempt = { ...entry.languageAttempt!, curriculum: 5 };
    delete entry.languageAttempt;
    return entry;
  });
  const local = entries.reduce(
    (state, activity) => workspaceReducer(state, { type: "practice/recorded", activity }),
    base,
  );
  expect(englishProgress(local.practiceActivities).parts[0]!.solved.size).toBe(23);
  const loaded: unknown = JSON.parse(JSON.stringify(local));
  expect(isWorkspaceState(loaded)).toBe(true);
  const remote = workspaceReducer(base, { type: "practice/recorded", activity: entries[0]! });
  const merged = mergeWorkspaceStates(base, local, remote).workspace;
  expect(englishProgress(merged.practiceActivities).parts[0]!.solved.size).toBe(23);
  expect(englishProgress(merged.practiceActivities).parts[0]!.correct).toBe(23);
  expect(englishProgress(merged.practiceActivities).parts[0]!.confirmed).toBe(false);
});
