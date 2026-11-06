import { expect, it } from "vitest";
import { englishPartUnlocked, ENGLISH_PART_ORDER } from "./english-part-order";
import { englishProgress, validLanguageAttempt } from "./language-progress";
import { createInitialWorkspace, type PracticeActivity } from "./workspace";
import { isWorkspaceState } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";
import { validEnglishCheckpoint } from "./english-checkpoint";

it("preserves historical unlocks and inserts the two new IDs in learning order", () => {
  expect(ENGLISH_PART_ORDER).toEqual([0, 1, 2, 3, 6, 4, 7, 5]);
  const parts = Array.from({ length: 8 }, (_, id) => ({ confirmed: id < 6 }));
  expect(englishPartUnlocked(parts, 4)).toBe(true);
  expect(englishPartUnlocked(parts, 5)).toBe(true);
  expect(englishPartUnlocked(parts, 6)).toBe(true);
  expect(englishPartUnlocked(parts, 7)).toBe(true);
  expect(
    englishPartUnlocked(
      Array.from({ length: 8 }, () => ({ confirmed: false })),
      6,
    ),
  ).toBe(false);
});

it("retains new progress through serialization and additive workspace merge", () => {
  const records: PracticeActivity[] = [];
  for (const part of [0, 1, 2, 3, 4, 5, 6, 7]) {
    for (let id = 0; id < 100; id++) {
      records.push({
        id: "eight:" + part + ":" + id,
        islandId: "english",
        islandName: "English",
        completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
        answers: 1,
        correct: 1,
        englishAttempt: {
          curriculum: 4,
          area: "english",
          part,
          mode: "practice",
          questions: [id],
          correctQuestions: [id],
        },
      });
    }
    records.push({
      id: "eight:" + part + ":final",
      moduleLevel: part,
      islandId: "english",
      islandName: "English",
      completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
      answers: 5,
      correct: 5,
      englishAttempt: {
        curriculum: 4,
        area: "english",
        part,
        mode: "final",
        questions: [0, 1, 2, 3, 4],
        correctQuestions: [0, 1, 2, 3, 4],
      },
    });
  }
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = records;
  const restored: unknown = JSON.parse(JSON.stringify(workspace));
  expect(isWorkspaceState(restored)).toBe(true);
  if (!isWorkspaceState(restored)) throw Error("Invalid workspace");
  const merged = mergeWorkspaceStates(
    createInitialWorkspace(),
    restored,
    createInitialWorkspace(),
  ).workspace;
  expect(englishProgress(merged.practiceActivities).percent).toBe(100);
  expect(englishProgress(merged.practiceActivities).parts.every((part) => part.confirmed)).toBe(
    true,
  );
  for (const part of [6, 7]) {
    expect(
      validLanguageAttempt({
        curriculum: 4,
        area: "english",
        part,
        mode: "practice",
        questions: [99],
        correctQuestions: [99],
      }),
    ).toBe(true);
    expect(
      validEnglishCheckpoint({ owner: null, part, mode: "practice", question: 99, updatedAt: 1 }),
    ).toBe(true);
    expect(
      validEnglishCheckpoint({ owner: null, part, mode: "practice", question: 100, updatedAt: 1 }),
    ).toBe(false);
  }
});
