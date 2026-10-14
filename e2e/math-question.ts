import type { Page } from "@playwright/test";
import { challengeQuestion as bankQuestion } from "../src/data/math-challenge-bank";
import { type MathCourseId } from "../src/data/math-courses";

export async function shownMathQuestion(page: Page, course: MathCourseId) {
  const seed = Number(await page.locator(".math-arcade-stage").getAttribute("data-question-seed"));
  return bankQuestion(course, Math.floor((seed - 1) / 48), (seed - 1) % 48);
}
