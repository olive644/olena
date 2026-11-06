import { expect, it } from "vitest";
import { nextEnglishQuestion } from "./english-adaptive";
import { englishDifficulty, englishBankSize } from "./english-difficulty";
import { englishSkill, englishSkillCoverage } from "./english-skills";
import { englishConfirmation, englishLearningReady } from "./english-learning";

it("every scene in all eight parts has an explicit skill family", () => {
  for (let part = 0; part < 8; part++) {
    for (let scene = 0; scene < englishBankSize(part) / 4; scene++)
      expect(englishSkill(part, scene), `${part}:${scene}`).toBeGreaterThanOrEqual(0);
  }
});
it("counts contexts rather than four formats as four independent skills", () => {
  expect([...englishSkillCoverage(1, [0, 1, 2, 3]).values()][0]?.size).toBe(1);
});
it("does not force advanced grammar just to avoid a previous context in any part", () => {
  for (let part = 0; part < 8; part++) {
    const ids = Array.from({ length: englishBankSize(part) }, (_, id) => id);
    const exclude = ids.filter((id) => englishDifficulty(part, id) === 0 && id % 4 === 0);
    const selected = nextEnglishQuestion({ part, solved: exclude, exclude, recent: [] });
    expect(englishDifficulty(part, selected.id)).toBeLessThanOrEqual(selected.difficulty + 1);
  }
});
it("revisits earlier successful material after six responses, outside recent contexts", () => {
  const recent = [4, 8, 12, 16, 20, 24].map((id) => ({ id, correct: true }));
  const selected = nextEnglishQuestion({
    part: 1,
    solved: [0],
    exclude: recent.map(({ id }) => id),
    recent,
  });
  expect(selected.id).toBe(0);
});

it("samples five different situations and skills at confirmation across all parts", () => {
  for (let part = 0; part < 8; part++)
    for (let seed = 0; seed < 50; seed++) {
      const ids = englishConfirmation(part, seed);
      expect(ids).toHaveLength(5);
      expect(new Set(ids.map((id) => Math.floor(id / 4))).size).toBe(5);
      expect(new Set(ids.map((id) => englishSkill(part, Math.floor(id / 4)))).size).toBe(5);
      expect(ids.every((id) => id >= 0 && id < englishBankSize(part))).toBe(true);
    }
});

it("requires both comprehension and construction across skill families for new confirmations", () => {
  for (let part = 0; part < 8; part++) {
    const all = Array.from({ length: englishBankSize(part) }, (_, id) => id);
    expect(englishLearningReady(part, all)).toBe(true);
    expect(
      englishLearningReady(
        part,
        all.filter((id) => id % 4 === 0),
      ),
    ).toBe(false);
    expect(
      englishLearningReady(
        part,
        all.filter((id) => id % 4 === 3),
      ),
    ).toBe(false);
    expect(englishLearningReady(part, [])).toBe(false);
  }
});

it("interleaves earlier A1 knowledge without treating its 120 authored tasks as four-format scenes", () => {
  const recent = [140, 141, 142, 143, 144, 145].map((id) => ({ id, correct: true }));
  const next = nextEnglishQuestion({
    curriculum: 5,
    part: 0,
    solved: [120],
    exclude: recent.map(({ id }) => id),
    recent,
  });
  expect(next.id).toBe(120);
});
