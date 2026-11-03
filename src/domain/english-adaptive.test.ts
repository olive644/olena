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
