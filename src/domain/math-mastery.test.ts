import { expect, it } from "vitest";
import { challengeQuestion } from "../data/math-challenge-bank";
import { MATH_COURSES } from "../data/math-courses";
import {
  assessMastery,
  nextMasteryQuestion,
  mistakeKind,
  requestMastery,
} from "./math-mastery-engine";
import {
  MASTERY_KEY,
  upgradeMasteryProgress,
  masteryCompletion,
  validMasteryProgress,
  mergeMasteryProgress,
  pendingFinal,
  challengeEvidence,
  type MasteryProgress,
} from "./math-mastery-progress";
import { upgradeChallengeProgress, validChallengeProgress } from "./math-challenge-progress";
import { emptyMathGame } from "./math-game-progress";
import { readMathGame, saveMathGame } from "../data/math-game-learning";
import { handleOlena } from "../backend/olena-handler";
import { mergeSyncedItems } from "../data/sync-conflict";
import { ACCOUNT_OWNER_KEY, claimDeviceForAccount } from "../data/personal-data";

function ready() {
  let p = upgradeMasteryProgress();
  for (let i = 0; i < 60 && nextMasteryQuestion("foundations", p).phase !== "final"; i++) {
    const q = nextMasteryQuestion("foundations", p);
    p = assessMastery("foundations", p, q, q.answer, 2, 0).progress;
  }
  expect(nextMasteryQuestion("foundations", p).phase).toBe("final");
  return p;
}
it.each(MATH_COURSES)(
  "reserves twenty-four unseen, valid final variants per stage in $id",
  ({ id }) => {
    for (let level = 0; level < 6; level++) {
      const practice = new Set(
        Array.from({ length: 48 }, (_, i) => challengeQuestion(id, level, i).expression),
      );
      const final = Array.from({ length: 24 }, (_, i) => challengeQuestion(id, level, 48 + i));
      expect(new Set(final.map((q) => q.id)).size).toBe(24);
      expect(new Set(final.map((q) => q.expression)).size).toBe(24);
      for (const q of final) {
        expect(practice.has(q.expression), q.id).toBe(false);
        expect(q.seed).toBeGreaterThan(288);
        expect(q.difficulty).toBe(3);
        expect(q.choices).toHaveLength(4);
        expect(q.choices.every(Number.isFinite)).toBe(true);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.answer);
      }
    }
  },
);
it("retakes an actual regrouping error with different operands after four other responses", () => {
  const old = emptyMathGame();
  old.solved[0] = old.seen[0] = 1048575;
  old.mastered = 1;
  old.level = 1;
  let p = upgradeMasteryProgress(upgradeChallengeProgress(old));
  const original = {
    ...challengeQuestion("foundations", 1, 4),
    phase: "practice" as const,
    position: null,
  };
  expect(mistakeKind("foundations", original, 34)).toBe("regrouping");
  p = assessMastery("foundations", p, original, 34, 2, 0).progress;
  for (let i = 0; i < 12; i++) {
    const q = nextMasteryQuestion("foundations", p);
    if (q.phase === "recovery") {
      expect(i).toBeGreaterThanOrEqual(4);
      expect(q.seed).not.toBe(original.seed);
      expect(q.expression).not.toBe(original.expression);
      expect(q.choices.some((c) => mistakeKind("foundations", q, c) === "regrouping")).toBe(true);
      const recovered = assessMastery("foundations", p, q, q.answer, 2, 0).progress;
      expect(recovered.recovery.find((r) => r.seed === original.seed)?.resolved).toBe(true);
      expect(
        mergeMasteryProgress(p, recovered).recovery.find((r) => r.seed === original.seed)?.resolved,
      ).toBe(true);
      return;
    }
    p = assessMastery("foundations", p, q, q.answer, 2, 0).progress;
  }
  throw new Error("Retomada não oferecida");
});
it("requires the final, resumes a partial final and passes with four of five distinct answers", () => {
  let p = ready();
  expect(p.confirmed).toBe(0);
  expect(masteryCompletion(p).counts[0]).toBe(19);
  const slots = pendingFinal(p)!.slots;
  expect(new Set(slots.map((s) => Math.floor(s / 6))).size).toBe(4);
  for (let i = 0; i < 5; i++) {
    const q = nextMasteryQuestion("foundations", p);
    expect(q.position).toBe(i);
    const result = assessMastery(
      "foundations",
      p,
      q,
      i === 1 ? q.choices.find((c) => c !== q.answer)! : q.answer,
      2,
      0,
    );
    p = result.progress;
    expect(validMasteryProgress(p)).toBe(true);
    expect(saveMathGame("foundations", p)).toBe(true);
    const restored = readMathGame().foundations!;
    expect(nextMasteryQuestion("foundations", restored)).toEqual(
      nextMasteryQuestion("foundations", p),
    );
    expect(result.milestone !== null).toBe(i === 4);
  }
  expect(p.confirmed).toBe(1);
  expect(masteryCompletion(p).level).toBe(1);
});
it("keeps training credit on a failed final, reinforces four times, then selects new final variants", () => {
  let p = ready();
  const slots = pendingFinal(p)!.slots;
  for (let i = 0; i < 5; i++) {
    const q = nextMasteryQuestion("foundations", p);
    p = assessMastery(
      "foundations",
      p,
      q,
      i < 2 ? q.choices.find((c) => c !== q.answer)! : q.answer,
      2,
      0,
    ).progress;
  }
  expect(p.confirmed).toBe(0);
  expect(p.cooldown).toBe(4);
  expect(masteryCompletion(p).counts[0]).toBe(19);
  for (let i = 0; i < 4; i++) {
    const q = nextMasteryQuestion("foundations", p);
    expect(q.phase).not.toBe("final");
    p = assessMastery("foundations", p, q, q.answer, 2, 0).progress;
  }
  expect(pendingFinal(p)!.slots.every((s) => !slots.includes(s))).toBe(true);
});
it("merges partial final answers and published milestones without replay or duplicate evidence", () => {
  const p = ready(),
    q = nextMasteryQuestion("foundations", p);
  const a = assessMastery("foundations", p, q, q.answer, 2, 0).progress;
  const b = assessMastery(
    "foundations",
    a,
    nextMasteryQuestion("foundations", a),
    nextMasteryQuestion("foundations", a).answer,
    2,
    0,
  ).progress;
  expect(mergeMasteryProgress(a, b)).toEqual(mergeMasteryProgress(b, a));
  expect(mergeMasteryProgress(b, b)).toEqual(b);
  const items = mergeSyncedItems(
    {},
    { [MASTERY_KEY]: JSON.stringify({ foundations: a }) },
    { [MASTERY_KEY]: JSON.stringify({ foundations: b }) },
  ).items;
  expect(JSON.parse(items[MASTERY_KEY]!).foundations.final.answered).toBe(3);
});
it("keeps repeated failed finals valid after the reserved pool is exhausted", () => {
  let p = ready();
  for (let round = 0; round < 12; round++) {
    const final = pendingFinal(p)!;
    expect(new Set(final.slots).size).toBe(5);
    for (let i = 0; i < 5; i++) {
      const q = nextMasteryQuestion("foundations", p);
      p = assessMastery(
        "foundations",
        p,
        q,
        q.choices.find((c) => c !== q.answer)!,
        2,
        0,
      ).progress;
      expect(validMasteryProgress(p)).toBe(true);
    }
    expect(p.confirmed).toBe(0);
    for (let i = 0; i < 4; i++) {
      const q = nextMasteryQuestion("foundations", p);
      p = assessMastery("foundations", p, q, q.answer, 2, 0).progress;
      expect(validMasteryProgress(p)).toBe(true);
    }
  }
  expect(p.finalSeen[0]).toBe(16777215);
});
it("preserves old milestones and keys, but never converts its own pending final into an old milestone", () => {
  const old = {
    ...emptyMathGame(),
    solved: [1048575, 0, 0, 0, 0, 0],
    seen: [1048575, 0, 0, 0, 0, 0],
    mastered: 1,
    level: 1,
  };
  const raw = JSON.stringify({ foundations: old });
  localStorage.setItem("helena.mathGame.v3", raw);
  expect(readMathGame().foundations!.confirmed).toBe(1);
  localStorage.clear();
  const p = ready();
  expect(saveMathGame("foundations", p)).toBe(true);
  expect(readMathGame().foundations!.confirmed).toBe(0);
  expect(localStorage.getItem("helena.mathGame.v4")).toBeNull();
  expect(validChallengeProgress(challengeEvidence(p))).toBe(true);
  localStorage.setItem(ACCOUNT_OWNER_KEY, "first");
  claimDeviceForAccount(localStorage, "second");
  expect(localStorage.getItem(MASTERY_KEY)).toBeNull();
});
it("shares v5 assessment with Olena API, rejects a forged final and retains v4", async () => {
  const p = ready(),
    q = nextMasteryQuestion("foundations", p);
  const input = {
    course: "foundations" as const,
    progress: p,
    action: "answer" as const,
    question: q,
    choice: q.answer,
    elapsed: 2,
    streak: 0,
  };
  const call = (body: unknown, version = 5) =>
    handleOlena(
      new Request(`http://localhost/api/olena?action=math&version=${version}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  const response = await call(input);
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Olena-API-Version")).toBe("5");
  expect(await response.json()).toEqual(await requestMastery(input, new AbortController().signal));
  expect((await call({ ...input, question: { ...q, answer: q.answer + 1 } })).status).toBe(400);
  expect(
    (
      await call(
        { course: "foundations", progress: upgradeChallengeProgress(), action: "question" },
        4,
      )
    ).status,
  ).toBe(200);
  expect(validMasteryProgress({ ...p, confirmed: 63 })).toBe(false);
  expect(
    validMasteryProgress({
      ...p,
      final: { level: 0, slots: [0, 0, 0, 0, 0], answered: 0, correct: 0 },
    }),
  ).toBe(false);
});
it.each(MATH_COURSES)("can finish all six $id stages with the reserved finals", ({ id }) => {
  let p: MasteryProgress = upgradeMasteryProgress();
  let finals = 0;
  for (let i = 0; i < 250 && p.confirmed !== 63; i++) {
    const q = nextMasteryQuestion(id, p);
    const result = assessMastery(id, p, q, q.answer, 2, 0);
    p = result.progress;
    expect(validMasteryProgress(p)).toBe(true);
    if (result.milestone) finals++;
  }
  expect(finals).toBe(6);
  expect(masteryCompletion(p).percent).toBe(100);
});
