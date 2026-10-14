import { expect, it } from "vitest";
import { COSMIC_RARITIES, oliverRarity } from "./oliver-rarity";
import { OLIVER_CARDS } from "./oliver-cards";

it("uses one saved card identity for rarity, including legacy tarot", () => {
  expect(OLIVER_CARDS.map((card) => oliverRarity(card.id))).toEqual([0, 0, 0, 0, 1, 1, 1, 2, 2, 2]);
  expect(oliverRarity("oliver-star-tarot")).toBe(3);
});
it("keeps cream rarity labels readable against every semantic backdrop", () => {
  const luminance = (hex: string) => {
    const channels = hex
      .slice(1)
      .match(/../g)!
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  };
  for (const rarity of COSMIC_RARITIES)
    expect((luminance("#fff9ef") + 0.05) / (luminance(rarity.shade) + 0.05)).toBeGreaterThanOrEqual(
      4.5,
    );
});
