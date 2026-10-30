import { ARCANA_IDS, activeArcanaId } from "../data/arcana-ids.js";

// Metadados públicos do baralho: somente IDs do catálogo, datas ISO e até três favoritas.
const KNOWN = new Set<string>(ARCANA_IDS);
export const isPublicCardId = (value: unknown): value is string =>
  typeof value === "string" && KNOWN.has(value);
export function validCardIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= KNOWN.size &&
    value.every(isPublicCardId) &&
    new Set(value).size === value.length
  );
}
export function validCardFavorites(value: unknown): value is string[] {
  return validCardIds(value) && value.length <= 3;
}
export function validCardDates(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).length <= KNOWN.size &&
    Object.entries(value).every(
      ([id, date]) =>
        isPublicCardId(id) &&
        typeof date === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(date) &&
        Number.isFinite(Date.parse(date)),
    )
  );
}
// Lista ausente sugere as três primeiras obtidas; lista [] foi removida de propósito e fica vazia.
export function effectiveFavorites(
  stored: readonly string[] | undefined,
  owned: ReadonlySet<string>,
  suggestion: readonly string[],
) {
  return (stored ?? suggestion.filter((id) => owned.has(id)))
    .filter((id, index, all) => owned.has(id) && all.indexOf(id) === index)
    .slice(0, 3);
}
export function effectiveCardFavorites(
  stored: readonly string[] | undefined,
  owned: ReadonlySet<string>,
  suggestion: readonly string[],
) {
  return effectiveFavorites(
    stored?.flatMap((id) => activeArcanaId(id) ?? []),
    owned,
    suggestion,
  );
}
