import { expect, it } from "vitest";
import { englishCosmeticGoals } from "./english-cosmetics";
import { englishProgress } from "./language-progress";
import { cosmeticUnlocked, profileBackground, profileFrame } from "./profile-cosmetics";
import { profileCover } from "./profile-covers";

it("unlocks English cosmetics independently from Mathematics", () => {
  const math = new Set(["islands-1", "correct-100"]);
  for (const kind of ["frame", "cover", "background"] as const) {
    expect(cosmeticUnlocked(kind, "mathematics", math)).toBe(true);
    expect(cosmeticUnlocked(kind, "english", math)).toBe(false);
  }
  const english = new Set(["english-parts-8", "english-correct-100"]);
  for (const kind of ["frame", "cover", "background"] as const) {
    expect(cosmeticUnlocked(kind, "english", english)).toBe(true);
    expect(cosmeticUnlocked(kind, "mathematics", english)).toBe(false);
  }
});

it("preserves unlocks from the account ledger without retained activities", () => {
  const solved = Array.from({ length: 100 }, (_, index) => index);
  const partial = englishProgress([], "english", {
    english: [{ solved, confirmed: true }],
  });
  const earned = new Set(englishCosmeticGoals(partial));
  expect(cosmeticUnlocked("cover", "english", earned)).toBe(true);
  expect(cosmeticUnlocked("background", "english", earned)).toBe(true);
  expect(cosmeticUnlocked("frame", "english", earned)).toBe(false);
  const complete = englishProgress([], "english", {
    english: Array.from({ length: 8 }, () => ({ solved, confirmed: true })),
  });
  expect(cosmeticUnlocked("frame", "english", new Set(englishCosmeticGoals(complete)))).toBe(true);
});

it("keeps cosmetics locked below 100 correct answers and accepts known cosmetic IDs", () => {
  expect(englishCosmeticGoals(englishProgress())).toEqual([]);
  expect(
    englishCosmeticGoals(
      englishProgress([], "english", {
        english: [{ solved: Array.from({ length: 99 }, (_, index) => index), confirmed: false }],
      }),
    ),
  ).toEqual(["english-correct-1", "english-correct-5", "english-correct-10"]);
  // As placas de 1, 5 e 10 acertos não liberam capa, fundo nem moldura: só 100 e as 8 partes.
  const goals = englishCosmeticGoals(
    englishProgress([], "english", {
      english: [{ solved: Array.from({ length: 99 }, (_, index) => index), confirmed: false }],
    }),
  );
  expect(goals).not.toContain("english-correct-100");
  for (const kind of ["frame", "cover", "background"] as const)
    expect(cosmeticUnlocked(kind, "english", new Set(goals))).toBe(false);
  expect(profileFrame("english")).toBe("english");
  expect(profileCover("english")).toBe("english");
  expect(profileBackground("english")).toBe("english");
  expect(profileFrame("unknown")).toBe("none");
  expect(profileBackground("unknown")).toBe("paper");
});
