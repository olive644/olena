import { expect, it } from "vitest";
import { COSMIC_RARITIES, oliverRarity } from "./oliver-rarity";
it("keeps the Star distinguished and separates majors and minors", () => {
  expect(COSMIC_RARITIES).toHaveLength(4);
  expect(oliverRarity("oliver-star-tarot")).toBe(3);
  expect(oliverRarity("major-17")).toBe(3);
  expect(oliverRarity("major-00")).toBe(2);
  expect(oliverRarity("cups-01")).toBe(0);
});
