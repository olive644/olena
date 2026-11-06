import {
  ALL_ACHIEVEMENTS,
  validAchievementIds,
  validAchievementDates,
} from "./math-achievements.js";
import type { SocialAction } from "./profile-social.js";

// Public catalog tokens only. Not an authentication hash or a secret identifier.
function code(id: string) {
  let value = 2166136261;
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619);
  return (value >>> 0).toString(36);
}
const known = new Map(ALL_ACHIEVEMENTS.map(({ id }) => [code(id), id]));
if (known.size !== ALL_ACHIEVEMENTS.length) throw Error("Achievement catalog token collision");
export type AchievementWire = { v: 1; at: number; items: [string, number | null][] };

export function encodeAchievements(
  ids: readonly string[],
  dates: Readonly<Record<string, string>>,
): AchievementWire {
  const times = ids.flatMap((id) => (dates[id] ? [Date.parse(dates[id]!)] : []));
  const at = times.length ? Math.min(...times) : 0;
  return {
    v: 1,
    at,
    items: ids.map((id) => [code(id), dates[id] ? Date.parse(dates[id]!) - at : null]),
  };
}
export function compactAchievementAction(action: SocialAction) {
  if (
    action.action !== "share" ||
    !action.achievements ||
    !validAchievementIds(action.achievements) ||
    !validAchievementDates(action.achievementDates ?? {}) ||
    new TextEncoder().encode(JSON.stringify(action)).length <= 4096
  )
    return action;
  const { achievements, achievementDates, ...rest } = action;
  return { ...rest, achievementWire: encodeAchievements(achievements, achievementDates ?? {}) };
}
export function decodeAchievements(
  value: unknown,
): { ids: string[]; dates: Record<string, string> } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const item = value as Record<string, unknown>;
  if (
    Object.keys(item).some((key) => !["v", "at", "items"].includes(key)) ||
    item["v"] !== 1 ||
    !Number.isSafeInteger(item["at"]) ||
    Number(item["at"]) < 0 ||
    Number(item["at"]) > 253402300799999 ||
    !Array.isArray(item["items"]) ||
    item["items"].length > ALL_ACHIEVEMENTS.length
  )
    return;
  const ids: string[] = [],
    dates: Record<string, string> = {};
  for (const pair of item["items"]) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string") return;
    const id = known.get(pair[0]);
    if (!id || ids.includes(id)) return;
    ids.push(id);
    if (pair[1] !== null) {
      if (!Number.isSafeInteger(pair[1]) || Number(pair[1]) < 0) return;
      const time = Number(item["at"]) + Number(pair[1]);
      if (!Number.isSafeInteger(time) || time > 253402300799999) return;
      dates[id] = new Date(time).toISOString();
    }
  }
  return validAchievementIds(ids) && validAchievementDates(dates) ? { ids, dates } : undefined;
}
