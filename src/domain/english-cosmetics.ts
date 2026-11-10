import type { englishProgress } from "./language-progress.js";

export function englishCosmeticGoals(progress: ReturnType<typeof englishProgress>): string[] {
  const earned: string[] = [];
  if (progress.percent === 100) earned.push("english-parts-8");
  const solved = progress.parts.reduce((sum, part) => sum + part.solved.size, 0);
  const correct = progress.accepted.reduce((sum, activity) => sum + activity.correct, 0);
  if (solved >= 100 || correct >= 100) earned.push("english-correct-100");
  return earned;
}
