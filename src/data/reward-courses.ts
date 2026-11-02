import { isMathCourse, type MathCourseId } from "./math-courses.js";

// Keep the existing synchronized ledger, with an isolated namespace for English.
export type RewardCourseId = MathCourseId | "english-a1";
export function isRewardCourse(value: unknown): value is RewardCourseId {
  return value === "english-a1" || isMathCourse(value);
}
