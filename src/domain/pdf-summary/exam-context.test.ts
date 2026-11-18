import { describe, expect, it } from "vitest";
import { applyAnswerKey, parseExam } from "./exam";
import { examFlashcards, examQuizQuestions } from "./exam-study";
import type { StructuredDocument } from "./types";

const doc = (lines: string[]): StructuredDocument => ({
  title: "x",
  language: "pt",
  pages: 1,
  blocks: [],
  characters: 0,
  lines: lines.map((text) => ({ text, page: 1 })),
});

const LONG = "O costume de numerar as casas começou nas cidades europeias. ".repeat(12);

const exam = applyAnswerKey(
  parseExam(
    doc([
      "Atenção: As questões de números 1 a 2 baseiam-se no texto",
      LONG,
      "1. De acordo com o texto, o costume de numerar as casas",
      "(A) segue sempre o mesmo princípio.",
      "(B) começou na Europa e hoje varia.",
      "(C) partiu da necessidade de identificar prédios.",
      "(D) surgiu há pouco tempo.",
      "2. Segundo o texto, qual foi a origem do costume de numerar as casas?",
      "(A) Nas cidades europeias.",
      "(B) Nas cidades asiáticas.",
      "(C) Nas aldeias africanas.",
      "(D) Nas ilhas do Pacífico.",
      "3. Um funcionário deve sempre atender o público com",
      "(A) cortesia e educação.",
      "(B) pressa e rispidez.",
      "(C) alegria e dedicação.",
      "(D) silêncio e distância.",
      "4. Assinale a alternativa correta sobre o atendimento ao público.",
      "(A) O atendimento deve ser educado.",
      "(B) O atendimento deve ser ríspido.",
      "(C) O atendimento deve ser lento.",
      "(D) O atendimento deve ser ausente.",
    ]),
  ),
  { 1: 1, 2: 0, 3: 0, 4: 0 },
);

describe("prova com texto-base", () => {
  it("o quiz e o simulado trazem o texto-base num parágrafo antes do enunciado", () => {
    const questions = examQuizQuestions(exam);
    expect(questions).toHaveLength(4);
    expect(questions[0]!.prompt.startsWith("O costume de numerar as casas")).toBe(true);
    expect(questions[0]!.prompt.split("\n\n")).toHaveLength(2);
    expect(questions[0]!.prompt.endsWith("o costume de numerar as casas")).toBe(true);
    expect(questions[2]!.prompt).toBe("Um funcionário deve sempre atender o público com");
  });

  it("os flashcards deixam de fora as questões cujo texto-base não cabe no cartão", () => {
    const cards = examFlashcards(exam);
    // questões 3 e 4 (sem texto-base): 2 cartões cada; as 1 e 2 dependem do texto longo
    expect(cards).toHaveLength(4);
    expect(cards.every((card) => !card.front.includes("O costume de numerar"))).toBe(true);
  });

  it("enunciado que fica no meio da frase se completa com a alternativa", () => {
    const [truth, lie] = examFlashcards(exam);
    expect(truth!.front).toBe(
      "Um funcionário deve sempre atender o público com cortesia e educação.",
    );
    expect(truth!.back).toBe("Verdadeiro. Gabarito: A) cortesia e educação.");
    expect(lie!.front).toMatch(/^Um funcionário deve sempre atender o público com /);
    expect(lie!.front).not.toContain("Resposta:");
    expect(lie!.back).toBe("Falso. O gabarito é A) cortesia e educação.");
  });

  it("pergunta ou ordem ganha 'Resposta:' em vez de ser completada", () => {
    const cards = examFlashcards(exam);
    const order = cards.filter((card) => card.front.startsWith("Assinale"));
    expect(order).toHaveLength(2);
    for (const card of order) expect(card.front).toContain("Resposta: ");
  });
});
