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
    expect(screen.getAllByRole("group")).toHaveLength(3);
    const switches = screen.getAllByRole("checkbox");
    expect(switches).toHaveLength(6);
    switches.forEach((input) => fireEvent.click(input));
    for (const [key, value] of Object.entries(DEFAULT_NOTEBOOK_PREFERENCES)) {
      expect(onChange).toHaveBeenCalledWith(key, !value);
    }
    fireEvent.click(screen.getByRole("button", { name: "Fechar configurações" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
