import type { GeneralAchievement } from "../domain/general-achievement-catalog";

export function GeneralAchievementScene({ item }: { item: GeneralAchievement }) {
  return (
    <image
      href={`/achievement-badges/general/${item.id}.webp`}
      width="160"
      height="160"
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
