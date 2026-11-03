import { expect, it } from "vitest";
import { nextEnglishQuestion, validEnglishSelection } from "./english-adaptive";

it("starts with supported comprehension, raises challenge after success and lowers it after error", () => {
  const input = { solved: [], recent: [], exclude: [] };
  expect(nextEnglishQuestion(input)).toMatchObject({ id: 0, difficulty: 0, recovery: false });
  const recent = [0, 1, 2, 3, 4, 5].map((id) => ({ id, correct: true }));
  expect(nextEnglishQuestion({ ...input, recent }).difficulty).toBe(3);
  expect(
    nextEnglishQuestion({ ...input, recent: [...recent.slice(1), { id: 7, correct: false }] }),
  ).toMatchObject({ difficulty: 2, recovery: true });
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
