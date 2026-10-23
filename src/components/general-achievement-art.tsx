import type { GeneralAchievement } from "../domain/general-achievement-catalog";

export function GeneralAchievementScene({
  item,
  thumb = false,
}: {
  item: GeneralAchievement;
  thumb?: boolean;
}) {
  return (
    <image
      href={`/achievement-badges/general/${thumb ? "thumb/" : ""}${item.id}.webp`}
      width="160"
      height="160"
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
