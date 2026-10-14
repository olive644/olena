import { type MathCourseId } from "./math-courses";
import { mathLearning } from "./math-learning";
import { writeSyncedStorage } from "./synced-storage";
import {
  MATH_GAME_KEY,
  emptyMathGame,
  validMathGame,
  mergeMathGame,
  parseMathGame,
  type MathGameProgress,
} from "../domain/math-game-progress";
export { requestMathGame } from "../domain/math-game";
export type { MathGameResult } from "../domain/math-game";

export function readMathGame(
  raw = localStorage.getItem(MATH_GAME_KEY),
): Partial<Record<MathCourseId, MathGameProgress>> {
  return parseMathGame(raw);
}
export function mathGameLearning(course: MathCourseId): MathGameProgress {
  return readMathGame()[course] ?? emptyMathGame(mathLearning(course));
}
export function saveMathGame(course: MathCourseId, progress: MathGameProgress): boolean {
  if (!validMathGame(progress)) return false;
  try {
    const saved = readMathGame();
    const merged = saved[course] ? mergeMathGame(saved[course], progress) : progress;
    writeSyncedStorage(MATH_GAME_KEY, JSON.stringify({ ...saved, [course]: merged }));
    return true;
  } catch {
    return false;
  }
}
