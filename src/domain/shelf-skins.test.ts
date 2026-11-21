import { expect, it } from "vitest";
import { shelfSkinUnlocked, shelfSkinRequirement } from "./shelf-skins";
it("keeps celestial, pride and classic skins free for every shelf item", () => {
  for (const kind of ["folder", "typewriter", "notebook"] as const)
    for (const style of ["classic", "pride", "blood-moon", "solar-eclipse", "lunar-eclipse"]) {
      expect(shelfSkinUnlocked(kind, style, new Set())).toBe(true);
      expect(shelfSkinRequirement(kind, style)).toBe("");
    }
});
it("requires distinct easy subject goals and preserves previous unlocks", () => {
  for (const [kind, math, english] of [
    ["folder", "rounds-1", "english-correct-1"],
    ["typewriter", "correct-10", "english-correct-5"],
    ["notebook", "stages-1", "english-correct-10"],
  ] as const) {
    expect(shelfSkinUnlocked(kind, "mathematics", new Set())).toBe(false);
    expect(shelfSkinUnlocked(kind, "english", new Set())).toBe(false);
    expect(shelfSkinUnlocked(kind, "mathematics", new Set([math]))).toBe(true);
    expect(shelfSkinUnlocked(kind, "english", new Set([english]))).toBe(true);
    expect(shelfSkinUnlocked(kind, "mathematics", new Set(["correct-100"]))).toBe(true);
    expect(shelfSkinUnlocked(kind, "english", new Set(["english-correct-100"]))).toBe(true);
  }
});
