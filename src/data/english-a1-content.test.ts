import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { validA1Content } from "./english-a1-content";
import { englishQuestion, validEnglishCourse, normalizeEnglish } from "./english-journey";
import { a1Coverage, a1Unit, a1Difficulty } from "../domain/english-a1";
import { nextEnglishQuestion, validEnglishSelection } from "../domain/english-adaptive";
import { englishProgress, validLanguageAttempt } from "../domain/language-progress";
import {
  createInitialWorkspace,
  workspaceReducer,
  type PracticeActivity,
} from "../domain/workspace";
import { isWorkspaceState } from "./local-workspace";
import { mergeWorkspaceStates } from "../domain/workspace-sync-merge";
import { settleEnglishRewards } from "./english-rewards";
import { mathPlaceRewards } from "./math-place-rewards";
const raw: unknown = JSON.parse(readFileSync("public/languages/en/english-a1-v1.json", "utf8"));
const legacy: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
if (!validA1Content(raw) || !validEnglishCourse(legacy)) throw Error("Invalid curriculum");
const course = { ...legacy, a1: raw };
function record(id: number, mode: "practice" | "final" = "practice", ids = [id]): PracticeActivity {
  return {
    id: `a1:${mode}:${id}`,
    islandId: "english",
    islandName: "English",
    answers: ids.length,
    correct: ids.length,
    completedAt: new Date(
      1700000000000 + id * 1000 + (mode === "final" ? 1000000 : 0),
    ).toISOString(),
    englishA1Attempt: {
      curriculum: 5,
      area: "english",
      part: 0,
      mode,
      questions: ids,
      correctQuestions: ids,
    },
  };
}
beforeEach(() => localStorage.clear());
it("adds 120 distinct situations, six topics, twelve bilingual guides and authored distractors", () => {
  expect(raw.units).toHaveLength(6);
  expect(raw.tasks).toHaveLength(120);
  expect(new Set(raw.tasks.map((q) => normalizeEnglish(q.phrase))).size).toBe(120);
  expect(new Set(raw.tasks.map((q) => q.explanation["pt-BR"])).size).toBe(120);
  raw.tasks.forEach((q) => {
    expect(a1Unit(q.id)).toBe(q.unit);
    expect(a1Difficulty(q.id)).toBe(q.level);
    const question = englishQuestion(course, 0, q.id);
    expect(question.answer).toBe(q.answer["pt-BR"]);
    expect(question.explanation).toBe(q.explanation["pt-BR"]);
    if (q.kind !== "order") {
      expect(new Set(question.options).size).toBe(3);
      expect(question.options).toContain(question.answer);
    }
    if (q.kind === "gap") {
      expect([...q.phrase.matchAll(new RegExp(`\\b${question.answer}\\b`, "g"))]).toHaveLength(1);
    }
  });
  for (let id = 0; id < 120; id++)
    expect(englishQuestion(course, 0, id)).toEqual(englishQuestion(legacy, 0, id));
  for (let part = 0; part < 6; part++)
    for (let id = 0; id < 120; id++)
      expect(englishQuestion(course, part, id)).toEqual(englishQuestion(legacy, part, id));
});
it("rejects malformed content rather than delivering arbitrary answers", () => {
  expect(validA1Content({ ...raw, tasks: raw.tasks.slice(1) })).toBe(false);
  expect(
    validA1Content({ ...raw, tasks: raw.tasks.map((t, i) => (i ? t : { ...t, id: 0 })) }),
  ).toBe(false);
  expect(
    validA1Content({
      ...raw,
      tasks: raw.tasks.map((t, i) => (i ? t : { ...t, options: [t.answer, t.answer, t.answer] })),
    }),
  ).toBe(false);
});
it("requires coverage of all topics, schedules gaps and supports the expanded API bounds", () => {
  const concentrated = Array.from({ length: 100 }, (_, i) => i);
  expect(a1Coverage(concentrated).ready).toBe(false);
  const solved = Array.from({ length: 6 }, (_, u) =>
    Array.from({ length: 17 }, (_, i) => 120 + u * 20 + i),
  ).flat();
  expect(a1Coverage(solved).ready).toBe(true);
  expect(
    nextEnglishQuestion({ curriculum: 5, part: 0, solved: [], recent: [], exclude: [] }).id,
  ).toBe(120);
  const first = Array.from({ length: 12 }, (_, i) => i + 120);
  expect(
    a1Unit(
      nextEnglishQuestion({ curriculum: 5, part: 0, solved: first, recent: [], exclude: [] }).id,
    ),
  ).toBe(1);
  expect(
    validEnglishSelection({ curriculum: 5, part: 0, solved: [239], recent: [], exclude: [] }),
  ).toBe(true);
  expect(
    validEnglishSelection({ curriculum: 5, part: 1, solved: [239], recent: [], exclude: [] }),
  ).toBe(false);
  expect(validEnglishSelection({ part: 0, solved: [239], recent: [], exclude: [] })).toBe(false);
  expect(
    validEnglishSelection({ curriculum: 5, part: 0, solved: [240], recent: [], exclude: [] }),
  ).toBe(false);
});
it("preserves additive A1 evidence and gates its final without rewriting earlier progress", () => {
  const ids = Array.from({ length: 6 }, (_, u) =>
    Array.from({ length: 17 }, (_, i) => 120 + u * 20 + i),
  ).flat();
  const records = ids.map((id) => record(id));
  const final = record(239, "final", [136, 156, 176, 196, 216]);
  expect(validLanguageAttempt(records[0]!.englishA1Attempt)).toBe(true);
  expect(validLanguageAttempt({ ...records[0]!.englishA1Attempt, curriculum: 4 })).toBe(false);
  expect(englishProgress([...records, final]).parts[0]!.confirmed).toBe(true);
  expect(englishProgress([...records.slice(0, 70), final]).parts[0]!.confirmed).toBe(false);
  const concentrated = Array.from({ length: 100 }, (_, id) => record(id));
  expect(englishProgress([...concentrated, final]).parts[0]!.confirmed).toBe(false);
  const base = createInitialWorkspace(),
    saved = workspaceReducer(base, { type: "practice/recorded", activity: records[0]! });
  expect(isWorkspaceState(JSON.parse(JSON.stringify(saved)))).toBe(true);
  const merged = mergeWorkspaceStates(base, saved, base).workspace;
  expect(merged.practiceActivities).toEqual([records[0]]);
  expect(merged.practiceActivities![0]!.englishAttempt).toBeUndefined();
  const failed = {
    ...record(239, "practice", [120, 121, 122]),
    correct: 0,
    englishA1FinalFailure: true,
    englishA1Attempt: {
      ...records[0]!.englishA1Attempt!,
      questions: [120, 121, 122],
      correctQuestions: [],
    },
  };
  expect(englishProgress([...records, failed]).parts[0]!.review).toBe(4);
  expect(isWorkspaceState({ ...base, practiceActivities: [failed] })).toBe(true);
});
it("keeps reward receipts idempotent for curriculum five", () => {
  const records = Array.from({ length: 8 }, (_, at) => ({
    ...record(at + 120),
    id: `english:arcade:a1:${at}${at === 7 ? ":completed" : ""}`,
    correct: at < 5 ? 1 : 0,
    englishA1Attempt: {
      ...record(at + 120).englishA1Attempt!,
      correctQuestions: at < 5 ? [at + 120] : [],
    },
  }));
  settleEnglishRewards(records, () => 0.5);
  settleEnglishRewards(records, () => 0.5);
  expect(mathPlaceRewards("english-english").points).toBe(100);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(1);
  expect(mathPlaceRewards("foundations").points).toBe(0);
});
