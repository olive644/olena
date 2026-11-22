import { beforeEach, describe, expect, it } from "vitest";
import {
  loadFeedback,
  noteFeedback,
  recordFeedback,
  rejectionRate,
  saveFeedback,
} from "./flashcard-feedback";
import { flashcardsFromPlainText } from "./pdf-summary";
import { computingHistory, fixtureAsText } from "./pdf-summary/fixtures.test-data";

beforeEach(() => localStorage.clear());

describe("contadores de qualidade dos cartões", () => {
  it("conta aceitos, editados, descartados e motivos por tipo, sem guardar texto", () => {
    let store = recordFeedback({}, "negation", { type: "kept" });
    store = recordFeedback(store, "negation", { type: "discarded", reason: "nonsense" });
    store = recordFeedback(store, "negation", { type: "discarded" });
    store = recordFeedback(store, "negation", { type: "edited" });
    expect(store.negation).toEqual({
      kept: 1,
      discarded: 2,
      edited: 1,
      reasons: { nonsense: 1 },
    });
    expect(rejectionRate(store.negation)).toBe(0.75);
    expect(rejectionRate(undefined)).toBe(0);
    expect(store.number).toBeUndefined();
  });

  it("salva e lê no aparelho, e ignora dado estragado", () => {
    noteFeedback("number", { type: "discarded", reason: "obvious" });
    noteFeedback(undefined, { type: "kept" });
    expect(loadFeedback().number?.reasons).toEqual({ obvious: 1 });
    expect(Object.keys(loadFeedback())).toEqual(["number"]);
    localStorage.setItem("helena.flashcardFeedback.v1", "{nao e json");
    expect(loadFeedback()).toEqual({});
    localStorage.setItem(
      "helena.flashcardFeedback.v1",
      JSON.stringify({
        number: { kept: -3, discarded: "x", reasons: { nonsense: 2, hack: 9 } },
        evil: {},
      }),
    );
    expect(loadFeedback()).toEqual({
      number: { kept: 0, discarded: 0, edited: 0, reasons: { nonsense: 2 } },
    });
    saveFeedback({});
    expect(loadFeedback()).toEqual({});
  });
});

describe("tipo de cada cartão gerado", () => {
  it("todo cartão traz o tipo, e as falsas dizem qual troca foi usada", async () => {
    const cards = await flashcardsFromPlainText(
      fixtureAsText(computingHistory),
      computingHistory.title,
    );
    const kinds = new Set(cards.map((card) => card.kind));
    expect(kinds.has("true")).toBe(true);
    expect([...kinds].some((kind) => kind !== "true")).toBe(true);
    for (const card of cards)
      expect(card.kind === "true").toBe(card.back.startsWith("Verdadeiro."));
  });
});
