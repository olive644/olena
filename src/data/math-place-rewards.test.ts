import { beforeEach, expect, it } from "vitest";
import {
  chestCards,
  parseMathRewards,
  finishMathPlace,
  mathPlaceRewards,
  unlockMathChest,
  openMathChest,
  MATH_PLACE_REWARDS_KEY,
  revealMathCard,
  oliverCollection,
} from "./math-place-rewards";
beforeEach(() => localStorage.removeItem(MATH_PLACE_REWARDS_KEY));
it("stores totals separately, grants one chest at 100 points and deduplicates rounds", () => {
  finishMathPlace("foundations", "one", 99, () => 0.5);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(0);
  finishMathPlace("foundations", "two", 100, () => 0.5);
  finishMathPlace("foundations", "two", 100, () => 0.5);
  expect(mathPlaceRewards("foundations").points).toBe(199);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(1);
  expect(mathPlaceRewards("school").points).toBe(0);
});
it("draws arcana at five percent, shares slots and persists one tarot without rerolls", () => {
  const rare = finishMathPlace("school", "arcane", 100, () => 0.049999);
  expect(rare.chests[0]?.kind).toBe("arcane");
  finishMathPlace("school", "arcane", 100, () => {
    throw new Error("duplicate roll");
  });
  finishMathPlace("school", "boundary", 100, () => 0.05);
  expect(mathPlaceRewards("school").chests[1]?.kind).toBeUndefined();
  unlockMathChest("school", "arcane", 0);
  openMathChest("school", "arcane", 59999);
  expect(mathPlaceRewards("school").chests[0]?.opened).toBe(false);
  openMathChest("school", "arcane", 60000, () => {
    throw new Error("tarot needs no common roll");
  });
  expect(chestCards(mathPlaceRewards("school").chests[0]!)).toEqual(["oliver-star-tarot"]);
  expect(oliverCollection()["oliver-star-tarot"]).toBeUndefined();
  revealMathCard("school", "arcane");
  revealMathCard("school", "arcane");
  expect(oliverCollection()["oliver-star-tarot"]).toBe(1);
  expect(parseMathRewards(localStorage.getItem(MATH_PLACE_REWARDS_KEY)!)).toEqual({
    school: mathPlaceRewards("school"),
  });
});
it("caps outstanding chests at three without losing points, including unrevealed cards", () => {
  for (let index = 0; index < 4; index++)
    finishMathPlace("foundations", `round-${index}`, 100, () => 0.5);
  expect(mathPlaceRewards("foundations").points).toBe(400);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(3);
  unlockMathChest("foundations", "round-0", 0);
  openMathChest("foundations", "round-0", 60000, () => 0);
  finishMathPlace("foundations", "fifth", 100, () => 0.5);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(3);
  revealMathCard("foundations", "round-0");
  finishMathPlace("foundations", "sixth", 100, () => 0.5);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(4);
});
it("persists loot before revealing, resumes a partial booster and never rerolls", () => {
  finishMathPlace("foundations", "one", 100, () => 0.5);
  unlockMathChest("foundations", "one", 0);
  const rolls = [0.9, 0, 0];
  openMathChest("foundations", "one", 60000, () => rolls.shift()!);
  expect(oliverCollection()).toEqual({});
  revealMathCard("foundations", "one");
  expect(oliverCollection()).toEqual({ "first-star": 1 });
  openMathChest("foundations", "one", 60001, () => {
    throw new Error("must not reroll");
  });
  expect(mathPlaceRewards("foundations").chests[0]!.revealed).toBe(1);
  revealMathCard("foundations", "one");
  revealMathCard("foundations", "one");
  expect(oliverCollection()).toEqual({ "first-star": 2 });
  expect(mathPlaceRewards("foundations").chests[0]!.cards).toEqual(["first-star", "first-star"]);
});
it("preserves legacy totals and already opened chests without retroactive cards", () => {
  localStorage.setItem(
    MATH_PLACE_REWARDS_KEY,
    JSON.stringify({
      foundations: {
        points: 123,
        receipts: ["old"],
        chests: [{ id: "old", opened: true, unlockAt: 0 }],
      },
    }),
  );
  expect(mathPlaceRewards("foundations").points).toBe(123);
  openMathChest("foundations", "old", 99999, () => {
    throw new Error("legacy reroll");
  });
  expect(oliverCollection()).toEqual({});
});
it("persists the minute and never opens early or restarts an unlock", () => {
  finishMathPlace("foundations", "one", 150, () => 0.5);
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
  expect(() => finishMathPlace("foundations", "one", -1, () => 0.5)).toThrow();
  localStorage.setItem(
    MATH_PLACE_REWARDS_KEY,
    JSON.stringify({ foundations: { points: -1, receipts: [], chests: [] } }),
  );
  expect(mathPlaceRewards("foundations").points).toBe(0);
});
it("preserves arcane metadata from an older opener without crediting common loot", () => {
  const oldDevice = {
    foundations: {
      points: 100,
      receipts: ["old-arcane"],
      chests: [
        {
          id: "old-arcane",
          kind: "arcane",
          arcana: "oliver-star-tarot",
          opened: true,
          unlockAt: 60000,
          cards: ["first-star", "first-star"],
          revealed: 2,
        },
      ],
    },
  };
  const serialized = JSON.stringify(oldDevice);
  expect(parseMathRewards(serialized)).toEqual(oldDevice);
  localStorage.setItem(MATH_PLACE_REWARDS_KEY, serialized);
  expect(oliverCollection()).toEqual({ "oliver-star-tarot": 1 });
  const invalid = structuredClone(oldDevice);
  invalid.foundations.chests[0]!.arcana = "unknown-arcana";
  expect(parseMathRewards(JSON.stringify(invalid))).toEqual({});
});
it("does not roll a rare chest when shared slots are full", () => {
  for (let index = 0; index < 3; index++)
    finishMathPlace("foundations", String(index), 100, () => 0);
  finishMathPlace("foundations", "full", 100, () => {
    throw new Error("no available slot");
  });
  expect(mathPlaceRewards("foundations").chests).toHaveLength(3);
  expect(mathPlaceRewards("foundations").points).toBe(400);
});
