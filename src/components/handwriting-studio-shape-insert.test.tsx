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

describe("inserir formas pelo teclado, sem desenhar", () => {
  it.each(["Elipse", "Retângulo", "Triângulo", "Seta", "Polígono"])(
    "insere %s e deixa o objeto pronto para mover",
    (shape) => {
      render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert" />);
      fireEvent.click(screen.getByRole("button", { name: "Inserir sem desenhar" }));
      expect(screen.getByRole("dialog", { name: "Inserir sem desenhar" })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: shape }));
      // O menu fecha sozinho depois de escolher, e a ação de seleção aparece (a forma já entra selecionada).
      expect(screen.queryByRole("dialog", { name: "Inserir sem desenhar" })).toBeNull();
      expect(screen.getByText("1 item selecionado")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Mover$/ })).toBeTruthy();
    },
  );

  it("não duplica os instrumentos de reta, régua e coordenadas no menu de formas", () => {
    render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert-ruler" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir sem desenhar" }));
    const menu = within(screen.getByRole("dialog"));
    for (const name of ["Reta", "Régua", "Eixos de coordenadas"])
      expect(menu.queryByRole("button", { name })).toBeNull();
  });

  it("Fechar ou cancelar não insere nada", () => {
    render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert-2" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir sem desenhar" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog", { name: "Inserir sem desenhar" })).toBeNull();
    expect(screen.queryByText(/item selecionado/)).toBeNull();
  });
});
