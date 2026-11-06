export const LEGACY_ENGLISH_PART_COUNT = 6;
export const ENGLISH_PART_ORDER = [0, 1, 2, 3, 6, 4, 7, 5] as const;
export const ENGLISH_PART_COUNT = ENGLISH_PART_ORDER.length;

export function englishPartUnlocked(parts: readonly { confirmed: boolean }[], part: number) {
  if (part === 0) return true;
  // Existing gates retain the six historical IDs and their unlocks.
  const previous = part === 6 ? 3 : part === 7 ? 4 : part - 1;
  return Boolean(parts[previous]?.confirmed || parts[part]?.confirmed);
}
