import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FlashcardQualityPanel } from "./flashcard-quality-panel";
import { noteFeedback, loadFeedback } from "../domain/flashcard-feedback";
import { learnFromSignal, loadModel } from "../domain/flashcard-quality";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("painel de qualidade dos flashcards", () => {
  it("explica quando ainda não há dados", () => {
    render(<FlashcardQualityPanel />);
    expect(screen.getByText(/Ainda não há dados/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Filtro aprendendo: 0 de 30/)).toBeTruthy();
  });

  it("mostra por tipo os aceitos, editados, descartados, a rejeição e o motivo mais comum", () => {
    noteFeedback("negation", { type: "kept" });
    noteFeedback("negation", { type: "discarded", reason: "nonsense" });
    noteFeedback("negation", { type: "discarded", reason: "nonsense" });
    noteFeedback("negation", { type: "edited" });
    render(<FlashcardQualityPanel />);
    const table = screen.getByRole("table", { name: "Flashcards por tipo de cartão" });
    const row = within(table).getByRole("row", { name: /Negação/ });
    expect(
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "1", "2", "75%", "Sem sentido"]);
    expect(within(table).queryByRole("row", { name: /Antônimo/ })).toBeNull();
  });

  it("zera contadores e filtro só depois de confirmar", () => {
    noteFeedback("number", { type: "discarded" });
    learnFromSignal(
      { front: "Texto um dois três quatro cinco seis.", back: "Falso. x", origin: "number" },
      true,
    );
    render(<FlashcardQualityPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Zerar contadores e filtro" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(loadFeedback().number?.discarded).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Zerar contadores e filtro" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar: zerar contadores e filtro" }));
    expect(loadFeedback()).toEqual({});
    expect(loadModel().samples).toBe(0);
    expect(screen.getByText(/Ainda não há dados/)).toBeTruthy();
  });
});
