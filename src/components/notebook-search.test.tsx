import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotebookSearch } from "./notebook-search";

afterEach(cleanup);

const workspace = {
  notebooks: [{ id: "n1", title: "Física", subjectId: "", createdAt: "2026", pageIds: ["p1"] }],
  notes: [
    {
      id: "p1",
      title: "Cinemática",
      content: "A aceleração muda a velocidade",
      subjectId: "",
      updatedAt: "2026",
      assets: [],
    },
  ],
};

describe("busca nos cadernos (tela)", () => {
  it("mostra resultados com o trecho marcado e abre a folha ao clicar", () => {
    const onOpen = vi.fn();
    render(<NotebookSearch workspace={workspace} onOpen={onOpen} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar nos cadernos" }), {
      target: { value: "aceleracao" },
    });
    expect(screen.getByText("1 resultado")).toBeTruthy();
    expect(document.querySelector("mark")?.textContent).toBe("aceleração");
    fireEvent.click(screen.getByRole("button", { name: /Física/ }));
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ notebookId: "n1", pageId: "p1" }),
    );
  });

  it("explica quando nada é encontrado e que a escrita à mão não entra", () => {
    render(<NotebookSearch workspace={workspace} onOpen={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzz" } });
    expect(screen.getByText(/Nada encontrado/)).toBeTruthy();
    expect(screen.getByText(/imagem e não entra/)).toBeTruthy();
  });

  it("Escape limpa a busca", () => {
    render(<NotebookSearch workspace={workspace} onOpen={vi.fn()} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "fisica" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
    expect(screen.queryByText(/resultado/)).toBeNull();
  });
});
