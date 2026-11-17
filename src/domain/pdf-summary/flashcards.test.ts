import { describe, expect, it } from "vitest";
import { flashcardsFromPlainText, MAX_AUTO_FLASHCARDS } from "./index";
import { computingHistory, fixtureAsText, photosynthesis, shortNote } from "./fixtures.test-data";
import { stripAccents } from "./portuguese";

const squash = (text: string) => stripAccents(text).toLowerCase().replace(/\s+/g, " ");

describe("flashcards automáticos", () => {
  it("gera muitos cartões de um texto de aula, todos com pergunta e resposta", async () => {
    const cards = await flashcardsFromPlainText(
      fixtureAsText(computingHistory),
      computingHistory.title,
    );
    expect(cards.length).toBeGreaterThanOrEqual(8);
    expect(cards.length).toBeLessThanOrEqual(MAX_AUTO_FLASHCARDS);
    for (const card of cards) {
      expect(card.front.trim().length).toBeGreaterThan(5);
      expect(card.back.trim().length).toBeGreaterThan(1);
    }
    expect(new Set(cards.map((card) => card.front)).size).toBe(cards.length);
  });

  it("não inventa nada: a resposta de cada cartão está no texto do arquivo", async () => {
    const source = squash(fixtureAsText(photosynthesis));
    const cards = await flashcardsFromPlainText(
      fixtureAsText(photosynthesis),
      photosynthesis.title,
    );
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(source).toContain(squash(card.back).replace(/[.]$/, ""));
  });

  it("as lacunas escondem o termo e a resposta devolve o termo", async () => {
    const cards = await flashcardsFromPlainText(
      fixtureAsText(computingHistory),
      computingHistory.title,
    );
    const cloze = cards.filter((card) => card.front.startsWith("Complete: "));
    expect(cloze.length).toBeGreaterThan(0);
    for (const card of cloze) {
      expect(card.front).toContain("_____");
      expect(squash(card.front)).not.toContain(squash(card.back));
    }
  });

  it("texto curto ou vazio não quebra", async () => {
    await expect(flashcardsFromPlainText("", "vazio")).resolves.toEqual([]);
    const few = await flashcardsFromPlainText(fixtureAsText(shortNote), shortNote.title);
    expect(few.length).toBeLessThanOrEqual(MAX_AUTO_FLASHCARDS);
  });
});
