import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HandwritingPaperPicker } from "./handwriting-paper-picker";

it("mantém os nomes acessíveis sem rótulos que expandem os botões", () => {
  render(
    <HandwritingPaperPicker
      paper="ruled"
      paperColor="aged"
      sectionsOpen={{ paper: true, color: true }}
      onToggleSection={vi.fn()}
      onSelectPaper={vi.fn()}
      onSelectPaperColor={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Tipo de papel" }).title).toBe("Tipo de papel");
  expect(screen.getByRole("button", { name: "Cor da folha" }).title).toBe("Cor da folha");
  expect(screen.getByRole("button", { name: "Papel de livro" }).title).toBe("Papel de livro");
});
