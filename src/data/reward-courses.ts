import { isEnglishAreaReward, type EnglishAreaReward } from "../domain/english-areas.js";
import { isMathCourse, type MathCourseId } from "./math-courses.js";
import {
  isEnglishRewardCourse as isLegacyEnglishReward,
  type EnglishRewardCourse,
} from "../domain/english-levels.js";

// Keep the existing synchronized ledger, with an isolated namespace for English.
export type RewardCourseId = MathCourseId | EnglishRewardCourse | EnglishAreaReward;
export function isRewardCourse(value: unknown): value is RewardCourseId {
  return isEnglishRewardCourse(value) || isMathCourse(value);
}

export function isEnglishRewardCourse(
  value: unknown,
): value is EnglishAreaReward | EnglishRewardCourse {
  return isEnglishAreaReward(value) || isLegacyEnglishReward(value);
}
