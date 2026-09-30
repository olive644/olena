import { describe, expect, it } from "vitest";
import type { Flashcard } from "../domain/workspace";
import {
  acceptedListeningAnswers,
  buildListeningDeck,
  createListeningRound,
  isListeningAnswerCorrect,
  parseManualListeningInput,
  parseManualListeningCards,
  normalizeListeningAnswer,
} from "../domain/listening-quiz";

const card = (id: string, front: string, back: string): Flashcard => ({
  id,
  subjectId: "english",
  front,
  back,
  intervalDays: 0,
  nextReview: "2026-08-31",
});

describe("quiz de escuta", () => {
  it("normaliza acentos, caixa e espaços nas respostas", () => {
    expect(normalizeListeningAnswer("  CORREIOS! ")).toBe("correios");
  });

  it("usa flashcards da matéria quando há conteúdo suficiente", () => {
    const deck = buildListeningDeck([
      card("1", "School", "Escola"),
      card("2", "Library", "Biblioteca"),
    ]);
    expect(deck.slice(0, 2).map((item) => item.front)).toEqual(["School", "Library"]);
    expect(deck.filter((item) => item.front === "School")).toHaveLength(1);
  });

  it("oferece somente um modelo básico quando faltam flashcards", () => {
    expect(buildListeningDeck([])).toHaveLength(5);
  });

  it("aceita traduções equivalentes cadastradas", () => {
    expect(
      acceptedListeningAnswers({
        id: "journey",
        front: "Journey",
        back: "Jornada",
        acceptedAnswers: ["Viagem"],
      }),
    ).toEqual(["journey", "jornada", "viagem"]);
  });

  it("embaralha a rodada sem repetir palavras", () => {
    const deck = buildListeningDeck([]);
    const round = createListeningRound(deck, 5, () => 0.42);
    expect(round).toHaveLength(5);
    expect(new Set(round.map((item) => item.id)).size).toBe(5);
  });

  it("respeita os limites de cinco, quinze e todas", () => {
    const deck = buildListeningDeck([]);
    expect(createListeningRound(deck, 5)).toHaveLength(5);
    expect(createListeningRound(deck, 15)).toHaveLength(5);
    expect(createListeningRound(deck, "all")).toHaveLength(5);
  });

  it("aceita equivalências, acentos e pontuação sem aproximação semântica", () => {
    const journey = {
      id: "journey",
      front: "Journey",
      back: "Jornada",
      acceptedAnswers: ["Viagem"],
    };
    expect(isListeningAnswerCorrect(journey, "  VIÁGEM! ")).toBe(true);
    expect(isListeningAnswerCorrect(journey, "viajante")).toBe(false);
  });

  it("aceita um erro de digitação apenas quando o professor habilita", () => {
    const bus = { id: "bus", front: "bus", back: "ônibus" };
    expect(isListeningAnswerCorrect(bus, "onibs")).toBe(false);
    expect(isListeningAnswerCorrect(bus, "onibs", true)).toBe(true);
    expect(isListeningAnswerCorrect(bus, "onus", true)).toBe(false);
  });

  it("cria cartões manuais a partir de uma palavra e tradução por linha", () => {
    expect(parseManualListeningCards("school = escola\n\nfriend = amigo")).toEqual([
      { id: "manual-1", front: "school", back: "escola", difficulty: "medium" },
      { id: "manual-2", front: "friend", back: "amigo", difficulty: "medium" },
    ]);
  });

  it("cadastra respostas equivalentes separadas por barra vertical", () => {
    const [bus] = parseManualListeningCards("bus = ônibus | autocarro | o ônibus");
    expect(bus).toEqual({
      id: "manual-1",
      front: "bus",
      back: "ônibus",
      acceptedAnswers: ["autocarro", "o ônibus"],
      difficulty: "medium",
    });
    expect(bus && isListeningAnswerCorrect(bus, "AUTOCARRO")).toBe(true);
    expect(bus && isListeningAnswerCorrect(bus, "o onibus")).toBe(true);
  });

  it("informa linhas manuais sem palavra ou tradução", () => {
    expect(parseManualListeningCards("school = escola\nsem tradução\n= resposta")).toEqual([]);
  });

  it("aceita listas coladas e explica erros por linha", () => {
    const parsed = parseManualListeningInput(
      "school; escola\nfriend, amigo\nbook\t livro\n= vazio\nschool - colégio",
    );
    expect(parsed.cards.map((item) => item.front)).toEqual(["school", "friend", "book"]);
    expect(parsed.lines.filter((line) => line.error).map((line) => line.error)).toEqual([
      "falta a palavra em inglês",
      "“school” já foi usada na linha 1",
    ]);
  });
  it("preserva a pontuação dos campos separados da gravação manual", () => {
    const parsed = parseManualListeningInput(
      "hello, teacher\tolá, professor | oi, professor",
      /\t/,
    );
    expect(parsed.lines.some((line) => line.error)).toBe(false);
    expect(parsed.cards[0]).toMatchObject({
      front: "hello, teacher",
      back: "olá, professor",
      acceptedAnswers: ["oi, professor"],
    });
  });
});
