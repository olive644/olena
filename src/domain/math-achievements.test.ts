import { expect, it } from "vitest";
import { MATH_ACHIEVEMENTS, mathAchievements, validAchievementIds } from "./math-achievements";
import { upgradeMasteryProgress } from "./math-mastery-progress";

it("oferece 57 objetivos únicos de matemática, com três raridades", () => {
  expect(MATH_ACHIEVEMENTS).toHaveLength(57);
  expect(new Set(MATH_ACHIEVEMENTS.map((item) => item.id)).size).toBe(57);
  expect(new Set(MATH_ACHIEVEMENTS.map((item) => item.rarity)).size).toBe(3);
  expect(mathAchievements({}).some((item) => item.earned)).toBe(false);
});
it("conta uma rodada por recibo, sem duplicar respostas e sem contar outras matérias", () => {
  const activity = {
    id: "math:foundations:uuid:1:1",
    islandId: "mathematics:foundations",
    islandName: "Matemática",
    completedAt: "2026-10-22T12:00:00Z",
    answers: 1,
    correct: 1,
  };
  const result = mathAchievements({}, [
    activity,
    activity,
    { ...activity, id: "math:foundations:uuid:2:2" },
    { ...activity, id: "english", islandId: "english" },
  ]);
  expect(result.find((item) => item.id === "rounds-1")?.earned).toBe(true);
  expect(result.find((item) => item.id === "rounds-5")?.value).toBe(1);
  expect(result.find((item) => item.id === "correct-10")?.value).toBe(2);
});
it("reconhece conquistas históricas e só conclui a ilha após seis confirmações", () => {
  const p = { ...upgradeMasteryProgress(), correct: 110, confirmed: 31 };
  expect(mathAchievements({ foundations: p }).find((item) => item.id === "islands-1")?.earned).toBe(
    false,
  );
  const result = mathAchievements({ foundations: { ...p, confirmed: 63 } });
  expect(result.find((item) => item.id === "foundations-stages-6")?.earned).toBe(true);
  expect(result.find((item) => item.id === "correct-100")?.earned).toBe(true);
});
it("recusa identificadores desconhecidos, duplicados e saldos externos", () => {
  expect(validAchievementIds(["correct-1"])).toBe(true);
  expect(validAchievementIds(["premium"])).toBe(false);
  expect(validAchievementIds(["correct-1", "correct-1"])).toBe(false);
  expect(validAchievementIds({ "correct-1": true })).toBe(false);
});
