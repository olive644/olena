import { type MathCourseId } from "./math-courses";
import { mathLearning } from "./math-learning";
import { writeSyncedStorage } from "./synced-storage";
import {
  MATH_GAME_KEY,
  emptyMathGame,
  validMathGame,
  parseMathGame,
  type MathGameProgress,
} from "../domain/math-game-progress";
import {
  CHALLENGE_KEY,
  mergeChallengeProgress,
  parseChallengeProgress,
  upgradeChallengeProgress,
  validChallengeProgress,
  type ChallengeProgress,
} from "../domain/math-challenge-progress";
import {
  MASTERY_KEY,
  mergeMasteryProgress,
  parseMasteryProgress,
  upgradeMasteryProgress,
  validMasteryProgress,
  type MasteryProgress,
} from "../domain/math-mastery-progress";
export { requestMathGame } from "../domain/math-game";
export type { MathGameResult } from "../domain/math-game";

export function readMathGame(): Partial<Record<MathCourseId, MasteryProgress>> {
  const previous = parseChallengeProgress(localStorage.getItem(CHALLENGE_KEY));
  for (const [id, old] of Object.entries(parseMathGame(localStorage.getItem(MATH_GAME_KEY)))) {
    const course = id as MathCourseId;
    previous[course] = previous[course]
      ? mergeChallengeProgress(previous[course], upgradeChallengeProgress(old))
      : upgradeChallengeProgress(old);
  }
  const modern = parseMasteryProgress(localStorage.getItem(MASTERY_KEY));
  for (const [id, p] of Object.entries(previous)) {
    const course = id as MathCourseId;
    const old = upgradeMasteryProgress(p);
    modern[course] = modern[course] ? mergeMasteryProgress(modern[course], old) : old;
  }
  return modern;
}
export function mathGameLearning(course: MathCourseId): MasteryProgress {
  return (
    readMathGame()[course] ??
    upgradeMasteryProgress(upgradeChallengeProgress(emptyMathGame(mathLearning(course))))
  );
}
export function saveMathGame(
  course: MathCourseId,
  progress: MathGameProgress | ChallengeProgress | MasteryProgress,
): boolean {
  if (
    !validMasteryProgress(progress) &&
    !validChallengeProgress(progress) &&
    !validMathGame(progress)
  )
    return false;
  const value = validMasteryProgress(progress)
    ? progress
    : upgradeMasteryProgress(
        validChallengeProgress(progress) ? progress : upgradeChallengeProgress(progress),
      );
  try {
    const saved = readMathGame();
    const merged = saved[course] ? mergeMasteryProgress(saved[course], value) : value;
    writeSyncedStorage(MASTERY_KEY, JSON.stringify({ ...saved, [course]: merged }));
    return true;
  } catch {
    return false;
  }
}
