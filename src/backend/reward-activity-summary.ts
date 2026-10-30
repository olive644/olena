import { createHash } from "node:crypto";
import { activeArcanaId } from "../data/arcana-ids.js";
import { isMathCourse } from "../data/math-courses.js";
import { isAchievementId } from "../domain/math-achievements.js";
import type { SocialActivitySummary } from "../domain/profile-social.js";

const identity = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);
const object = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

// Primeira obtenção de cada carta no ledger da conta (helena.mathPlaceRewards.v1).
// Só entra carta revelada com data comprovada; cópias extras mantêm a data mais antiga e o
// mesmo ID, então nunca geram um segundo evento. Nada de texto livre, título ou UID.
export function cardActivities(raw: string | null, now: number): SocialActivitySummary[] {
  let ledger: Record<string, unknown> | undefined;
  try {
    ledger = object(JSON.parse(raw ?? "null"));
  } catch {
    return [];
  }
  if (!ledger) return [];
  const first = new Map<string, number>();
  for (const [course, place] of Object.entries(ledger)) {
    const chests = object(place)?.["chests"];
    if (!isMathCourse(course) || !Array.isArray(chests)) continue;
    for (const entry of chests.slice(-1000)) {
      const chest = object(entry);
      if (!chest || chest["opened"] !== true) continue;
      const revealed = chest["revealed"];
      const dates = chest["revealedAt"];
      const source =
        typeof chest["arcana"] === "string"
          ? [chest["arcana"]]
          : Array.isArray(chest["cards"])
            ? chest["cards"].slice(0, 2)
            : [];
      if (!Number.isInteger(revealed) || !Array.isArray(dates)) continue;
      source.slice(0, Number(revealed)).forEach((card, index) => {
        const id = activeArcanaId(card);
        const at: unknown = dates[index];
        if (!id || typeof at !== "number" || !Number.isSafeInteger(at) || at <= 0 || at > now)
          return;
        const previous = first.get(id);
        if (previous === undefined || at < previous) first.set(id, at);
      });
    }
  }
  return [...first].map(([ref, at]) => ({
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
