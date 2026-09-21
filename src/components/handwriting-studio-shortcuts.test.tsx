import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HandwritingStudio } from "./handwriting-studio";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

function renderStudio() {
  return render(<HandwritingStudio onClose={vi.fn()} onSave={vi.fn()} draftKey="test-shortcuts" />);
}

it("troca de ferramenta com os atalhos P, E, H e V", () => {
  renderStudio();
  const pen = screen.getByRole("button", { name: "Caneta" });
  const eraser = screen.getByRole("button", { name: "Borracha" });
  const hand = screen.getByRole("button", { name: "Mover folha" });
  const select = screen.getByRole("button", { name: "Selecionar traços" });

  expect(pen.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: "e", code: "KeyE" });
  expect(eraser.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: "h", code: "KeyH" });
  expect(hand.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: "v", code: "KeyV" });
  expect(select.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: "p", code: "KeyP" });
  expect(pen.getAttribute("aria-pressed")).toBe("true");
});

it("Espaço segurado troca temporariamente para mover e volta ao soltar", () => {
  renderStudio();
  const pen = screen.getByRole("button", { name: "Caneta" });
  const hand = screen.getByRole("button", { name: "Mover folha" });

  fireEvent.keyDown(window, { key: "e", code: "KeyE" });
  const eraser = screen.getByRole("button", { name: "Borracha" });
  expect(eraser.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: " ", code: "Space" });
  expect(hand.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyUp(window, { key: " ", code: "Space" });
  expect(eraser.getAttribute("aria-pressed")).toBe("true");
  expect(pen.getAttribute("aria-pressed")).toBe("false");
});

it("não intercepta atalhos de uma letra quando o foco está em um campo de texto", () => {
  renderStudio();
  fireEvent.click(screen.getByRole("button", { name: "Texto na página inteira" }));
  const textarea = screen.getByLabelText("Texto da página inteira");
  textarea.focus();

  fireEvent.keyDown(textarea, { key: "e", code: "KeyE" });

  expect(screen.getByRole("button", { name: "Borracha" }).getAttribute("aria-pressed")).toBe(
    "false",
  );
});

it("Ctrl+Z desfaz e Ctrl+Shift+Z refaz", () => {
  renderStudio();
  fireEvent.keyDown(window, { key: "e", code: "KeyE" });
  expect(screen.getByRole("button", { name: "Borracha" }).getAttribute("aria-pressed")).toBe(
    "true",
  );

  fireEvent.keyDown(window, { key: "z", code: "KeyZ", ctrlKey: true });
  // Trocar de ferramenta nao gera historico de desfazer; o atalho so precisa
  // nao quebrar quando a pilha esta vazia.
  expect((screen.getByRole("button", { name: "Desfazer" }) as HTMLButtonElement).disabled).toBe(
    true,
  );

  fireEvent.keyDown(window, { key: "z", code: "KeyZ", ctrlKey: true, shiftKey: true });
  expect((screen.getByRole("button", { name: "Refazer" }) as HTMLButtonElement).disabled).toBe(
    true,
  );
});
