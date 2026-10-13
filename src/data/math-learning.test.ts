import { afterEach, expect, it } from "vitest";
import {
  mathLearning,
  saveMathLearning,
  MATH_LEARNING_KEY,
  LEGACY_MATH_LEARNING_KEY,
} from "./math-learning";
import { EMPTY_MATH_PROGRESS } from "./math-courses";
afterEach(() => {
  localStorage.removeItem(MATH_LEARNING_KEY);
  localStorage.removeItem(LEGACY_MATH_LEARNING_KEY);
});
it("reads original progress and keeps the legacy mirror readable for old tabs", () => {
  localStorage.setItem(
    LEGACY_MATH_LEARNING_KEY,
    JSON.stringify({ foundations: { level: 2, mastery: 3, correct: 12, best: 180 } }),
  );
  expect(mathLearning("foundations").correct).toBe(12);
  expect(mathLearning("foundations").mastery).toBe(0);
  expect(mathLearning("foundations").mastered).toBe(3);
  expect(
    saveMathLearning("foundations", { ...mathLearning("foundations"), mastery: 5, mastered: 3 }),
  ).toBe(true);
  const legacy = JSON.parse(localStorage.getItem(LEGACY_MATH_LEARNING_KEY)!);
  expect(legacy.foundations).toEqual({ level: 2, mastery: 3, correct: 12, best: 180 });
  expect(mathLearning("foundations").mastered).toBe(3);
});
it("accepts old progress and persists a bounded recent error counter", () => {
  expect(saveMathLearning("foundations", { ...EMPTY_MATH_PROGRESS, errors: 1 })).toBe(true);
  expect(mathLearning("foundations").errors).toBe(1);
  expect(saveMathLearning("foundations", { ...EMPTY_MATH_PROGRESS, errors: 3 })).toBe(false);
});
it("resumes newer legacy answers without dropping modern achievements", () => {
  localStorage.setItem(
    MATH_LEARNING_KEY,
    JSON.stringify({ foundations: { level: 1, mastery: 2, mastered: 1, correct: 12, best: 200 } }),
  );
  localStorage.setItem(
    LEGACY_MATH_LEARNING_KEY,
    JSON.stringify({ foundations: { level: 2, mastery: 1, correct: 18, best: 400 } }),
  );
  expect(mathLearning("foundations")).toEqual({
    level: 2,
    mastery: 0,
    correct: 18,
    best: 400,
    mastered: 3,
  });
});
it("a damaged legacy mirror cannot erase valid modern progress", () => {
  const progress = { ...EMPTY_MATH_PROGRESS, mastered: 3, correct: 12, level: 2 };
  localStorage.setItem(MATH_LEARNING_KEY, JSON.stringify({ foundations: progress }));
  localStorage.setItem(LEGACY_MATH_LEARNING_KEY, "broken-json");
  expect(mathLearning("foundations")).toEqual(progress);
});
it("keeps separate courses and restores only valid legacy data when modern data is corrupt", () => {
  expect(saveMathLearning("foundations", { level: 2, mastery: 1, correct: 4, best: 78 })).toBe(
    true,
  );
  expect(mathLearning("foundations").level).toBe(2);
  expect(mathLearning("school")).toEqual(EMPTY_MATH_PROGRESS);
  expect(saveMathLearning("school", { level: 99, mastery: 1, correct: 4, best: 78 })).toBe(false);
  localStorage.setItem(MATH_LEARNING_KEY, '{"foundations":{"level":99},"injected":{}}');
  expect(mathLearning("foundations")).toEqual({
    level: 2,
    mastery: 0,
    correct: 4,
    best: 78,
    mastered: 3,
  });
  localStorage.removeItem(LEGACY_MATH_LEARNING_KEY);
  expect(mathLearning("foundations")).toEqual(EMPTY_MATH_PROGRESS);
});
