export type ArcanaId =
  | `major-${string}`
  | `wands-${string}`
  | `cups-${string}`
  | `swords-${string}`
  | `pentacles-${string}`;
export const ARCANA_IDS: ArcanaId[] = ["major", "wands", "cups", "swords", "pentacles"].flatMap(
  (group) =>
    Array.from(
      { length: group === "major" ? 22 : 14 },
      (_, i) => `${group}-${String(i + (group === "major" ? 0 : 1)).padStart(2, "0")}` as ArcanaId,
    ),
);
export function isArcanaId(value: unknown): value is ArcanaId {
  return typeof value === "string" && ARCANA_IDS.includes(value as ArcanaId);
}
export const LEGACY_CARDS = [
  "first-star",
  "silent-bell",
  "chalk-map",
  "split-compass",
  "third-bridge",
  "glass-seed",
  "long-night",
  "river-memory",
  "last-note",
  "homeward",
] as const;
export type LegacyCardId = (typeof LEGACY_CARDS)[number];
export function isLegacyCard(value: unknown): value is LegacyCardId {
  return typeof value === "string" && LEGACY_CARDS.some((id) => id === value);
}
export function activeArcanaId(value: unknown): ArcanaId | undefined {
  return value === "oliver-star-tarot" ? "major-17" : isArcanaId(value) ? value : undefined;
}
