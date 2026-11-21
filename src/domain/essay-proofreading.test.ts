import { readFileSync } from "node:fs";
import { createHunspellFromStrings, type Hunspell } from "hunspell-wasm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyEssaySuggestion, reviewEssaySpelling } from "./essay-proofreading";

let spell: Hunspell;
beforeAll(async () => {
  spell = await createHunspellFromStrings(
    readFileSync("node_modules/dictionary-pt/index.aff", "utf8"),
    readFileSync("node_modules/dictionary-pt/index.dic", "utf8"),
  );
});
afterAll(() => spell?.dispose());
const dictionary = {
  correct: (word: string) => spell.testSpelling(word),
  suggest: (word: string) => spell.getSpellingSuggestions(word),
};
describe("Brazilian Portuguese essay spelling", () => {
  it("recognizes Portuguese accents and suggests a correction using the actual dictionary", () => {
    const result = reviewEssaySpelling("A educasão brasileira precisa melhorar.", dictionary);
    expect(result.issues.map((issue) => issue.word)).toEqual(["educasão"]);
    expect(result.issues[0]?.suggestions).toContain("educação");
  });
  it("keeps UTF-16 offsets with emojis and decomposed accents", () => {
    const text = "📚 A educasão e a educação sa\u0303o importantes.";
    const result = reviewEssaySpelling(text, dictionary);
    const issue = result.issues[0]!;
    expect(text.slice(issue.start, issue.end)).toBe("educasão");
    expect(applyEssaySuggestion(text, text, issue, "educação")).toBe(
      text.replace("educasão", "educação"),
    );
    expect(result.issues).toHaveLength(1);
  });
  it("rejects outdated revisions and substitutions not offered by the checker", () => {
    const text = "educasão";
    const issue = reviewEssaySpelling(text, dictionary).issues[0]!;
    expect(applyEssaySuggestion(text + ".", text, issue, "educação")).toBeNull();
    expect(applyEssaySuggestion(text, text, issue, "qualquer coisa")).toBeNull();
  });
  it("preserves individual occurrences and bounds results", () => {
    const result = reviewEssaySpelling("educasão ".repeat(32), dictionary);
    expect(result.issues).toHaveLength(30);
    expect(result.limited).toBe(true);
    expect(result.issues[1]?.start).toBe(9);
    expect(() => reviewEssaySpelling("a".repeat(6001), dictionary)).toThrow();
  });
  it("does not inspect emails or web addresses", () => {
    expect(
      reviewEssaySpelling("https://exemplo.com/educasão contato@educasão.com", dictionary).issues,
    ).toHaveLength(0);
  });
  it("prioritizes the valid stem-preserving plural and removes unrelated alternatives", () => {
    const issue = reviewEssaySpelling("Todos os cidadões têm direitos.", dictionary).issues[0]!;
    expect(issue.suggestions).toEqual(["cidadãos"]);
    expect(reviewEssaySpelling("A educasão importa.", dictionary).issues[0]?.suggestions).toEqual([
      "educação",
    ]);
  });
});
