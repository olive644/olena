import { describe, expect, it } from "vitest";
import { extractJson, parseStudyCards, parseStudyQuestions } from "./study-output";

const cards = (n: number) =>
  JSON.stringify({
    cards: Array.from({ length: n }, (_, i) => ({
      statement: `Afirmação ${i}.`,
      true: i % 2 === 0,
      explanation: `Explicação ${i}.`,
    })),
  });

describe("JSON do modelo", () => {
  it("tira cerca de código e texto em volta", () => {
    expect(extractJson('Aqui está:\n```json\n{"a":1}\n```\nBoa sorte!')).toEqual({ a: 1 });
    expect(extractJson("sem json")).toBeUndefined();
    expect(extractJson("{quebrado")).toBeUndefined();
  });
});

describe("flashcards da IA (verdadeiro ou falso)", () => {
  it("vira afirmação na frente e gabarito no começo do verso", () => {
    const parsed = parseStudyCards(cards(4));
    expect(parsed).toHaveLength(4);
    expect(parsed?.[0]).toEqual({
      front: "Afirmação 0.",
      back: "Verdadeiro. Explicação 0.",
    });
    expect(parsed?.[1]).toEqual({
      front: "Afirmação 1.",
      back: "Falso. O texto diz: Explicação 1.",
    });
  });

  it("aceita o verdadeiro ou falso como booleano, texto ou campo de resposta", () => {
    const list = JSON.stringify({
      cards: [
        { statement: "A", true: "verdadeiro", explanation: "a" },
        { statement: "B", truth: "false", explanation: "b" },
        { statement: "C", answer: false, explanation: "c" },
      ],
    });
    expect(parseStudyCards(list)?.map((card) => card.back.split(" ")[0])).toEqual([
      "Verdadeiro.",
      "Falso.",
      "Falso.",
    ]);
  });

  it("recusa pergunta aberta sem gabarito, que não é flashcard de verdadeiro ou falso", () => {
    const open = JSON.stringify({
      cards: Array.from({ length: 5 }, (_, i) => ({
        front: `O que é o conceito ${i}?`,
        back: `Resposta ${i}`,
      })),
    });
    expect(parseStudyCards(open)).toBeUndefined();
    const noTruth = JSON.stringify({
      cards: Array.from({ length: 5 }, (_, i) => ({ statement: `Frase ${i}.`, explanation: "x" })),
    });
    expect(parseStudyCards(noTruth)).toBeUndefined();
  });

  it("aceita de volta o cartão já guardado, que é o que o servidor devolve à tela", () => {
    const stored = JSON.stringify({
      cards: [
        { front: "A.", back: "Verdadeiro. a" },
        { front: "B.", back: "Falso. O texto diz: b" },
        { front: "C.", back: "True. c" },
        { front: "D?", back: "Resposta sem gabarito" },
        "texto",
        { front: "A.", back: "Verdadeiro. repetida" },
      ],
    });
    expect(parseStudyCards(stored)).toHaveLength(3);
  });

  it("recusa menos de 3 cartões, afirmação vazia e frente igual ao verso", () => {
    expect(parseStudyCards(cards(2))).toBeUndefined();
    const bad = JSON.stringify({
      cards: [
        { statement: "", true: true, explanation: "vazio" },
        { statement: "Sem explicação", true: true },
        ...JSON.parse(cards(2)).cards,
      ],
    });
    expect(parseStudyCards(bad)).toBeUndefined();
  });

  it("respeita o limite e o tamanho dos textos", () => {
    expect(parseStudyCards(cards(30), 8)).toHaveLength(8);
    const long = JSON.stringify({
      cards: [
        { statement: "x".repeat(400), true: true, explanation: "ok" },
        ...JSON.parse(cards(4)).cards,
      ],
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
  it("aproveita as questões inteiras quando o modelo para no meio (resposta cortada)", () => {
    const full = JSON.stringify({
      questions: [
        question(),
        question({ question: "Segunda?" }),
        question({ question: "Terceira?" }),
      ],
    });
    const cut = full.slice(0, full.lastIndexOf('"question":"Terceira?"') + 25);
    expect(() => JSON.parse(cut)).toThrow();
    const parsed = parseStudyQuestions(cut, 4);
    expect(parsed?.map((item) => item.prompt)).toEqual([question().question, "Segunda?"]);
  });

  it("resgata cartões inteiros de uma lista cortada, com chaves dentro do texto", () => {
    const cards = [
      { statement: "Chave { aberta", true: true, explanation: 'Texto com } e \\" aspas' },
      { statement: "B", true: false, explanation: "b" },
      { statement: "C", true: true, explanation: "c" },
      { statement: "D", true: false, explanation: "d" },
    ];
    const full = JSON.stringify({ cards });
    const cut = full.slice(0, full.length - 12);
    expect(parseStudyCards(cut)).toHaveLength(3);
  });
});
