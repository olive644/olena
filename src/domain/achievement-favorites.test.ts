import { expect, it } from "vitest";
import { placeAchievementFavorite } from "./achievement-presentation";

it("encaixa uma conquista obtida, substitui o destino e reordena sem duplicar", () => {
  const earned = new Set(["a", "b", "c", "d"]);
  expect(placeAchievementFavorite(["a", "b", "c"], "d", 1, earned)).toEqual(["a", "d", "c"]);
  expect(placeAchievementFavorite(["a", "b", "c"], "a", 2, earned)).toEqual(["b", "c", "a"]);
  expect(placeAchievementFavorite([], "a", 2, earned)).toEqual(["a"]);
  expect(placeAchievementFavorite(["a"], "locked", 0, earned)).toEqual(["a"]);
});
