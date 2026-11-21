import { describe, expect, it } from "vitest";
import {
  OLENA_CAPABILITY,
  budgetSources,
  estimateOlenaCredits,
  requestedCount,
  studyPrompt,
  toSourceQuiz,
} from "./library-ai";

const text = (id: string, length: number, filler = "palavra ") => ({
  id,
  title: `Fonte ${id}`,
  content: filler.repeat(Math.ceil(length / filler.length)).slice(0, length),
});

describe("o que vai à Olena", () => {
  it("cada tipo da Biblioteca tem seu pedido", () => {
    expect(OLENA_CAPABILITY).toEqual({
      Resumo: "summarize",
      Flashcards: "flashcards",
      Quizzes: "quiz",
      Simulados: "exam",
    });
  });

  it("respeita os limites do contrato: 8.000 por trecho, 12 trechos e 36.000 no total", () => {
    for (const lengths of [[500], [20_000], [60_000, 60_000, 60_000], [100_000]]) {
      const sources = budgetSources(lengths.map((length, index) => text(String(index), length)));
      expect(sources.length).toBeLessThanOrEqual(12);
      expect(sources.every((source) => source.content.length <= 8_000)).toBe(true);
      expect(sources.reduce((sum, source) => sum + source.content.length, 0)).toBeLessThanOrEqual(
        36_000,
      );
      expect(sources.every((source) => source.title.length <= 200 && source.id.length <= 160)).toBe(
        true,
      );
    }
  });

  it("texto curto vai inteiro e sem repartir", () => {
    const sources = budgetSources([text("a", 1_200, "a")]);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.content.length).toBe(1_200);
    expect(sources[0]!.id).toBe("a");
  });

  it("documento longo é amostrado do começo ao fim, não cortado no começo", () => {
    const body = Array.from({ length: 12 }, (_, i) => `[parte ${i}] ` + "x".repeat(4_988)).join("");
    const sources = budgetSources([{ id: "p", title: "Prova", content: body }]);
    const joined = sources.map((source) => source.content).join("\n");
    expect(joined).toContain("[parte 0]");
    expect(joined).toContain("[parte 11]");
    expect(sources.length).toBeGreaterThan(1);
  });

  it("divide o orçamento entre várias fontes", () => {
    const sources = budgetSources([text("a", 50_000), text("b", 50_000), text("c", 50_000)]);
    for (const id of ["a", "b", "c"])
      expect(sources.some((source) => source.id.startsWith(id))).toBe(true);
  });

  it("uma prova de 31.000 caracteres vai inteira, sem buracos entre os trechos", () => {
    const body = Array.from({ length: 31 }, (_, i) => `[q${i}] ` + "y".repeat(993)).join("");
    const sources = budgetSources([{ id: "p", title: "Prova", content: body }]);
    const joined = sources.map((source) => source.content).join("");
    expect(joined.length).toBe(body.length);
    for (let i = 0; i < 31; i += 1) expect(joined).toContain(`[q${i}]`);
  });

  it("colapsa os espaços duplos que o PDF deixa", () => {
    const [source] = budgetSources([{ id: "p", title: "Prova", content: "A  equação   x2  +  1" }]);
    expect(source!.content).toBe("A equação x2 + 1");
  });

  it("não manda fonte vazia", () => {
    expect(budgetSources([text("a", 0)])).toEqual([]);
    expect(budgetSources([])).toEqual([]);
  });
});

describe("parâmetros do pedido", () => {
  it("são só números e palavras fixas, sem texto livre", () => {
    expect(studyPrompt("Quizzes", "hard", "long")).toBe("count=15;options=4;difficulty=hard");
    expect(studyPrompt("Quizzes", "easy", "short")).toBe("count=5;options=3;difficulty=easy");
    expect(studyPrompt("Simulados", "medium", "long")).toBe("count=16;options=4;difficulty=medium");
    expect(studyPrompt("Flashcards", "medium", "medium")).toBe("count=12");
  });
});

describe("questões da Olena na pasta", () => {
  it("viram o formato que o estudo de quiz e de simulado já lê", () => {
    const quiz = toSourceQuiz(
      [{ prompt: "Qual?", options: ["a", "b", "c"], answer: 1, explanation: "Porque." }],
      "easy",
      { id: "f", title: "Aula" },
    );
    expect(quiz).toMatchObject({ version: 1, difficulty: "easy" });
    expect(quiz.questions[0]).toMatchObject({
      sourceId: "f",
      sourceTitle: "Aula",
      page: 0,
      answer: 1,
    });
  });
});

describe("custo estimado antes de gerar", () => {
  const text = (chars: number) => ({ kind: "text", content: "a".repeat(chars) });

  it("texto curto custa menos que texto longo e nunca passa do teto de um pedido", () => {
    const small = estimateOlenaCredits("Resumo", [text(500)], "medium");
    const big = estimateOlenaCredits("Resumo", [text(40_000)], "medium");
    expect(small).toBeGreaterThan(0);
    expect(small).toBeLessThan(big);
    expect(estimateOlenaCredits("Simulados", [text(40_000)], "long")).toBeLessThanOrEqual(300);
  });

  it("PDF e imagem entram com a fatia inteira, porque o texto só sai do OCR depois do clique", () => {
    const pdf = estimateOlenaCredits("Quizzes", [{ kind: "pdf", content: "data:..." }], "medium");
    const short = estimateOlenaCredits("Quizzes", [text(500)], "medium");
    expect(pdf).toBeGreaterThan(short);
  });

  it("mais questões custam mais, e sem fontes não há custo", () => {
    expect(estimateOlenaCredits("Quizzes", [text(8000)], "long")).toBeGreaterThan(
      estimateOlenaCredits("Quizzes", [text(8000)], "short"),
    );
    expect(estimateOlenaCredits("Resumo", [], "medium")).toBe(0);
    expect(requestedCount("Flashcards", "short")).toBe(12);
    expect(requestedCount("Simulados", "medium")).toBe(12);
  });
});
