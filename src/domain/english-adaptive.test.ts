import { expect, it } from "vitest";
import { englishDifficulty } from "./english-difficulty";
import { nextEnglishQuestion, validEnglishSelection } from "./english-adaptive";

it("starts with supported comprehension, raises challenge after success and lowers it after error", () => {
  const input = { solved: [], recent: [], exclude: [] };
  expect(nextEnglishQuestion(input)).toMatchObject({ id: 0, difficulty: 0, recovery: false });
  const recent = [0, 1, 2, 3, 8, 9].map((id) => ({ id, correct: true }));
  expect(nextEnglishQuestion({ ...input, recent }).difficulty).toBe(1);
  expect(
    nextEnglishQuestion({ ...input, recent: [...recent.slice(1), { id: 3, correct: false }] }),
  ).toMatchObject({ difficulty: 0, recovery: true });
});
it("prioritises unseen tasks and never repeats a task within the current round", () => {
  const next = nextEnglishQuestion({ solved: [0, 4, 8], recent: [], exclude: [12, 16] });
  expect([0, 4, 8, 12, 16]).not.toContain(next.id);
  const seen: number[] = [];
  for (let i = 0; i < 120; i++) {
    const result = nextEnglishQuestion({ solved: seen, recent: [], exclude: [] });
    expect(seen).not.toContain(result.id);
    seen.push(result.id);
  }
  expect(new Set(seen).size).toBe(120);
});
it("rejects unbounded or malformed scheduling evidence", () => {
  expect(validEnglishSelection({ solved: [], exclude: [], recent: [] })).toBe(true);
  for (const value of [
    null,
    { solved: [120], exclude: [], recent: [] },
    { solved: [], exclude: [1, 1], recent: [] },
    { solved: [], exclude: [], recent: [{ id: 1, correct: "yes" }] },
    {
      solved: [],
      exclude: [],
      recent: Array.from({ length: 25 }, () => ({ id: 0, correct: true })),
    },
  ])
    expect(validEnglishSelection(value)).toBe(false);
});

it("starts argumentation with simple agreement rather than the first advanced legacy sentence", () => {
  const next = nextEnglishQuestion({ part: 4, solved: [], recent: [], exclude: [] });
  expect(next).toMatchObject({ id: 24, difficulty: 0 });
});
it("retreats to simpler grammar after repeated errors and restores an accessible format", () => {
  const recent = [52, 53].map((id) => ({ id, correct: false }));
  const next = nextEnglishQuestion({ part: 0, solved: [], recent, exclude: [52, 53] });
  expect(next.difficulty).toBe(1);
  expect(next.id % 4).toBe(0);
});

it("does not jump another grammar band on every answer after a mixed-level streak", () => {
  const recent = [0, 1, 2, 3, 8, 28].map((id) => ({ id, correct: true }));
  expect(
    nextEnglishQuestion({ part: 0, solved: [0, 1, 2, 3, 8], recent, exclude: [] }).difficulty,
  ).toBe(0);
});

it("recovers with easier known material instead of forcing unseen advanced grammar", () => {
  const solved = Array.from({ length: 120 }, (_, id) => id).filter((id) =>
    [0, 1].includes(englishDifficulty(0, id)),
  );
  const result = nextEnglishQuestion({
    part: 0,
    solved,
    recent: [
      { id: 52, correct: false },
      { id: 53, correct: false },
    ],
    exclude: [52, 53],
  });
  expect(englishDifficulty(0, result.id)).toBe(1);
});

it("revisits the same Habit Square skill through a different sentence", () => {
  const wrong = 14 * 4 + 1;
  const next = nextEnglishQuestion({
    part: 1,
    solved: [],
    recent: [{ id: wrong, correct: false }],
    exclude: [wrong],
  });
  const scene = Math.floor(next.id / 4);
  expect(scene).not.toBe(14);
  expect([13, 15, 33, 38, 39, 41]).toContain(scene);
});

it("varies accessible Habit Square contexts before forcing advanced grammar", () => {
  const seen: number[] = [];
  for (let index = 0; index < 44; index++) {
    const next = nextEnglishQuestion({
      part: 1,
      solved: seen,
      recent: seen.slice(-6).map((id) => ({ id, correct: true })),
      exclude: seen,
    });
    const unseenAccessible = Array.from({ length: 44 }, (_, scene) => scene).filter(
      (scene) =>
        englishDifficulty(1, scene * 4) <= next.difficulty + 1 &&
        !seen.some((id) => Math.floor(id / 4) === scene),
    );
    expect(seen).not.toContain(next.id);
    expect(englishDifficulty(1, next.id)).toBeLessThanOrEqual(next.difficulty + 1);
    if (unseenAccessible.length)
      expect(seen.map((id) => Math.floor(id / 4))).not.toContain(Math.floor(next.id / 4));
    seen.push(next.id);
  }
});

it("reviews past questions with did in a different context at Memory Bridge", () => {
  const wrong = 32 * 4 + 1;
  const next = nextEnglishQuestion({
    part: 2,
    solved: [],
    recent: [{ id: wrong, correct: false }],
    exclude: [wrong],
  });
  expect([3, 16, 17, 39]).toContain(Math.floor(next.id / 4));
});

it("treats harbor and harbour as one Memory Bridge context when varying practice", () => {
  const next = nextEnglishQuestion({ part: 2, solved: [], recent: [], exclude: [0] });
  expect([0, 6]).not.toContain(Math.floor(next.id / 4));
});

it("revisits an evidence-based prediction at Plans Lookout in a different situation", () => {
  const wrong = 13 * 4 + 1;
  const next = nextEnglishQuestion({
    part: 3,
    solved: [],
    recent: [{ id: wrong, correct: false }],
    exclude: [wrong],
  });
  expect(Math.floor(next.id / 4)).toBe(35);
});

it("varies Plans Lookout contexts even when two historical IDs express the same idea", () => {
  const next = nextEnglishQuestion({ part: 3, solved: [], recent: [], exclude: [5 * 4] });
  expect([5, 8]).not.toContain(Math.floor(next.id / 4));
});

it("reviews requests for evidence in a different context at Ideas Courtyard", () => {
  const wrong = 17 * 4 + 1;
  const next = nextEnglishQuestion({
    part: 4,
    solved: [],
    recent: [{ id: wrong, correct: false }],
    exclude: [wrong],
  });
  expect(Math.floor(next.id / 4)).toBe(37);
});
