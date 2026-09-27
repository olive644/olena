import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HandwritingStudio } from "./handwriting-studio";

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  localStorage.clear();
});

describe("inserir forma, régua ou eixos pelo teclado, sem desenhar", () => {
  it("abre o menu, insere a forma escolhida e a deixa selecionada", () => {
    render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir sem desenhar" }));
    expect(screen.getByRole("dialog", { name: "Inserir sem desenhar" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retângulo" }));
    // O menu fecha sozinho depois de escolher, e a ação de seleção aparece (a forma já entra selecionada).
    expect(screen.queryByRole("dialog", { name: "Inserir sem desenhar" })).toBeNull();
    expect(screen.getByText("1 item selecionado")).toBeTruthy();
  });

  it("também insere a régua e os eixos de coordenadas prontos, já selecionados", () => {
    render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert-ruler" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir sem desenhar" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Régua" }));
    expect(screen.getByText("1 item selecionado")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Inserir sem desenhar" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Eixos de coordenadas" }),
    );
    expect(screen.getByText("1 sistema de coordenadas selecionado")).toBeTruthy();
  });

  it("Fechar ou cancelar não insere nada", () => {
    render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert-2" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir sem desenhar" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog", { name: "Inserir sem desenhar" })).toBeNull();
    expect(screen.queryByText(/item selecionado/)).toBeNull();
  });
});
