import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validEnglishCourse, englishQuestion } from "./english-journey";
import { englishDifficulty } from "../domain/english-difficulty";
it("authors a distinct bilingual explanation and a consistent grammar level for every situation", () => {
  const value: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
  expect(validEnglishCourse(value)).toBe(true);
  if (!validEnglishCourse(value)) throw Error("Invalid content");
  const explanations = new Set<string>();
  value.parts.forEach((part, at) =>
    part.teaching.forEach((step, scene) => {
      expect(step.level).toBe(englishDifficulty(at, scene * 4));
      expect(step.focus.length).toBeGreaterThan(1);
      expect(step.explanation["pt-BR"].length).toBeGreaterThan(25);
      expect(step.explanation["en-US"].length).toBeGreaterThan(25);
      explanations.add(step.explanation["pt-BR"]);
      expect(englishQuestion(value, at, scene * 4).explanation).toBe(step.explanation["pt-BR"]);
    }),
  );
  expect(explanations.size).toBe(180);
  expect(englishQuestion(value, 0, 4).explanation).toMatch(/pergunta o nome/i);
  expect(englishQuestion(value, 0, 88).explanation).toContain("pedido educado");
  expect(englishQuestion(value, 0, 112).explanation).toContain("compreensão");
});
