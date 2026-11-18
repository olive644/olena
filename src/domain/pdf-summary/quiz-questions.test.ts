import { describe, expect, it } from "vitest";
import { quizQuestionsFromDocument } from "./index";
import { structureText } from "./layout";
import {
  computingHistory,
  fixtureAsText,
  photosynthesis,
  statesOfMatter,
} from "./fixtures.test-data";
import { stripAccents } from "./portuguese";

const squash = (text: string) =>
  stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const questionsOf = (
  fixture: typeof computingHistory,
  difficulty: "easy" | "medium" | "hard",
  n = 15,
) => quizQuestionsFromDocument(structureText(fixtureAsText(fixture), fixture.title), difficulty, n);

describe("quiz de verdade a partir de texto", () => {
  it("toda pergunta tem 4 alternativas diferentes, uma resposta válida e a frase como explicação", async () => {
    for (const fixture of [computingHistory, photosynthesis, statesOfMatter]) {
      const source = squash(fixtureAsText(fixture));
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        const questions = await questionsOf(fixture, difficulty);
        expect(questions.length).toBeGreaterThan(0);
        for (const question of questions) {
          expect(question.options).toHaveLength(4);
          expect(new Set(question.options.map(squash)).size).toBe(4);
          expect(question.answer).toBeGreaterThanOrEqual(0);
          expect(question.answer).toBeLessThan(4);
          expect(question.prompt.length).toBeGreaterThan(15);
          const explanation = question.explanation.replace(/^O texto diz: /, "");
          expect(source).toContain(squash(explanation));
        }
        expect(new Set(questions.map((question) => squash(question.prompt))).size).toBe(
          questions.length,
        );
      }
    }
  });

  it("a alternativa certa de 'de acordo' está no texto e a de 'NÃO de acordo' não está", async () => {
    const source = squash(fixtureAsText(computingHistory));
    const questions = await questionsOf(computingHistory, "medium");
    const agree = questions.filter((q) => q.prompt.startsWith("Qual das afirmações está de acordo"));
    const disagree = questions.filter((q) => q.prompt.includes("NÃO está de acordo"));
    expect(agree.length + disagree.length).toBeGreaterThan(0);
    for (const question of agree) {
      expect(source).toContain(squash(question.options[question.answer]!));
      const wrong = question.options.filter((_, index) => index !== question.answer);
      for (const option of wrong) expect(source).not.toContain(squash(option));
    }
    for (const question of disagree) {
      expect(source).not.toContain(squash(question.options[question.answer]!));
      const trues = question.options.filter((_, index) => index !== question.answer);
      for (const option of trues) expect(source).toContain(squash(option));
    }
  });

  it("perguntas de ano trazem anos de verdade e nunca repetem o ano da frase", async () => {
    const questions = await questionsOf(computingHistory, "medium");
    const years = questions.filter((q) => q.prompt.startsWith("Qual ano completa"));
    expect(years.length).toBeGreaterThan(0);
    for (const question of years) {
      expect(question.prompt).toContain("_____");
      for (const option of question.options) expect(option).toMatch(/^\d{4}$/);
      const sentence = question.explanation;
      const correct = question.options[question.answer]!;
      expect(sentence).toContain(correct);
      for (const option of question.options)
        if (option !== correct) expect(sentence).not.toContain(option);
    }
  });

  it("perguntas de valor mantêm a casa decimal e a ordem de grandeza", async () => {
    const questions = await questionsOf(computingHistory, "hard");
    const values = questions.filter((q) => q.prompt.startsWith("Qual valor completa"));
    for (const question of values) {
      const nums = question.options.map((option) =>
        Number(option.replace(/\./g, "").replace(",", ".")),
      );
      expect(nums.every(Number.isFinite)).toBe(true);
      const correct = nums[question.answer]!;
      for (const value of nums) expect(value / correct).toBeLessThan(5);
    }
  });

  it("a resposta certa não fica sempre na mesma posição", async () => {
    const questions = await questionsOf(computingHistory, "medium");
    expect(new Set(questions.map((question) => question.answer)).size).toBeGreaterThan(1);
  });

  it("texto sem fatos suficientes devolve poucas perguntas em vez de inventar", async () => {
    const few = await quizQuestionsFromDocument(
      structureText("Hoje é um dia de sol.", "curto"),
      "medium",
      10,
    );
    expect(few).toEqual([]);
  });
});
