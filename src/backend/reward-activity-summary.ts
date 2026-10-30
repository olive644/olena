import { createHash } from "node:crypto";
import { activeArcanaId, isLegacyCard } from "../data/arcana-ids.js";
import { isMathCourse } from "../data/math-courses.js";
import { isAchievementId } from "../domain/math-achievements.js";
import type { SocialActivitySummary } from "../domain/profile-social.js";

const identity = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);
const object = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

// Teto explícito do ledger lido: o valor sincronizado já é limitado a 5 MB pelas regras e a
// 5000 baús aqui. Acima disso, ou diante de qualquer baú incoerente, não há eventos de carta:
// omitir é melhor do que anunciar como primeira uma cópia que talvez não seja a mais antiga.
const MAX_LEDGER_CHARS = 5_000_000;
const MAX_CHESTS = 5000;

// Cartas antigas aposentadas ocupam posição mas não geram evento (undefined).
function revealedCards(chest: Record<string, unknown>): (string | undefined)[] | undefined {
  if (chest["opened"] !== true) return undefined;
  let source: unknown[];
  if (chest["arcana"] !== undefined) {
    if (
      chest["kind"] !== "arcane" ||
      chest["cards"] !== undefined ||
      activeArcanaId(chest["arcana"]) !== "major-17"
    )
      return undefined;
    source = [chest["arcana"]];
  } else {
    const cards = chest["cards"];
    if (
      (chest["kind"] !== undefined && chest["kind"] !== "common") ||
      !Array.isArray(cards) ||
      cards.length < 1 ||
      cards.length > 2 ||
      !cards.every((card) => activeArcanaId(card) !== undefined || isLegacyCard(card))
    )
      return undefined;
    source = cards;
  }
  const revealed = chest["revealed"];
  if (
    typeof revealed !== "number" ||
    !Number.isInteger(revealed) ||
    revealed < 0 ||
    revealed > source.length
  )
    return undefined;
  return source.slice(0, revealed).map((card) => activeArcanaId(card));
}

// Primeira obtenção de cada carta no ledger da conta (helena.mathPlaceRewards.v1).
// Varre todos os baús, mantém a data mais antiga e usa o mesmo ID para cópias extras. Carta
// com qualquer cópia revelada sem data conhecida fica sem evento: a primeira pode ser essa.
export function cardActivities(raw: string | null, now: number): SocialActivitySummary[] {
  if (raw === null || raw.length > MAX_LEDGER_CHARS) return [];
  let ledger: Record<string, unknown> | undefined;
  try {
    ledger = object(JSON.parse(raw));
  } catch {
    return [];
  }
  if (!ledger) return [];
  const first = new Map<string, number>();
  const undated = new Set<string>();
  let count = 0;
  for (const [course, place] of Object.entries(ledger)) {
    const chests = object(place)?.["chests"];
    if (!isMathCourse(course) || !Array.isArray(chests)) continue;
    count += chests.length;
    if (count > MAX_CHESTS) return [];
    for (const entry of chests) {
      const chest = object(entry);
      const cards = chest && revealedCards(chest);
      if (!chest || !cards) {
        if (chest?.["opened"] === true) return [];
        continue;
      }
      const dates = chest["revealedAt"];
      cards.forEach((card, index) => {
        if (!card) return;
        const at: unknown = Array.isArray(dates) ? dates[index] : undefined;
        if (typeof at !== "number" || !Number.isSafeInteger(at) || at <= 0 || at > now) {
          undated.add(card);
          return;
        }
        const previous = first.get(card);
        if (previous === undefined || at < previous) first.set(card, at);
      });
    }
  }
  return [...first]
    .filter(([ref]) => !undated.has(ref))
    .map(([ref, at]) => ({
      id: identity(`card:${ref}`),
      kind: "card" as const,
      ref,
      value: 1,
      at,
    }));
}

// Conquistas já publicadas pela conta (mesma confiança do perfil), com data comprovada.
export function achievementActivities(
  achievements: Record<string, true> | undefined,
  dates: Record<string, string> | undefined,
  now: number,
): SocialActivitySummary[] {
  return Object.keys(achievements ?? {}).flatMap((ref) => {
    const at = Date.parse(dates?.[ref] ?? "");
    return isAchievementId(ref) && Number.isFinite(at) && at > 0 && at <= now
      ? [{ id: identity(`achievement:${ref}`), kind: "achievement" as const, ref, value: 1, at }]
      : [];
  });
}
