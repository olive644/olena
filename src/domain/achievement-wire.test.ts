import { expect, it } from "vitest";
import { ALL_ACHIEVEMENTS } from "./math-achievements";
import {
  compactAchievementAction,
  decodeAchievements,
  encodeAchievements,
} from "./achievement-wire";
it("fits all 155 known IDs and precise dates inside the unchanged public request budget", () => {
  const ids = ALL_ACHIEVEMENTS.map(({ id }) => id);
  const dates = Object.fromEntries(
    ids.map((id, i) => [id, new Date(1793520000123 + i * 86400000).toISOString()]),
  );
  const action = {
    action: "share" as const,
    enabled: true,
    name: "Pessoa de teste",
    photoUrl: "/profile-avatars/olena.webp",
    achievements: ids,
    achievementDates: dates,
    achievementFavorites: ["english-part-0"],
  };
  expect(new TextEncoder().encode(JSON.stringify(action)).length).toBeGreaterThan(4096);
  const compressed = compactAchievementAction(action);
  expect(new TextEncoder().encode(JSON.stringify(compressed)).length).toBeLessThanOrEqual(4096);
  expect("achievementWire" in compressed).toBe(true);
  if (!("achievementWire" in compressed)) throw Error("Missing compact representation");
  expect(decodeAchievements(compressed.achievementWire)).toEqual({ ids, dates });
});
it("leaves small legacy actions unchanged and never invents missing dates", () => {
  const action = { action: "share" as const, enabled: true, achievements: ["english-correct-1"] };
  expect(compactAchievementAction(action)).toBe(action);
  expect(decodeAchievements(encodeAchievements(action.achievements, {}))).toEqual({
    ids: action.achievements,
    dates: {},
  });
});
it("rejects unknown tokens, duplicate IDs, unsafe dates, schema changes and oversize collections", () => {
  const good = encodeAchievements(["english-correct-1"], {});
  for (const value of [
    null,
    { ...good, v: 2 },
    { ...good, at: -1 },
    { ...good, at: Infinity },
    { ...good, items: [["unknown", null]] },
    { ...good, items: [...good.items, ...good.items] },
    { ...good, items: [[good.items[0]![0], -1]] },
    { ...good, items: [[good.items[0]![0], Number.MAX_SAFE_INTEGER]] },
    { ...good, other: true },
    { ...good, items: Array(ALL_ACHIEVEMENTS.length + 1).fill(good.items[0]) },
  ])
    expect(decodeAchievements(value)).toBeUndefined();
});
