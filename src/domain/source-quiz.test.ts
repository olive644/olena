import { expect, it } from "vitest";
import { buildSourceQuiz, parseSourceQuiz } from "./source-quiz";
const facts = [
  "Verdadeiro. O ENIAC foi construído em 1945 para calcular trajetórias de artilharia.",
  "Falso. O texto diz: O projeto começou em 1943 na Universidade da Pensilvânia.",
  "Verdadeiro. A apresentação pública ocorreu em 1946 após o desenvolvimento da máquina.",
  "Verdadeiro. O computador encerrou sua operação em 1955 depois de muitos cálculos científicos.",
].map((back) => ({ back, page: 1, sourceId: "s1", sourceTitle: "História.pdf" }));
it("gera alternativas únicas com gabarito e frase real da fonte", () => {
  const quiz = buildSourceQuiz(facts, "medium", "medium");
  expect(quiz.questions.length).toBeGreaterThan(0);
  for (const q of quiz.questions) {
    expect(new Set(q.options).size).toBe(4);
    expect(q.explanation).toContain(q.options[q.answer]);
    expect(q.prompt).toContain("_____");
    expect(q.explanation).not.toMatch(/^Falso/);
    expect(q.sourceId).toBe("s1");
  }
  expect(parseSourceQuiz(JSON.stringify(quiz))).toEqual(quiz);
});
it("não inventa alternativas com fonte insuficiente", () =>
  expect(
    buildSourceQuiz([{ ...facts[0]!, back: "Texto curto" }], "easy", "short").questions,
  ).toEqual([]));
it("fácil oferece três alternativas e rejeita conteúdo inválido persistido", () => {
  const q = buildSourceQuiz(facts, "easy", "short");
  expect(q.questions.every((q) => q.options.length === 3)).toBe(true);
  expect(parseSourceQuiz('{"version":1,"questions":[{}]}')).toBeUndefined();
  const bad = { ...q, questions: [{ ...q.questions[0], answer: 99 }] };
  expect(parseSourceQuiz(JSON.stringify(bad))).toBeUndefined();
});

it("descarta cabeçalhos e fragmentos sem afirmação completa", () => {
  const quiz = buildSourceQuiz(
    [
      { ...facts[0]!, back: "Verdadeiro. Início do projeto Apresentação pública Fim da operação" },
      ...facts,
    ],
    "easy",
    "short",
  );
  expect(quiz.questions.some((q) => q.explanation.includes("Início do projeto"))).toBe(false);
});

it("não mistura anos com quantidades nas alternativas", () => {
  const quiz = buildSourceQuiz(
    [
      ...facts,
      {
        ...facts[0]!,
        back: "Verdadeiro. O computador utilizava 17 mil válvulas e fazia 5 mil somas por segundo.",
      },
    ],
    "easy",
    "short",
  );
  for (const q of quiz.questions)
    if (/^(?:19|20)\d{2}$/.test(q.options[q.answer]!))
      expect(q.options.every((o) => /^(?:19|20)\d{2}$/.test(o))).toBe(true);
});
