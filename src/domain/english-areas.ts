// One language island, with six internal parts.
export const ENGLISH_AREAS = ["english"] as const;
export type EnglishArea = (typeof ENGLISH_AREAS)[number];
export function isEnglishArea(value: unknown): value is EnglishArea {
  return value === "english";
}
export type EnglishAreaReward = "english-english";
export function englishAreaReward(area: EnglishArea): EnglishAreaReward {
  return `english-${area}`;
}
export function isEnglishAreaReward(value: unknown): value is EnglishAreaReward {
  return value === "english-english";
}
