import { fireEvent, render, screen } from "@testing-library/react";
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

describe("inserir forma pelo teclado, sem desenhar", () => {
  it("abre o menu, insere a forma escolhida e a deixa selecionada", () => {
    render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir forma" }));
    expect(screen.getByRole("dialog", { name: "Inserir forma" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retângulo" }));
    // O menu fecha sozinho depois de escolher, e a ação de seleção aparece (a forma já entra selecionada).
    expect(screen.queryByRole("dialog", { name: "Inserir forma" })).toBeNull();
    expect(screen.getByText("1 item selecionado")).toBeTruthy();
  });

  it("Fechar ou cancelar não insere nada", () => {
    render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="shape-insert-2" />);
    fireEvent.click(screen.getByRole("button", { name: "Inserir forma" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog", { name: "Inserir forma" })).toBeNull();
    expect(screen.queryByText(/item selecionado/)).toBeNull();
  });
});
