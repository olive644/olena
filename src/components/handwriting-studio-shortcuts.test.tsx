import { fireEvent, render, screen, within } from "@testing-library/react";
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
  // Não há botão de mover a folha: a mão vem pela tecla H e se reconhece pela folha.
  expect(screen.queryByRole("button", { name: "Mover folha" })).toBeNull();
  const handActive = () => screen.queryByLabelText("Arraste a folha para mover") !== null;
  const select = screen.getByRole("button", { name: "Selecionar traços" });

  expect(pen.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: "e", code: "KeyE" });
  expect(eraser.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: "h", code: "KeyH" });
  expect(handActive()).toBe(true);
  expect(eraser.getAttribute("aria-pressed")).toBe("false");

  fireEvent.keyDown(window, { key: "v", code: "KeyV" });
  expect(select.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: "p", code: "KeyP" });
  expect(pen.getAttribute("aria-pressed")).toBe("true");
});

it("não republica o rascunho quando apenas a identidade do callback muda", () => {
  const first = vi.fn();
  const second = vi.fn();
  const props = { onClose: vi.fn(), onSave: vi.fn(), draftKey: "stable-callback" };
  const view = render(<HandwritingStudio {...props} onDraftChange={first} />);
  expect(first).toHaveBeenCalledTimes(1);
  view.rerender(<HandwritingStudio {...props} onDraftChange={second} />);
  expect(second).not.toHaveBeenCalled();
});

it("Espaço segurado troca temporariamente para mover e volta ao soltar", () => {
  renderStudio();
  const pen = screen.getByRole("button", { name: "Caneta" });

  fireEvent.keyDown(window, { key: "e", code: "KeyE" });
  const eraser = screen.getByRole("button", { name: "Borracha" });
  expect(eraser.getAttribute("aria-pressed")).toBe("true");

  fireEvent.keyDown(window, { key: " ", code: "Space" });
  expect(screen.queryByLabelText("Arraste a folha para mover")).not.toBeNull();

  fireEvent.keyUp(window, { key: " ", code: "Space" });
  expect(screen.queryByLabelText("Arraste a folha para mover")).toBeNull();
  expect(eraser.getAttribute("aria-pressed")).toBe("true");
  expect(pen.getAttribute("aria-pressed")).toBe("false");
});

it("não intercepta atalhos de uma letra quando o foco está em um campo de texto", () => {
  renderStudio();
  fireEvent.click(screen.getByRole("button", { name: "Texto na página inteira" }));
  const textarea = screen.getByLabelText("Texto na folha");
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

it("restaura a cor e a largura ao alternar entre caneta e marca-texto", () => {
  renderStudio();
  const tool = (name: string) => screen.getByRole("button", { name });
  // As cores ficam apenas na paleta encaixável, separada das opções de espessura.
  const ink = (name: string) =>
    within(screen.getByRole("group", { name: "Cores rápidas" })).getByRole("button", { name });
  const width = () =>
    screen.getByRole("slider", { name: "Espessura do pincel" }) as HTMLInputElement;
  fireEvent.click(tool("Caneta"));
  fireEvent.click(tool("Caneta"));
  fireEvent.click(ink("Tinta Roxo"));
  expect(ink("Tinta Roxo").getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(width(), { target: { value: "31" } });
  fireEvent.click(tool("Marca-texto"));
  fireEvent.click(tool("Marca-texto"));
  expect(ink("Tinta Roxo").getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(ink("Tinta Roxo"));
  fireEvent.change(width(), { target: { value: "76" } });
  fireEvent.click(tool("Caneta"));
  fireEvent.click(tool("Caneta"));
  expect(width().value).toBe("31");
  expect(ink("Tinta Roxo").getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(tool("Marca-texto"));
  fireEvent.click(tool("Marca-texto"));
  expect(width().value).toBe("76");
  expect(ink("Tinta Roxo").getAttribute("aria-pressed")).toBe("true");
});
