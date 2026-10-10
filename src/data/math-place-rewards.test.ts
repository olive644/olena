import { beforeEach, expect, it } from "vitest";
import {
  finishMathPlace,
  mathPlaceRewards,
  unlockMathChest,
  openMathChest,
  MATH_PLACE_REWARDS_KEY,
} from "./math-place-rewards";
beforeEach(() => localStorage.removeItem(MATH_PLACE_REWARDS_KEY));
it("stores totals separately, grants one chest at 100 points and deduplicates rounds", () => {
  finishMathPlace("foundations", "one", 99);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(0);
  finishMathPlace("foundations", "two", 100);
  finishMathPlace("foundations", "two", 100);
  expect(mathPlaceRewards("foundations").points).toBe(199);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(1);
  expect(mathPlaceRewards("school").points).toBe(0);
});
it("persists the minute and never opens early or restarts an unlock", () => {
  finishMathPlace("foundations", "one", 150);
  unlockMathChest("foundations", "one", 1000);
  unlockMathChest("foundations", "one", 10000);
  expect(mathPlaceRewards("foundations").chests[0]!.unlockAt).toBe(61000);
  openMathChest("foundations", "one", 60999);
  expect(mathPlaceRewards("foundations").chests[0]!.opened).toBe(false);
  openMathChest("foundations", "one", 61000);
  expect(mathPlaceRewards("foundations").chests[0]!.opened).toBe(true);
  expect(mathPlaceRewards("foundations").points).toBe(150);
});
it("does not overwrite malformed records with unsafe values", () => {
  expect(() => finishMathPlace("foundations", "one", -1)).toThrow();
  localStorage.setItem(
    MATH_PLACE_REWARDS_KEY,
    JSON.stringify({ foundations: { points: -1, receipts: [], chests: [] } }),
  );
  expect(mathPlaceRewards("foundations").points).toBe(0);
});
