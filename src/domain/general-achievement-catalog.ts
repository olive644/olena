import type { MathAchievement } from "./math-achievements";

export const ACHIEVEMENT_TIERS = ["bronze", "silver", "gold", "emerald"] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];
export type GeneralMetric =
  | "streak"
  | "pomodoro"
  | "timer"
  | "sessions"
  | "studyDays"
  | "notebooks"
  | "pages"
  | "tasks"
  | "quizzes"
  | "quizCorrect"
  | "following"
  | "followers"
  | "balanced"
  | "author"
  | "flashcards"
  | "agenda"
  | "collection"
  | "explorer"
  | "subjects"
  | "perfect";
export type AchievementTheme = "mathematics" | "focus" | "notebooks" | "friends" | "routine";
export type GeneralAchievement = Omit<
  MathAchievement,
  "metric" | "category" | "name" | "description"
> & {
  name: number;
  description: number;
  category: "general";
  metric: GeneralMetric;
  family: string;
  theme: AchievementTheme;
  tier?: AchievementTier;
  icon: string;
};
const families: readonly [
  GeneralMetric,
  number,
  number,
  readonly number[],
  AchievementTheme,
  string,
][] = [
  ["streak", 2869, 2870, [3, 7, 30, 100], "routine", "streak"],
  ["pomodoro", 2871, 2872, [25, 180, 1200, 6000], "focus", "pomodoro"],
  ["timer", 2873, 2874, [30, 240, 1500, 9000], "focus", "timer"],
  ["sessions", 2875, 2876, [1, 10, 50, 200], "focus", "sessions"],
  ["studyDays", 2877, 2878, [3, 14, 60, 180], "routine", "calendar"],
  ["notebooks", 2879, 2880, [1, 3, 8, 20], "notebooks", "notebook"],
  ["pages", 2881, 2882, [5, 25, 100, 500], "notebooks", "pages"],
  ["tasks", 2883, 2884, [1, 10, 50, 200], "routine", "tasks"],
  ["quizzes", 2885, 2886, [1, 10, 50, 200], "routine", "quizzes"],
  ["quizCorrect", 2887, 2888, [10, 100, 500, 2000], "routine", "answers"],
  ["following", 2889, 2890, [1, 3, 10, 30], "friends", "friends"],
  ["followers", 2891, 2892, [1, 5, 20, 50], "friends", "constellation"],
];
const special: readonly [GeneralMetric, number, number, AchievementTheme, string][] = [
  ["balanced", 2893, 2894, "focus", "balance"],
  ["author", 2895, 2896, "notebooks", "author"],
  ["flashcards", 2897, 2898, "notebooks", "flashcards"],
  ["agenda", 2899, 2900, "routine", "appointment"],
  ["collection", 2901, 2902, "notebooks", "desk"],
  ["explorer", 2903, 2904, "routine", "explorer"],
  ["subjects", 2905, 2906, "focus", "subjects"],
  ["perfect", 2907, 2908, "routine", "perfect"],
];
export const GENERAL_ACHIEVEMENTS: readonly GeneralAchievement[] = [
  ...families.flatMap(([metric, name, description, targets, theme, icon], art) =>
    targets.map((target, index): GeneralAchievement => ({
      id: `general-${metric}-${ACHIEVEMENT_TIERS[index]}`,
      name,
      description,
      target,
      metric,
      art,
      category: "general",
      family: `general-${metric}`,
      theme,
      icon,
      tier: ACHIEVEMENT_TIERS[index]!,
      rarity: index === 0 ? "common" : index === 1 ? "uncommon" : "rare",
    })),
  ),
  ...special.map(([metric, name, description, theme, icon], art): GeneralAchievement => ({
    id: `general-${metric}`,
    name,
    description,
    target: 1,
    metric,
    art,
    category: "general",
    family: `general-${metric}`,
    theme,
    icon,
    rarity: art % 3 === 0 ? "rare" : "uncommon",
  })),
];

export function generalAchievementHistory(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    GENERAL_ACHIEVEMENTS.flatMap(({ id }) => {
      const date = (value as Record<string, unknown>)[id];
      return typeof date === "string" &&
        (date === "" || (/^\d{4}-\d{2}-\d{2}T/.test(date) && Number.isFinite(Date.parse(date))))
        ? [[id, date]]
        : [];
    }),
  );
}
