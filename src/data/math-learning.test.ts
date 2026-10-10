import { afterEach, expect, it } from "vitest";
import { mathLearning, saveMathLearning, MATH_LEARNING_KEY } from "./math-learning";
import { EMPTY_MATH_PROGRESS } from "./math-courses";
afterEach(() => localStorage.removeItem(MATH_LEARNING_KEY));
it("keeps separate course mastery and rejects corrupted progress", () => {
  expect(saveMathLearning("foundations", { level: 2, mastery: 1, correct: 4, best: 78 })).toBe(
    true,
  );
  expect(mathLearning("foundations").level).toBe(2);
  expect(mathLearning("school")).toEqual(EMPTY_MATH_PROGRESS);
  expect(saveMathLearning("school", { level: 99, mastery: 1, correct: 4, best: 78 })).toBe(false);
  localStorage.setItem(MATH_LEARNING_KEY, '{"foundations":{"level":99},"injected":{}}');
  expect(mathLearning("foundations")).toEqual(EMPTY_MATH_PROGRESS);
});
