import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HandwritingPaperPicker } from "./handwriting-paper-picker";

it("mantém os nomes acessíveis sem rótulos que expandem os botões", () => {
  const props = {
    paper: "ruled" as const,
    paperColor: "aged" as const,
    onToggleSection: vi.fn(),
    onSelectPaper: vi.fn(),
    onSelectPaperColor: vi.fn(),
  };
  const { rerender } = render(
    <HandwritingPaperPicker {...props} sectionsOpen={{ paper: true, color: false }} />,
  );
  expect(screen.getByRole("button", { name: "Tipo de papel" }).title).toBe("Tipo de papel");
  expect(screen.getByRole("button", { name: "Cor da folha" }).title).toBe("Cor da folha");
  expect(screen.getByRole("button", { name: "Pautado" }).title).toBe("Pautado");
  rerender(<HandwritingPaperPicker {...props} sectionsOpen={{ paper: false, color: true }} />);
  expect(screen.getByRole("button", { name: "Papel de livro" }).title).toBe("Papel de livro");
});
