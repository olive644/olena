import { expect, it } from "vitest";
import { drawOliverCards, OLIVER_CARDS } from "./oliver-cards";
it("has ten unique common cards with positive stats and weights totaling 100", () => {
  expect(new Set(OLIVER_CARDS.map((card) => card.id)).size).toBe(10);
  expect(OLIVER_CARDS.reduce((sum, card) => sum + card.chance, 0)).toBe(100);
  for (const card of OLIVER_CARDS) {
    expect(card.power).toBeGreaterThan(0);
    expect(card.life).toBeGreaterThan(0);
    expect(card.stamina).toBeGreaterThan(0);
    expect(card.lore.length).toBeGreaterThan(60);
  }
});
it("draws one at 80 percent and at most two, allowing counted duplicates", () => {
  expect(drawOliverCards(() => 0)).toEqual(["first-star"]);
  const rolls = [0.8, 0, 0];
  expect(drawOliverCards(() => rolls.shift()!)).toEqual(["first-star", "first-star"]);
  expect(drawOliverCards(() => 0.999999)).toEqual(["homeward", "homeward"]);
});
it("matches every weighted interval without making any card unreachable", () => {
  let weight = 0;
  for (const card of OLIVER_CARDS) {
    const rolls = [0, (weight + card.chance / 2) / 100];
    expect(drawOliverCards(() => rolls.shift()!)).toEqual([card.id]);
    weight += card.chance;
  }
});
it("rejects invalid random values", () => {
  for (const value of [-1, 1, NaN, Infinity]) expect(() => drawOliverCards(() => value)).toThrow();
});
