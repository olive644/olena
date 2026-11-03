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
  const completed = new Map<string, number>();
  for (const activity of activities) {
    const attempt = englishAttemptOf(activity);
    if (
      (attempt?.curriculum === 4 || attempt?.curriculum === 5) &&
      attempt.mode === "practice" &&
      activity.answers === 1
    ) {
      const match = /^(english:.+):(\d+)(:completed)?$/.exec(activity.id);
      if (match && Number.isSafeInteger(Number(match[2])) && Number(match[2]) < 240) {
        if (match[3]) completed.set(match[1]!, Number(match[2]));
        const entries = rounds.get(match[1]!) ?? new Map<number, number>();
        entries.set(Number(match[2]), activity.correct);
        rounds.set(match[1]!, entries);
      }
    }
    if (activity.correct <= 0 || !attempt) continue;
    finishMathPlace(
      attempt.curriculum === 3 || attempt.curriculum === 4 || attempt.curriculum === 5
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
    const end = completed.get(id) ?? (!id.startsWith("english:arcade:") ? 5 : -1);
    if (end >= 0 && entries.size === end + 1 && Math.max(...entries.keys()) === end)
      finishEnglishRound(
        "english-english",
        id,
        [...entries.values()].reduce((sum, correct) => sum + correct * 20, 0),
        random,
      );
  }
}
