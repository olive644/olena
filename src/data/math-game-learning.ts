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
export { requestMathGame } from "../domain/math-game";
export type { MathGameResult } from "../domain/math-game";

export function readMathGame(): Partial<Record<MathCourseId, ChallengeProgress>> {
  const modern = parseChallengeProgress(localStorage.getItem(CHALLENGE_KEY));
  for (const [id, previous] of Object.entries(parseMathGame(localStorage.getItem(MATH_GAME_KEY)))) {
    const course = id as MathCourseId;
    modern[course] = modern[course]
      ? mergeChallengeProgress(modern[course], upgradeChallengeProgress(previous))
      : upgradeChallengeProgress(previous);
  }
  return modern;
}
export function mathGameLearning(course: MathCourseId): ChallengeProgress {
  return readMathGame()[course] ?? upgradeChallengeProgress(emptyMathGame(mathLearning(course)));
}
export function saveMathGame(
  course: MathCourseId,
  progress: MathGameProgress | ChallengeProgress,
): boolean {
  if (!validChallengeProgress(progress) && !validMathGame(progress)) return false;
  const value = validChallengeProgress(progress) ? progress : upgradeChallengeProgress(progress);
  try {
    const saved = readMathGame();
    const merged = saved[course] ? mergeChallengeProgress(saved[course], value) : value;
    writeSyncedStorage(CHALLENGE_KEY, JSON.stringify({ ...saved, [course]: merged }));
    return true;
  } catch {
    return false;
  }
}
