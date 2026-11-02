export const ENGLISH_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];
export function isEnglishLevel(value: unknown): value is EnglishLevel {
  return ENGLISH_LEVELS.some((level) => level === value);
}
export type EnglishRewardCourse = `english-${EnglishLevel}`;
export function englishRewardCourse(level: EnglishLevel): EnglishRewardCourse {
  return `english-${level}`;
}
export function isEnglishRewardCourse(value: unknown): value is EnglishRewardCourse {
  return (
    typeof value === "string" && value.startsWith("english-") && isEnglishLevel(value.slice(8))
  );
}
