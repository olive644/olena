import { mathAchievements } from "./math-achievements";
import { readMathGame } from "../data/math-game-learning";
import { englishCosmeticGoals } from "./english-cosmetics";
import type { englishProgress } from "./language-progress";
import type { StoredProfile } from "./profile-identity";
export function cosmeticAchievements(
  english: ReturnType<typeof englishProgress>,
  history: StoredProfile["achievementHistory"],
) {
  return new Set([
    ...mathAchievements(readMathGame())
      .filter((item) => item.earned)
      .map((item) => item.id),
    ...Object.keys(history ?? {}),
    ...englishCosmeticGoals(english),
  ]);
}
