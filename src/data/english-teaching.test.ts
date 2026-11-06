import { nextEnglishQuestion, validEnglishSelection } from "../domain/english-adaptive";
import { validLanguageAttempt } from "../domain/language-progress";
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
  expect(explanations.size).toBe(286);
  expect(englishQuestion(value, 0, 4).explanation).toMatch(/pergunta o nome/i);
  expect(englishQuestion(value, 0, 88).explanation).toContain("pedido educado");
  expect(englishQuestion(value, 0, 112).explanation).toContain("compreensão");
});

it("selects and credits added questions only in the two expanded parts", () => {
  for (const [part, lastId] of [
    [1, 175],
    [2, 175],
    [3, 175],
    [4, 175],
  ] as const) {
    const input = {
      part,
      solved: [],
      recent: [],
      exclude: Array.from({ length: lastId }, (_, id) => id),
    };
    expect(validEnglishSelection(input)).toBe(true);
    expect(nextEnglishQuestion(input).id).toBe(lastId);
    const attempt = {
      curriculum: 4,
      area: "english",
      part,
      mode: "practice",
      questions: [lastId],
      correctQuestions: [lastId],
    };
    expect(validLanguageAttempt(attempt)).toBe(true);
    expect(validLanguageAttempt({ ...attempt, part: 5 })).toBe(false);
    expect(
      validLanguageAttempt({ ...attempt, questions: [lastId + 1], correctQuestions: [lastId + 1] }),
    ).toBe(false);
  }
});

it("offers distinct interpretation choices in both interface languages for B1 and C1", async () => {
  const { installUiCatalog, changeLanguage } = await import("../i18n/runtime");
  const value: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
  if (!validEnglishCourse(value)) throw Error("Invalid content");
  for (const locale of ["pt-BR", "en-US"] as const)
    installUiCatalog(
      locale,
      JSON.parse(readFileSync("public/locales/" + locale + ".json", "utf8")),
    );
  try {
    for (const locale of ["pt-BR", "en-US"] as const) {
      await changeLanguage(locale);
      for (const part of [6, 7]) {
        for (let id = 0; id < 100; id++) {
          const question = englishQuestion(value, part, id);
          expect(new Set(question.options).size).toBe(3);
          expect(question.options).toContain(question.answer);
          if (question.kind === "meaning") expect(question.answer).not.toBe(question.phrase);
        }
      }
    }
  } finally {
    await changeLanguage("pt-BR");
  }
});
