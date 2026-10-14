import { expect, it } from "vitest";
import { MATH_COURSES } from "../data/math-courses";
import { bankQuestion } from "../data/math-game-bank";
import { assessGame, gameQuestion, requestMathGame } from "./math-game";
import {
  countSolved,
  emptyMathGame,
  gameCompletion,
  mergeMathGame,
  unlockedMathCourse,
  validMathGame,
  MATH_GAME_KEY,
} from "./math-game-progress";
import { mergeSyncedItems } from "../data/sync-conflict";
import { mathGameLearning, saveMathGame } from "../data/math-game-learning";
import { handleOlena } from "../backend/olena-handler";

it.each(MATH_COURSES)("has 24 distinct fixed challenges per stage in $id", ({ id }) => {
  for (let level = 0; level < 6; level++) {
    const entries = Array.from({ length: 24 }, (_, index) => bankQuestion(id, level, index));
    expect(new Set(entries.map((item) => item.expression)).size).toBe(24);
    expect(new Set(entries.map((item) => item.seed)).size).toBe(24);
    for (const entry of entries) {
      expect(entry.expression.length).toBeLessThanOrEqual(180);
      expect(Number.isFinite(entry.answer)).toBe(true);
      expect(new Set(entry.choices).size).toBe(4);
      expect(entry.choices).toContain(entry.answer);
      expect(entry.budget).toBeGreaterThanOrEqual(28);
      expect(bankQuestion(id, level, entry.seed - level * 24 - 1)).toEqual(entry);
    }
  }
});
it("requires 20 unique correct challenges per stage and all six stages for the next place", () => {
  let progress = emptyMathGame();
  for (let level = 0; level < 6; level++) {
    for (let index = 0; index < 20; index++) {
      const question = gameQuestion("foundations", progress);
      const result = assessGame("foundations", progress, question, question.answer, 20, 0);
      progress = result.progress;
      expect(validMathGame(progress)).toBe(true);
      expect(result.milestone !== null).toBe(index === 19);
      expect(unlockedMathCourse("school", { foundations: progress })).toBe(
        level === 5 && index === 19,
      );
    }
  }
  expect(gameCompletion(progress.solved)).toEqual({ level: 5, mastered: 63, percent: 100 });
  expect(unlockedMathCourse("advanced", { foundations: progress })).toBe(false);
});
it("six answers, repeated successes and two errors cannot skip a stage", () => {
  let progress = emptyMathGame();
  for (let index = 0; index < 6; index++) {
    const question = gameQuestion("foundations", progress);
    progress = assessGame("foundations", progress, question, question.answer, 1, 0).progress;
  }
  const repeat = bankQuestion("foundations", 0, 0);
  const repeated = assessGame("foundations", progress, repeat, repeat.answer, 1, 0);
  expect(repeated.milestone).toBeNull();
  expect(repeated.progress.solved).toEqual(progress.solved);
  expect(gameCompletion(progress.solved).percent).toBe(5);
  for (let index = 0; index < 2; index++) {
    const question = gameQuestion("foundations", progress);
    progress = assessGame("foundations", progress, question, question.answer + 1, 1, 0).progress;
  }
  expect(countSolved(progress.solved[0]!)).toBe(6);
  expect(progress.level).toBe(0);
  expect(validMathGame(progress)).toBe(true);
});
it("interleaves formats, retries missed challenges and rejects altered requests", async () => {
  let progress = emptyMathGame();
  const seen = new Set<number>();
  for (let index = 0; index < 24; index++) {
    const question = gameQuestion("foundations", progress);
    expect(seen.has(question.seed)).toBe(false);
    seen.add(question.seed);
    if (index < 4) expect(Math.floor((question.seed - 1) / 6)).toBe(index);
    progress = assessGame("foundations", progress, question, question.answer + 1, 1, 0).progress;
  }
  expect(gameQuestion("foundations", progress).seed).toBe(1);
  const question = gameQuestion("foundations", progress);
  await expect(
    requestMathGame(
      {
        course: "foundations",
        progress,
        action: "answer",
        question: { ...question, answer: 999 },
        choice: question.answer,
        elapsed: 1,
        streak: 0,
      },
      new AbortController().signal,
    ),
  ).rejects.toThrow("Resposta inválida");
  expect(validMathGame({ ...progress, level: 5 })).toBe(false);
  expect(validMathGame({ ...progress, seen: [] })).toBe(false);
});
it("merges successes from two devices by identity, without summing repeated answers", () => {
  const initial = emptyMathGame();
  const a = assessGame(
    "foundations",
    initial,
    bankQuestion("foundations", 0, 0),
    bankQuestion("foundations", 0, 0).answer,
    1,
    0,
  ).progress;
  const b = assessGame(
    "foundations",
    initial,
    bankQuestion("foundations", 0, 6),
    bankQuestion("foundations", 0, 6).answer,
    1,
    0,
  ).progress;
  const merged = mergeMathGame(a, b);
  expect(countSolved(merged.solved[0]!)).toBe(2);
  expect(validMathGame(merged)).toBe(true);
  expect(mergeMathGame(merged, a)).toEqual(merged);
  expect(mergeMathGame(b, a)).toEqual(merged);
  const items = mergeSyncedItems(
    {},
    { [MATH_GAME_KEY]: JSON.stringify({ foundations: a }) },
    { [MATH_GAME_KEY]: JSON.stringify({ foundations: b }) },
  ).items;
  expect(JSON.parse(items[MATH_GAME_KEY]!).foundations).toEqual(merged);
  expect(mergeSyncedItems(items, items, {}).items[MATH_GAME_KEY]).toBe(items[MATH_GAME_KEY]);
});
it("preserves legacy records but does not grant new completion from the old six-answer rule", () => {
  localStorage.clear();
  const history = JSON.stringify({
    foundations: { level: 5, mastery: 5, mastered: 63, correct: 100, best: 850 },
  });
  localStorage.setItem("helena.mathLearning.v2", history);
  const progress = mathGameLearning("foundations");
  expect(progress.correct).toBe(100);
  expect(progress.best).toBe(850);
  expect(gameCompletion(progress.solved).percent).toBe(0);
  expect(unlockedMathCourse("school", {})).toBe(false);
  const question = gameQuestion("foundations", progress);
  expect(
    saveMathGame(
      "foundations",
      assessGame("foundations", progress, question, question.answer, 1, 0).progress,
    ),
  ).toBe(true);
  expect(mathGameLearning("foundations").solved[0]).toBe(1);
  expect(localStorage.getItem("helena.mathLearning.v2")).toBe(history);
  localStorage.clear();
});
it("serves the same v3 question and assessment through the API", async () => {
  const progress = emptyMathGame();
  const question = gameQuestion("foundations", progress);
  const input = {
    course: "foundations" as const,
    action: "answer" as const,
    progress,
    question,
    choice: question.answer,
    elapsed: 1,
    streak: 0,
  };
  const response = await handleOlena(
    new Request("http://localhost/api/olena?action=math&version=3", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Olena-API-Version")).toBe("3");
  expect(await response.json()).toEqual(await requestMathGame(input, new AbortController().signal));
});
it("records the historical exercise locator and its authorial adaptation", () => {
  expect(bankQuestion("calculus1", 2, 0)).toMatchObject({
    answer: 13,
    revision: 1,
    id: "calculus1:2:0",
    source: expect.stringContaining("Thompson"),
  });
  expect(bankQuestion("calculus1", 2, 1).answer).toBe(-1.5);
  expect(bankQuestion("calculus1", 2, 2).answer).toBe(2.4);
  expect(bankQuestion("foundations", 0, 0).source).toContain("Autoral");
});
it("checks reference answers independently for every format and stage", () => {
  const references = {
    foundations: [
      [15, 9, 11, 14],
      [12, 10, 6, 7],
      [20, 14, 6, 30],
      [5, 2, 4, 2],
      [6, 12, 10, 10],
      [10, 32, 25, 26],
    ],
    school: [
      [4, 4, 4, 5],
      [8, 16, 16, 2],
      [8, 3, 18, 2],
      [14, 8, 2, 11],
      [17, 16, 10, 22],
      [25, 50, 60, 80],
    ],
    advanced: [
      [3, 0, 4, 3],
      [2, 2, 4, 2],
      [2, -2, 4, 5],
      [12, 5, 10, 0],
      [10, 9, 6, 9],
      [6, 4, 2, -2],
    ],
    calculus1: [
      [3, 4, 2, 2],
      [2, 4, 0, 12],
      [13, -2, 24, 0],
      [6, 1, 8, 10],
      [4, 6, -4, 2],
      [2, 4, 2, -2],
    ],
    calculus2: [
      [11, 6, 10, 3],
      [8, 4, 8, -4],
      [4, 6, 4, 8],
      [6, 12, 1, 6],
      [8, 72, 10, 5],
      [8, 8, 6, 3],
    ],
    calculus3: [
      [6, -4, 2, 7],
      [4, 6, 4, 12],
      [4, 2, 2, 8],
      [9, 0, 3, 12],
      [7, 8, 0, 1],
      [4, 4, 4, 12],
    ],
  };
  for (const { id } of MATH_COURSES)
    for (let level = 0; level < 6; level++)
      for (let format = 0; format < 4; format++)
        expect(bankQuestion(id, level, format * 6).answer).toBe(references[id][level]![format]);
});
it("varies replay questions without inflating completed percentages", () => {
  const solved = Array<number>(6).fill(16777215);
  let progress = {
    ...emptyMathGame(),
    level: 5,
    mastered: 63,
    solved,
    seen: solved,
    mastery: 5,
    correct: 144,
  };
  const ids = new Set<number>();
  for (let index = 0; index < 24; index++) {
    const question = gameQuestion("foundations", progress);
    ids.add(question.seed);
    const result = assessGame("foundations", progress, question, question.answer, 1, 0);
    progress = result.progress;
    expect(result.milestone).toBeNull();
    expect(gameCompletion(progress.solved).percent).toBe(100);
  }
  expect(ids.size).toBe(24);
});
