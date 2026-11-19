import { describe, expect, it } from "vitest";
import { extractJson, parseStudyCards, parseStudyQuestions } from "./study-output";

const cards = (n: number) =>
  JSON.stringify({
    cards: Array.from({ length: n }, (_, i) => ({
      front: `Pergunta ${i}?`,
      back: `Resposta ${i}`,
    })),
  });

describe("JSON do modelo", () => {
  it("tira cerca de código e texto em volta", () => {
    expect(extractJson('Aqui está:\n```json\n{"a":1}\n```\nBoa sorte!')).toEqual({ a: 1 });
    expect(extractJson("sem json")).toBeUndefined();
    expect(extractJson("{quebrado")).toBeUndefined();
  });
});

describe("flashcards da IA", () => {
  it("aceita lista dentro de objeto ou solta e descarta lixo", () => {
    expect(parseStudyCards(cards(5))).toHaveLength(5);
    const loose = JSON.stringify([
      { front: "A?", back: "a" },
      { front: "B?", back: "b" },
      { front: "C?", back: "c" },
      { front: "", back: "vazio" },
      { front: "D?" },
      "texto",
      { front: "A?", back: "repetida" },
    ]);
    expect(parseStudyCards(loose)).toHaveLength(3);
  });

  it("recusa resposta com menos de 3 cartões e a frente igual ao verso", () => {
    expect(parseStudyCards(cards(2))).toBeUndefined();
    const same = JSON.stringify({
      cards: Array.from({ length: 5 }, () => ({ front: "x", back: "x" })),
    });
    expect(parseStudyCards(same)).toBeUndefined();
  });

  it("respeita o limite e o tamanho dos textos", () => {
    expect(parseStudyCards(cards(30), 8)).toHaveLength(8);
    const long = JSON.stringify({
      cards: [{ front: "x".repeat(400), back: "ok" }, ...JSON.parse(cards(4)).cards],
    });
    expect(parseStudyCards(long)).toHaveLength(4);
  });
});

const question = (over: Record<string, unknown> = {}) => ({
  question: "Qual gás as plantas liberam?",
  options: ["Oxigênio", "Hélio", "Metano", "Nitrogênio"],
  answer: 0,
  explanation: "A fotossíntese libera oxigênio.",
  ...over,
});

describe("questões da IA", () => {
  it("aceita questões com o número de alternativas pedido", () => {
    const text = JSON.stringify({ questions: [question(), question({ question: "Outra?" })] });
    const result = parseStudyQuestions(text, 4)!;
    expect(result).toHaveLength(2);
    expect(result[0]!.options[result[0]!.answer]).toBe("Oxigênio");
  });

  it("tira a letra na frente da alternativa", () => {
    const text = JSON.stringify({
      questions: [
        question({ options: ["A) Oxigênio", "B) Hélio", "C) Metano", "D) Nitrogênio"] }),
        question({ question: "Outra?" }),
      ],
    });
    expect(parseStudyQuestions(text, 4)![0]!.options[0]).toBe("Oxigênio");
  });

  it("descarta resposta fora da lista, alternativa repetida e quantidade errada", () => {
    const bad = [
      question({ answer: 4 }),
      question({ answer: -1 }),
      question({ answer: "0" }),
      question({ options: ["a", "a", "b", "c"] }),
      question({ options: ["a", "b", "c"] }),
      question({ question: "" }),
    ];
    expect(parseStudyQuestions(JSON.stringify({ questions: bad }), 4)).toBeUndefined();
    const mixed = [...bad, question(), question({ question: "Terceira?" })];
    expect(parseStudyQuestions(JSON.stringify({ questions: mixed }), 4)).toHaveLength(2);
  });

  it("fácil pede 3 alternativas", () => {
    const easy = question({ options: ["a", "b", "c"], answer: 2 });
    const text = JSON.stringify({ questions: [easy, { ...easy, question: "Outra?" }] });
    expect(parseStudyQuestions(text, 3)).toHaveLength(2);
    expect(parseStudyQuestions(text, 4)).toBeUndefined();
  });

  it("não deixa a mesma pergunta duas vezes", () => {
    const text = JSON.stringify({
      questions: [question(), question(), question({ question: "Nova?" })],
    });
    expect(parseStudyQuestions(text, 4)).toHaveLength(2);
  });
});
