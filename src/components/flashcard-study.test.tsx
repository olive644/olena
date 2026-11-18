import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FlashcardStudy, truthOf } from "./flashcard-study";
import type { Flashcard } from "../domain/workspace";

afterEach(cleanup);

const card = (
  id: string,
  front: string,
  back: string,
  extra: Partial<Flashcard> = {},
): Flashcard => ({
  id,
  subjectId: "m",
  front,
  back,
  intervalDays: 0,
  nextReview: "2026-11-17",
  ...extra,
});
const deck = [
  card("a", "O ENIAC foi concluído em 1945.", "Verdadeiro. O ENIAC foi concluído em 1945.", {
    sourcePage: 3,
  }),
  card("b", "O ENIAC foi concluído em 1952.", "Falso. O texto diz: O ENIAC foi concluído em 1945."),
];

function setup(cards: Flashcard[] = deck) {
  const handlers = {
    onReview: vi.fn(),
    onDiscard: vi.fn(),
    onFeedback: vi.fn(),
    onEdit: vi.fn(),
    onClose: vi.fn(),
  };
  render(<FlashcardStudy title="ENIAC" cards={cards} sourceTitle="historia.pdf" {...handlers} />);
  return handlers;
}

describe("estudo de verdadeiro ou falso", () => {
  it("lê o gabarito do verso", () => {
    expect(truthOf("Verdadeiro. Texto.")).toBe(true);
    expect(truthOf("Falso. O texto diz: x")).toBe(false);
    expect(truthOf("True. x")).toBe(true);
    expect(truthOf("Um verso comum")).toBeUndefined();
  });

  it("esquerda é falso, direita é verdadeiro, com gabarito antes de seguir", () => {
    const { onReview } = setup();
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
    // acertou = "bom" no FSRS, errou = "de novo"
    expect(onReview).toHaveBeenCalledWith("a", "good", expect.any(String));
    expect(onReview).toHaveBeenCalledWith("b", "again", expect.any(String));
    // na revisão, seta esquerda (falso) acerta
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(onReview).toHaveBeenCalledTimes(2);
  });

  it("desfazer volta ao enunciado sem contar a resposta", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Falso" }));
    expect(screen.getByText("Não foi dessa vez.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.queryByText("Não foi dessa vez.")).toBeNull();
    expect(screen.getByText("O ENIAC foi concluído em 1945.")).toBeTruthy();
    expect(screen.getByText("1 de 2")).toBeTruthy();
  });

  it("não deixa virar o cartão de verdadeiro ou falso antes de responder", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Virar cartão" }));
    expect(screen.queryByText(/^Verdadeiro\./)).toBeNull();
  });

  it("cita o arquivo e a página no gabarito", () => {
    setup();
    expect(screen.queryByText(/historia\.pdf/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Verdadeiro" }));
    expect(screen.getByText(/Fonte: historia\.pdf, página 3/)).toBeTruthy();
  });
});

describe("afirmação ruim e edição", () => {
  it("exclui a afirmação do baralho e a sessão segue sem ela", () => {
    const { onDiscard, onReview } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Afirmação ruim" }));
    fireEvent.click(screen.getByRole("button", { name: "Sem motivo" }));
    expect(onDiscard).toHaveBeenCalledWith("a");
    // o cartão 2 passa a ser o único
    expect(screen.getByText("O ENIAC foi concluído em 1952.")).toBeTruthy();
    expect(screen.getByText("1 de 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Falso" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("1/1")).toBeTruthy();
    expect(onReview).toHaveBeenCalledTimes(1);
    expect(onReview).toHaveBeenCalledWith("b", "good", expect.any(String));
  });

  it("excluir o último cartão encerra a rodada sem quebrar", () => {
    const { onDiscard } = setup([deck[0]!]);
    fireEvent.click(screen.getByRole("button", { name: "Afirmação ruim" }));
    fireEvent.click(screen.getByRole("button", { name: "Sem motivo" }));
    expect(onDiscard).toHaveBeenCalledWith("a");
    expect(screen.getByText(/Excelente trabalho|Bom estudo/)).toBeTruthy();
  });

  it("excluir depois de ver o gabarito não conta a resposta", () => {
    const { onReview } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Falso" }));
    fireEvent.click(screen.getByRole("button", { name: "Afirmação ruim" }));
    fireEvent.click(screen.getByRole("button", { name: "Sem motivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Verdadeiro" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    // sobrou só o cartão 2 (falso), respondido verdadeiro: errou
    expect(onReview).toHaveBeenCalledWith("b", "again", expect.any(String));
    expect(onReview).not.toHaveBeenCalledWith("a", expect.anything(), expect.anything());
  });

  it("edita a afirmação, o gabarito e a explicação", () => {
    const { onEdit } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Editar cartão" }));
    const form = screen.getByRole("textbox", { name: "Afirmação" }).closest("form")!;
    fireEvent.change(within(form).getByRole("textbox", { name: "Afirmação" }), {
      target: { value: "O ENIAC foi concluído em 1946." },
    });
    fireEvent.click(within(form).getByRole("radio", { name: "Falso" }));
    fireEvent.change(within(form).getByRole("textbox", { name: "Explicação" }), {
      target: { value: "O texto diz 1945." },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar" }));
    expect(onEdit).toHaveBeenCalledWith(
      "a",
      "O ENIAC foi concluído em 1946.",
      "Falso. O texto diz: O texto diz 1945.",
    );
    // a tela já mostra a versão editada e o gabarito novo vale na resposta
    expect(screen.getByText("O ENIAC foi concluído em 1946.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Falso" }));
    expect(screen.getByText("Correto!")).toBeTruthy();
  });

  it("cancelar a edição não salva nada", () => {
    const { onEdit } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Editar cartão" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("O ENIAC foi concluído em 1945.")).toBeTruthy();
  });

  it("pergunta o motivo antes de excluir e registra o sinal", () => {
    const { onFeedback, onDiscard } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Afirmação ruim" }));
    expect(onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Na verdade é verdadeira" }));
    expect(onFeedback).toHaveBeenCalledWith("a", { type: "discarded", reason: "actually-true" });
    expect(onDiscard).toHaveBeenCalledWith("a");
  });

  it("dá para excluir sem motivo ou desistir", () => {
    const { onFeedback, onDiscard } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Afirmação ruim" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Afirmação ruim" }));
    fireEvent.click(screen.getByRole("button", { name: "Sem motivo" }));
    expect(onFeedback).toHaveBeenCalledWith("a", { type: "discarded" });
  });

  it("registra edição e cartão aceito", () => {
    const { onFeedback } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Editar cartão" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(onFeedback).toHaveBeenCalledWith("a", { type: "edited" });
    fireEvent.click(screen.getByRole("button", { name: "Verdadeiro" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Falso" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onFeedback).toHaveBeenCalledWith("b", { type: "kept" });
  });
});

it("encerra depois de uma revisão mesmo quando o usuário erra novamente", () => {
  const onReview = vi.fn();
  render(
    <FlashcardStudy
      title="Revisão única"
      cards={[deck[0]!]}
      onReview={onReview}
      onDiscard={() => {}}
      onEdit={() => {}}
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Falso" }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  expect(screen.getByText("Vamos rever as perguntas que você errou.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: "Falso" }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  expect(screen.queryByText("Vamos rever as perguntas que você errou.")).toBeNull();
  expect(screen.getByText("0/1")).toBeTruthy();
  expect(onReview).toHaveBeenCalledTimes(1);
});
