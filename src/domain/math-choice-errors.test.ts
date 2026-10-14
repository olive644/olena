import { expect, it } from "vitest";
import { MATH_COURSES } from "../data/math-courses";
import { challengeQuestion } from "../data/math-challenge-bank";
import { originalChoiceErrors, choiceBounds } from "../data/math-choice-errors";
import { nextChallenge, assessChallenge } from "./math-challenge-engine";
import {
  upgradeChallengeProgress,
  challengeCompletion,
  hasChallenge,
  normalizeChallenge,
  mergeChallengeProgress,
  validChallengeProgress,
} from "./math-challenge-progress";

it.each(MATH_COURSES)(
  "keeps all $id choices distinct and in the requested quantity's domain",
  ({ id }) => {
    for (let level = 0; level < 6; level++) {
      for (let index = 0; index < 48; index++) {
        const q = challengeQuestion(id, level, index);
        const [min, max] = choiceBounds(id, level, q.format);
        expect(q.choices, q.id).toHaveLength(4);
        expect(new Set(q.choices).size, q.id).toBe(4);
        expect(
          q.choices.every((c) => Number.isFinite(c) && c >= min && c <= max),
          q.id,
        ).toBe(true);
        expect(
          q.choices.filter((c) => c === q.answer),
          q.id,
        ).toHaveLength(1);
        if (id === "foundations" && level < 4)
          expect(q.choices.every(Number.isInteger), q.id).toBe(true);
        if (index < 24) {
          const authored = originalChoiceErrors(id, level, index, q.answer)
            .map((c) => Number(c.toFixed(2)))
            .filter((c) => c !== q.answer && c >= min && c <= max);
          expect(
            q.choices.filter((c) => c !== q.answer && authored.includes(c)).length,
            q.id,
          ).toBeGreaterThanOrEqual(2);
        }
      }
    }
  },
);

it("does not offer negative counts or reuse one subtraction list for unrelated prompts", () => {
  const direct = challengeQuestion("foundations", 1, 4);
  expect(direct.expression).toBe("33 − 9");
  expect([...direct.choices].sort((a, b) => a - b)).toEqual([23, 24, 25, 34]);
  const missing = challengeQuestion("foundations", 1, 8);
  expect(missing.expression).toBe("Complete: 20 − ? = 6");
  expect([...missing.choices].sort((a, b) => a - b)).toEqual([13, 14, 20, 26]);
});

it("uses the actual operation's errors in probability, powers, derivatives and volumes", () => {
  expect(challengeQuestion("school", 1, 0).choices).toEqual(expect.arrayContaining([8, 6, 4, 16]));
  expect(challengeQuestion("school", 5, 0).choices).toEqual(
    expect.arrayContaining([25, 75, 33.33, 0.25]),
  );
  expect(challengeQuestion("calculus1", 1, 6).choices).toEqual(
    expect.arrayContaining([4, 2, 0, 5]),
  );
  expect(challengeQuestion("calculus2", 4, 0).choices).toEqual(
    expect.arrayContaining([8, 4, 16, 7]),
  );
});

it("revisits successful problems after intervening challenges, without inflating completion", () => {
  let progress = upgradeChallengeProgress();
  const sequence: number[] = [];
  for (let i = 0; i < 8; i++) {
    const q = nextChallenge("foundations", progress);
    sequence.push(q.seed);
    progress = assessChallenge("foundations", progress, q, q.answer, 2, 0).progress;
  }
  const q = nextChallenge("foundations", progress);
  expect(hasChallenge(progress, q.seed, true)).toBe(true);
  expect(sequence.slice(-4)).not.toContain(q.seed);
  const before = challengeCompletion(progress);
  progress = assessChallenge("foundations", progress, q, q.answer, 2, 0).progress;
  expect(challengeCompletion(progress)).toEqual(before);
  expect(hasChallenge(progress, nextChallenge("foundations", progress).seed)).toBe(false);
});

it("requires all formats and four hard variants for new stages, not twenty easy answers", () => {
  const p = upgradeChallengeProgress();
  // Quatro variantes fáceis/médias de cinco formatos: vinte acertos sem amplitude.
  p.solved[0] = 15 | (15 << 6) | (15 << 12) | (15 << 18);
  p.extraSolved[0] = 15;
  p.seen = [...p.solved];
  p.extraSeen = [...p.extraSolved];
  expect(challengeCompletion(p).mastered).toBe(0);
  expect(challengeCompletion(p).counts[0]).toBe(19);
  // Completa os três formatos ausentes e quatro variantes difíceis.
  p.extraSolved[0]! |= (1 << 6) | (1 << 12) | (1 << 18);
  p.solved[0]! |= (1 << 4) | (1 << 10) | (1 << 16) | (1 << 22);
  p.seen = [...p.solved];
  p.extraSeen = [...p.extraSolved];
  expect(normalizeChallenge(p)).toMatchObject({ level: 1, mastered: 1 });
});

it("keeps already published v4 milestones when another device has more attempts", () => {
  const old = upgradeChallengeProgress();
  old.solved[0] = 15 | (15 << 6) | (15 << 12) | (15 << 18);
  old.extraSolved[0] = 15;
  old.seen = [...old.solved];
  old.extraSeen = [...old.extraSolved];
  old.mastered = 1;
  old.level = 1;
  const other = normalizeChallenge({ ...old, mastered: 0, level: 0, attempts: 30 });
  expect(validChallengeProgress(old)).toBe(true);
  expect(validChallengeProgress(other)).toBe(true);
  expect(mergeChallengeProgress(old, other)).toMatchObject({ level: 1, mastered: 1 });
});

it("still rotates formats while recovering a fully seen but incomplete stage", () => {
  const p = upgradeChallengeProgress();
  p.seen[0] = 16777215;
  p.extraSeen[0] = 16777215;
  const first = nextChallenge("foundations", p);
  const next = assessChallenge("foundations", p, first, first.answer, 2, 0).progress;
  expect(nextChallenge("foundations", next).format).not.toBe(first.format);
});

it.each(MATH_COURSES)(
  "can complete every $id stage with varied difficult evidence and delayed reviews",
  ({ id }) => {
    let p = upgradeChallengeProgress();
    const formats = Array.from({ length: 6 }, () => new Set<number>());
    const hard = Array.from({ length: 6 }, () => new Set<number>());
    let milestones = 0;
    for (let i = 0; i < 200 && p.mastered !== 63; i++) {
      const q = nextChallenge(id, p);
      const level = p.level;
      formats[level]!.add(q.format);
      if (q.difficulty === 3) hard[level]!.add(q.seed);
      const result = assessChallenge(id, p, q, q.answer, 2, 0);
      p = result.progress;
      expect(validChallengeProgress(p)).toBe(true);
      if (result.milestone) {
        expect(formats[level]!.size).toBe(8);
        expect(hard[level]!.size).toBeGreaterThanOrEqual(4);
        milestones++;
      }
    }
    expect(milestones).toBe(6);
    expect(challengeCompletion(p).percent).toBe(100);
  },
);
