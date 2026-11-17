import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FlashcardStudy, truthOf } from "./flashcard-study";
import type { Flashcard } from "../domain/workspace";

afterEach(cleanup);

const card = (id: string, front: string, back: string): Flashcard => ({
  id,
  subjectId: "m",
  front,
  back,
  intervalDays: 0,
  nextReview: "2026-11-17",
});
const deck = [
  card("a", "O ENIAC foi concluído em 1945.", "Verdadeiro. O ENIAC foi concluído em 1945."),
  card("b", "O ENIAC foi concluído em 1952.", "Falso. O texto diz: O ENIAC foi concluído em 1945."),
];

describe("estudo de verdadeiro ou falso", () => {
  it("lê o gabarito do verso", () => {
    expect(truthOf("Verdadeiro. Texto.")).toBe(true);
    expect(truthOf("Falso. O texto diz: x")).toBe(false);
    expect(truthOf("True. x")).toBe(true);
    expect(truthOf("Um verso comum")).toBeUndefined();
  });

  it("esquerda é falso, direita é verdadeiro, com gabarito antes de seguir", () => {
    const onReview = vi.fn();
    render(<FlashcardStudy title="ENIAC" cards={deck} onReview={onReview} onClose={() => {}} />);
    // cartão 1 é verdadeiro: seta direita acerta
    fireEvent.click(screen.getByRole("button", { name: "Verdadeiro" }));
    expect(screen.getByText("Correto!")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Falso" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    // cartão 2 é falso: seta direita (verdadeiro) erra e mostra a frase certa
    fireEvent.click(screen.getByRole("button", { name: "Verdadeiro" }));
    expect(screen.getByText("Não foi dessa vez.")).toBeTruthy();
    expect(screen.getByText("Falso. O texto diz: O ENIAC foi concluído em 1945.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Vamos rever as perguntas que você errou.")).toBeTruthy();
    expect(onReview).toHaveBeenCalledWith("a", "easy", expect.any(String));
    expect(onReview).toHaveBeenCalledWith("b", "again", expect.any(String));
    // na revisão, seta esquerda (falso) acerta
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(onReview).toHaveBeenCalledTimes(2);
  });

  it("desfazer volta ao enunciado sem contar a resposta", () => {
    render(<FlashcardStudy title="ENIAC" cards={deck} onReview={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Falso" }));
    expect(screen.getByText("Não foi dessa vez.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.queryByText("Não foi dessa vez.")).toBeNull();
    expect(screen.getByText("O ENIAC foi concluído em 1945.")).toBeTruthy();
    expect(screen.getByText("1 de 2")).toBeTruthy();
  });

  it("não deixa virar o cartão de verdadeiro ou falso antes de responder", () => {
    render(<FlashcardStudy title="ENIAC" cards={deck} onReview={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Virar cartão" }));
    expect(screen.queryByText(/^Verdadeiro\./)).toBeNull();
  });
});
