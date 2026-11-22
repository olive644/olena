import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NotebookSettings } from "./notebook-settings";
import { DEFAULT_NOTEBOOK_PREFERENCES } from "../data/notebook-preferences";

afterEach(cleanup);
describe("configurações do editor", () => {
  it("agrupa e altera todas as preferências sem abrir outro editor", () => {
    const onChange = vi.fn();
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
    render(<NotebookSettings preferences={DEFAULT_NOTEBOOK_PREFERENCES} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Configurações do editor" }));
    expect(screen.getAllByRole("group")).toHaveLength(7);
    const switches = screen.getAllByRole("checkbox");
    expect(switches).toHaveLength(12);
    switches.forEach((input) => fireEvent.click(input));
    for (const [key, value] of Object.entries(DEFAULT_NOTEBOOK_PREFERENCES)) {
      if (["writingWindowAutoFollow", "penBarrelErases", "penTailErases"].includes(key)) continue;
      expect(onChange).toHaveBeenCalledWith(key, !value);
    }
    expect(screen.queryByRole("checkbox", { name: /Avanço da janela/ })).toBeNull();
    fireEvent.click(screen.getByText("Atalhos de teclado"));
    expect(screen.getByText("Ctrl + Alt + C")).toBeTruthy();
    expect(screen.getByText("T", { selector: "kbd" })).toBeTruthy();
    fireEvent.click(screen.getByText("Atalhos de caneta e mesa"));
    expect(screen.getByRole("combobox", { name: "Botão lateral" })).toBeTruthy();
    const second = screen.getByRole("combobox", { name: "Segundo botão" }) as HTMLSelectElement;
    // Sem configurar, o segundo botão não muda a ferramenta (como sempre foi).
    expect(second.value).toBe("selected");
    fireEvent.change(second, { target: { value: "eraser" } });
    expect(second.value).toBe("eraser");
    expect(screen.getByText("Testar caneta e mesa")).toBeTruthy();
    const binding = screen.getByRole("button", { name: "Editar atalho: Caneta" });
    fireEvent.click(binding);
    fireEvent.keyDown(binding, { key: "q", code: "KeyQ" });
    expect(binding.textContent).toContain("Q");
    fireEvent.click(screen.getByRole("button", { name: "Restaurar atalhos padrão" }));
    expect(binding.textContent).toContain("P");
    fireEvent.click(screen.getByRole("button", { name: "Fechar configurações" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
