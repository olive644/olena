import { describe, expect, it } from "vitest";
import { flashcardsFromPlainText, MAX_AUTO_FLASHCARDS } from "./index";
import { falseVersion, looksLikeStatement, numbersIn } from "./true-false";
import {
  computingHistory,
  fixtureAsText,
  photosynthesis,
  shortNote,
  statesOfMatter,
} from "./fixtures.test-data";
import { stripAccents } from "./portuguese";

const squash = (text: string) =>
  stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const isFalse = (back: string) => back.startsWith("Falso.");
const isTrue = (back: string) => back.startsWith("Verdadeiro.");

describe("flashcards automáticos de verdadeiro ou falso", () => {
  it("todo cartão é uma afirmação com o gabarito no verso", async () => {
    for (const fixture of [computingHistory, photosynthesis, statesOfMatter]) {
      const cards = await flashcardsFromPlainText(fixtureAsText(fixture), fixture.title);
      expect(cards.length).toBeGreaterThanOrEqual(4);
      expect(cards.length).toBeLessThanOrEqual(MAX_AUTO_FLASHCARDS);
      for (const card of cards) {
        expect(card.front.trim().length).toBeGreaterThan(20);
        expect(isTrue(card.back) || isFalse(card.back)).toBe(true);
      }
      expect(new Set(cards.map((card) => card.front)).size).toBe(cards.length);
    }
  });

  it("mistura verdadeiros e falsos, sem deixar o baralho ser só de um lado", async () => {
    const cards = await flashcardsFromPlainText(
      fixtureAsText(computingHistory),
      computingHistory.title,
    );
    const falses = cards.filter((card) => isFalse(card.back)).length;
    const trues = cards.filter((card) => isTrue(card.back)).length;
    expect(falses).toBeGreaterThanOrEqual(cards.length * 0.3);
    expect(trues).toBeGreaterThanOrEqual(cards.length * 0.3);
  });

  it("verdadeiro é a frase do arquivo; falso é diferente e o verso traz a frase certa", async () => {
    const source = squash(fixtureAsText(photosynthesis));
    const cards = await flashcardsFromPlainText(
      fixtureAsText(photosynthesis),
      photosynthesis.title,
    );
    for (const card of cards) {
      if (isTrue(card.back)) expect(source).toContain(squash(card.front));
      else {
        expect(source).not.toContain(squash(card.front));
        const original = card.back.replace(/^Falso\. O texto diz: /, "");
        expect(source).toContain(squash(original));
        expect(squash(original)).not.toBe(squash(card.front));
      }
    }
  });

  it("texto curto ou vazio não quebra", async () => {
    await expect(flashcardsFromPlainText("", "vazio")).resolves.toEqual([]);
    const few = await flashcardsFromPlainText(fixtureAsText(shortNote), shortNote.title);
    expect(few.length).toBeLessThanOrEqual(MAX_AUTO_FLASHCARDS);
  });
});

describe("afirmações falsas", () => {
  const base = { index: 0, language: "pt" as const, numbers: [], definitions: [] };

  it("troca um ano por outro, sem mexer em quantidades nem em décadas inteiras", () => {
    expect(falseVersion("Em 1945, o ENIAC foi concluído nos Estados Unidos.", base)).toMatch(
      /^Em \d{4}, o ENIAC/,
    );
    expect(falseVersion("O ábaco é usado há mais de 2000 anos na China.", base)).not.toContain(
      "mais de 2000",
    );
    const decade = falseVersion("Na década de 1970, os chips ficaram baratos.", base)!;
    expect(decade).toMatch(/década de \d{3}0,/);
    expect(decade).not.toContain("1970");
  });

  it("nega o que era afirmado e afirma o que era negado", () => {
    expect(falseVersion("O ENIAC foi concluído pela universidade.", { ...base, index: 2 })).toBe(
      "O ENIAC não foi concluído pela universidade.",
    );
    expect(falseVersion("O ENIAC não guardava o programa na memória.", { ...base, index: 2 })).toBe(
      "O ENIAC guardava o programa na memória.",
    );
  });

  it("não nega frase que já tem outra negação nem inventa quando não há como mudar", () => {
    expect(falseVersion("Ele não fez nem isso.", { ...base, index: 2 })).toBeUndefined();
    expect(falseVersion("Texto sem nada para trocar aqui.", base)).toBeUndefined();
  });

  it("troca por antônimo e por definição de outro termo", () => {
    expect(
      falseVersion("Ela foi a primeira programadora da história.", { ...base, index: 3 }),
    ).toBe("Ela foi a última programadora da história.");
    const swapped = falseVersion("O ábaco é um instrumento de cálculo.", {
      ...base,
      index: 0,
      own: { term: "O ábaco", verb: "é", rest: "um instrumento de cálculo." },
      definitions: [{ term: "O algoritmo", verb: "é", rest: "uma sequência finita de passos." }],
    });
    expect(swapped).toBe("O ábaco é uma sequência finita de passos.");
  });

  it("lê os números do texto", () => {
    expect(numbersIn("Em 1945 havia 18 mil válvulas e 2.300 transistores.")).toEqual([
      "1945",
      "18",
      "2.300",
    ]);
  });

  it("não troca o número de um nome de produto", () => {
    expect(
      falseVersion("O Altair 8800 foi vendido em forma de kit.", { ...base, index: 1 }),
    ).not.toContain("Altair 8801");
    const result = falseVersion("O Altair 8800 foi vendido como kit.", { ...base, index: 1 });
    expect(result === undefined || result.includes("Altair 8800")).toBe(true);
  });

  it("não nega verbo de oração subordinada", () => {
    const result = falseVersion("Ele sabe o que é um chip e usa isso hoje.", { ...base, index: 2 });
    expect(result === undefined || !result.includes("não é")).toBe(true);
  });
});

describe("o que é uma afirmação completa", () => {
  it("barra cabeçalho de tabela, título e linha do tempo", () => {
    for (const bad of [
      "Início do projeto Apresentação pública Fim da operação",
      "Início do projeto Apresentação pública Fim da operação.",
      "Fotossíntese e Respiração Celular na Planta",
      "1945 ENIAC Pensilvânia Estados Unidos Fim.",
      "Nome | Ano | País | Tipo.",
      "Resumo geral do capítulo.",
    ])
      expect(looksLikeStatement(bad, "pt")).toBe(false);
  });

  it("aceita frases completas", () => {
    for (const good of [
      "O ENIAC foi concluído em 1945 na Universidade da Pensilvânia.",
      "A planta usa gás carbônico, água e luz para produzir glicose.",
      "Os três inventores receberam o Prêmio Nobel de Física em 1956.",
    ])
      expect(looksLikeStatement(good, "pt")).toBe(true);
    expect(looksLikeStatement("The ENIAC was completed in 1945 at the university.", "en")).toBe(
      true,
    );
  });
});
