import type { Page } from "@playwright/test";
import { mathChallenge } from "../src/domain/adaptive-math";
import {
  EMPTY_MATH_PROGRESS,
  validMathProgress,
  type MathCourseId,
} from "../src/data/math-courses";

export async function shownMathQuestion(page: Page, course: MathCourseId) {
  const seed = Number(await page.locator(".math-arcade-stage").getAttribute("data-question-seed"));
  const progress: unknown = await page.evaluate((id) => {
    const raw =
      localStorage.getItem("helena.mathLearning.v2") ??
      localStorage.getItem("helena.mathLearning.v1") ??
      "{}";
    return (
      (JSON.parse(raw) as Record<string, unknown>)[id] ?? {
        level: 0,
        mastery: 0,
        correct: 0,
        best: 0,
      }
    );
  }, course);
  if (!validMathProgress(progress)) throw new Error("Invalid test progress");
  return mathChallenge(course, progress ?? EMPTY_MATH_PROGRESS, seed);
}
