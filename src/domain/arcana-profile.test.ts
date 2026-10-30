import { expect, it } from "vitest";
import { effectiveCardFavorites } from "./arcana-profile";
it("preserva a Estrela histórica obtida antes de filtrar favoritas, sem conceder outras cartas", () => {
  const owned = new Set(["major-17", "major-00"]);
  expect(
    effectiveCardFavorites(["oliver-star-tarot", "major-17", "first-star", "cups-01"], owned, [
      ...owned,
    ]),
  ).toEqual(["major-17"]);
  expect(effectiveCardFavorites([], owned, [...owned])).toEqual([]);
  expect(effectiveCardFavorites(undefined, owned, [...owned])).toEqual(["major-17", "major-00"]);
  expect(effectiveCardFavorites(["oliver-star-tarot"], new Set(), [...owned])).toEqual([]);
});
