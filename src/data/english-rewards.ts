import type { PracticeActivity } from "../domain/workspace";
import { englishAttemptOf } from "../domain/language-progress";
import { englishAreaReward } from "../domain/english-areas";
import { englishRewardCourse } from "../domain/english-levels";
import { finishMathPlace, finishEnglishRound } from "./math-place-rewards";
import { recordRoomXp } from "./room-xp";

export function settleEnglishRewards(
  activities: readonly PracticeActivity[],
  random?: () => number,
) {
  const rounds = new Map<string, Map<number, number>>();
  for (const activity of activities) {
    const attempt = englishAttemptOf(activity);
    if (attempt?.curriculum === 4 && attempt.mode === "practice" && activity.answers === 1) {
      const match = /^(english:.+):([0-5])$/.exec(activity.id);
      if (match) {
        const entries = rounds.get(match[1]!) ?? new Map<number, number>();
        entries.set(Number(match[2]), activity.correct);
        rounds.set(match[1]!, entries);
      }
    }
    if (activity.correct <= 0 || !attempt) continue;
    finishMathPlace(
      attempt.curriculum === 3 || attempt.curriculum === 4
        ? englishAreaReward(attempt.area!)
        : englishRewardCourse(attempt.level ?? "a1"),
      activity.id,
      activity.correct * 20,
      random,
    );
    recordRoomXp({
      id: activity.id,
      place: 1,
      xp: activity.correct * 4,
      completedAt: Date.parse(activity.completedAt),
    });
  }
  for (const [id, entries] of rounds) {
    if (entries.size === 6)
      finishEnglishRound(
        "english-english",
        id,
        [...entries.values()].reduce((sum, correct) => sum + correct * 20, 0),
        random,
      );
  }
}
