import { expect, it } from "vitest";
import { MATH_COURSES } from "../data/math-courses";
import { challengeQuestion } from "../data/math-challenge-bank";
import { assessChallenge, nextChallenge } from "./math-challenge-engine";
import {
  upgradeChallengeProgress,
  challengeCompletion,
  validChallengeProgress,
  mergeChallengeProgress,
} from "./math-challenge-progress";
import { emptyMathGame } from "./math-game-progress";
import { requestChallenge } from "./math-challenge-engine";
import { CHALLENGE_KEY } from "./math-challenge-progress";
import { readMathGame, saveMathGame } from "../data/math-game-learning";
import { mergeSyncedItems } from "../data/sync-conflict";
import { handleOlena } from "../backend/olena-handler";

it.each(MATH_COURSES)(
  "diversifies every stage in $id, with plausible distinct choices",
  ({ id }) => {
    for (let level = 0; level < 6; level++) {
      const questions = Array.from({ length: 48 }, (_, index) =>
        challengeQuestion(id, level, index),
      );
      expect(new Set(questions.map((q) => q.id)).size).toBe(48);
      expect(
        new Set(questions.map((q) => q.expression)).size,
        `level ${level}: ${questions
          .filter((q, i) => questions.findIndex((other) => other.expression === q.expression) !== i)
          .map((q) => q.id + " " + q.expression)
          .join("; ")}`,
      ).toBe(48);
      expect(new Set(questions.map((q) => q.format)).size).toBe(8);
      for (const q of questions) {
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.answer);
        expect(q.choices.every(Number.isFinite)).toBe(true);
        expect(q.expression.length).toBeLessThanOrEqual(180);
        expect(q.review.length).toBeGreaterThan(8);
        expect(q.budget).toBeGreaterThanOrEqual(28);
        expect(q.difficulty).toBeGreaterThanOrEqual(1);
        expect(new Set(q.choices.map((value) => value.toFixed(2))).size).toBe(4);
      }
    }
  },
);
it("mixes all eight formats and delays repeats of mistakes", () => {
  let progress = upgradeChallengeProgress(emptyMathGame());
  const ids: string[] = [],
    formats = new Set<number>();
  for (let index = 0; index < 16; index++) {
    const q = nextChallenge("foundations", progress);
    ids.push(q.id);
    formats.add(q.format);
    progress = assessChallenge(
      "foundations",
      progress,
      q,
      index === 0 ? q.choices.find((c) => c !== q.answer)! : q.answer,
      1,
      0,
    ).progress;
    expect(validChallengeProgress(progress)).toBe(true);
  }
  expect(formats.size).toBe(8);
  expect(ids.slice(1, 4)).not.toContain(ids[0]);
  expect(new Set(ids).size).toBeGreaterThanOrEqual(14);
});
it("checks independent reference answers for all 144 additional formats", () => {
  const reference = {
    foundations: [
      [1, 4, 10, 21],
      [18, 18, 15, 3],
      [8, 16, 24, 4],
      [2, 3, 2, 2],
      [25, 4, 12, 6],
      [144, 40, 20, 10],
    ],
    school: [
      [5, 5, 10, 4],
      [5, 0, 4, 3],
      [4, -4, -1.5, 4],
      [16, 3, 24, 4],
      [4, 3, 20, 6],
      [25, 75, 50, 20],
    ],
    advanced: [
      [0, 0, 2, 3.33],
      [5, 2, 9, -2],
      [2, 0, 0, 2],
      [0, 8, 6, 5],
      [6, 2, 5, 8],
      [0, 2, -2, 8],
    ],
    calculus1: [
      [4, 0, 1, 2],
      [12, -2, 1, 3],
      [32, -2, 1, 4],
      [2, 3, 5, -1],
      [-4, 0, 8, 2],
      [4, 2, 9, -2],
    ],
    calculus2: [
      [5, -4, 7, 8],
      [8, 0, -4, 0],
      [8, 4, 4, 6],
      [3.67, 2, 2, 8],
      [12, 10.67, 16, 8],
      [6, 6, -4, 4],
    ],
    calculus3: [
      [8, 0, 2, 2],
      [6, 4, 4, 12],
      [4, 3, -4, 2],
      [0, 4, 1, 1],
      [7, 0, 0, 3],
      [4, 4, -12, 5],
    ],
  };
  for (const { id } of MATH_COURSES)
    for (let level = 0; level < 6; level++)
      for (let format = 0; format < 4; format++)
        expect(
          challengeQuestion(id, level, 24 + format * 6).answer,
          `${id}/${level}/${format}`,
        ).toBe(reference[id][level]![format]);
});
it("reaches all difficulties before completing a stage, without a predictable answer position", () => {
  let progress = upgradeChallengeProgress(emptyMathGame());
  const difficulty = new Set<number>(),
    positions = new Set<number>();
  for (let i = 0; i < 22; i++) {
    const q = nextChallenge("foundations", progress);
    difficulty.add(q.difficulty);
    positions.add(q.choices.indexOf(q.answer));
    const result = assessChallenge("foundations", progress, q, q.answer, 1, 0);
    progress = result.progress;
    expect(result.milestone !== null).toBe(i === 21);
  }
  expect(difficulty.size).toBe(3);
  expect(positions.size).toBe(4);
  expect(challengeCompletion(progress).percent).toBe(16);
});
it("merges mixed v3/v4 evidence from two devices without reset, double count or overwriting v3", () => {
  localStorage.clear();
  const old = emptyMathGame(),
    raw = JSON.stringify({ foundations: old });
  localStorage.setItem("helena.mathGame.v3", raw);
  const base = upgradeChallengeProgress(old);
  const q1 = challengeQuestion("foundations", 0, 0),
    q2 = challengeQuestion("foundations", 0, 24);
  const a = assessChallenge("foundations", base, q1, q1.answer, 1, 0).progress;
  const b = assessChallenge("foundations", base, q2, q2.answer, 1, 0).progress;
  expect(saveMathGame("foundations", a)).toBe(true);
  expect(saveMathGame("foundations", b)).toBe(true);
  const merged = readMathGame().foundations!;
  expect(challengeCompletion(merged).counts[0]).toBe(2);
  expect(validChallengeProgress(merged)).toBe(true);
  expect(localStorage.getItem("helena.mathGame.v3")).toBe(raw);
  const result = mergeSyncedItems(
    {},
    { [CHALLENGE_KEY]: JSON.stringify({ foundations: a }) },
    { [CHALLENGE_KEY]: JSON.stringify({ foundations: b }) },
  );
  expect(JSON.parse(result.items[CHALLENGE_KEY]!).foundations).toEqual(merged);
  expect(mergeChallengeProgress(merged, a)).toEqual(merged);
  localStorage.clear();
});
it("v4 API shares the offline result, validates question/queue and preserves the v3 route", async () => {
  const progress = upgradeChallengeProgress(emptyMathGame()),
    question = nextChallenge("foundations", progress);
  const input = {
    course: "foundations" as const,
    progress,
    question,
    action: "answer" as const,
    choice: question.answer,
    elapsed: 1,
    streak: 0,
  };
  const response = await handleOlena(
    new Request("http://localhost/api/olena?action=math&version=4", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    await requestChallenge(input, new AbortController().signal),
  );
  await expect(
    requestChallenge(
      { ...input, question: { ...question, choices: [0, 1, 2, 3] } },
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(validChallengeProgress({ ...progress, retry: [{ seed: 289, due: 4 }] })).toBe(false);
  const old = await handleOlena(
    new Request("http://localhost/api/olena?action=math&version=3", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        course: "foundations",
        progress: emptyMathGame(),
        action: "question",
      }),
    }),
  );
  expect(old.status).toBe(200);
  expect(old.headers.get("X-Olena-API-Version")).toBe("3");
});
it("keeps v3 accomplishments as old evidence, without pretending new questions were solved", () => {
  const previous = {
    ...emptyMathGame(),
    solved: [1048575, 15, 0, 0, 0, 0],
    seen: [1048575, 15, 0, 0, 0, 0],
    level: 1,
    mastered: 1,
    mastery: 4,
  };
  const progress = upgradeChallengeProgress(previous);
  expect(challengeCompletion(progress).percent).toBe(20);
  expect(progress.solved).toEqual(previous.solved);
  expect(progress.extraSolved).toEqual([0, 0, 0, 0, 0, 0]);
  expect(validChallengeProgress(progress)).toBe(true);
  expect(mergeChallengeProgress(progress, progress)).toEqual(progress);
});
