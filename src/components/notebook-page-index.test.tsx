import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotebookPageIndex } from "./notebook-page-index";
import type { StudyNote } from "../domain/workspace";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterEach(cleanup);

const page = (id: string, title: string, extra: Partial<StudyNote> = {}): StudyNote => ({
  id,
  title,
  content: "",
  subjectId: "",
  updatedAt: "2026",
  assets: [],
  ...extra,
});

const pages = [
  page("a", "Cinemática", {
    assets: [
      { id: "x", kind: "drawing", name: "f", dataUrl: "data:image/png;base64,AA", createdAt: "" },
    ],
  }),
  page("b", "Óptica", { content: "Lentes e espelhos" }),
  page("c", ""),
];

function isDisabled(name: string): boolean {
  return (screen.getByRole("button", { name }) as HTMLButtonElement).disabled;
}

describe("índice de folhas", () => {
  it("lista todas as folhas com número, título e miniatura, marcando a atual", () => {
    render(
      <NotebookPageIndex pages={pages} currentPageId="b" onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText("3 folhas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Folha 1: Cinemática" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Folha 3: Sem título" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Folha 2: Óptica" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(document.querySelectorAll(".notebook-page-index__thumb img")).toHaveLength(1);
    expect(screen.getByText("Lentes e espelhos")).toBeTruthy();
  });

  it("ir a uma folha seleciona e fecha", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <NotebookPageIndex pages={pages} currentPageId="a" onSelect={onSelect} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Folha 3: Sem título" }));
    expect(onSelect).toHaveBeenCalledWith("c");
    expect(onClose).toHaveBeenCalled();
  });

  it("reordena com os botões e desativa os extremos", () => {
    const onMove = vi.fn();
    render(
      <NotebookPageIndex
        pages={pages}
        currentPageId="a"
        onSelect={vi.fn()}
        onMove={onMove}
        onClose={vi.fn()}
      />,
    );
    expect(isDisabled("Mover a folha 1 para trás")).toBe(true);
    expect(isDisabled("Mover a folha 3 para frente")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Mover a folha 2 para frente" }));
    expect(onMove).toHaveBeenCalledWith("b", 1);
    fireEvent.click(screen.getByRole("button", { name: "Mover a folha 2 para trás" }));
    expect(onMove).toHaveBeenCalledWith("b", -1);
  });

  it("arrastar a miniatura para a posição de outra reordena, sem abrir a folha", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <NotebookPageIndex
        pages={pages}
        currentPageId="a"
        onSelect={onSelect}
        onReorder={onReorder}
        onClose={vi.fn()}
      />,
    );
    const items = document.querySelectorAll("li");
    const rects = [
      { left: 0, top: 0, width: 100, height: 100 },
      { left: 120, top: 0, width: 100, height: 100 },
      { left: 240, top: 0, width: 100, height: 100 },
    ];
    items.forEach((item, index) => {
      vi.spyOn(item, "getBoundingClientRect").mockReturnValue({
        ...rects[index]!,
        right: rects[index]!.left + rects[index]!.width,
        bottom: rects[index]!.height,
        x: rects[index]!.left,
        y: 0,
        toJSON: () => ({}),
      });
    });
    const first = screen.getByRole("button", { name: "Folha 1: Cinemática" });
    fireEvent.pointerDown(first, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerMove(first, { clientX: 290, clientY: 50 });
    fireEvent.pointerUp(first);
    expect(onReorder).toHaveBeenCalledWith("a", 2);
    fireEvent.click(first);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("um toque curto na miniatura, sem arrastar, continua abrindo a folha normalmente", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <NotebookPageIndex
        pages={pages}
        currentPageId="a"
        onSelect={onSelect}
        onReorder={onReorder}
        onClose={vi.fn()}
      />,
    );
    const first = screen.getByRole("button", { name: "Folha 1: Cinemática" });
    fireEvent.pointerDown(first, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerMove(first, { clientX: 51, clientY: 50 });
    fireEvent.pointerUp(first);
    fireEvent.click(first);
    expect(onReorder).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("sem onMove não mostra botões de mover, e Fechar chama onClose", () => {
    const onClose = vi.fn();
    render(
      <NotebookPageIndex pages={pages} currentPageId="a" onSelect={vi.fn()} onClose={onClose} />,
    );
    expect(screen.queryByRole("button", { name: /Mover a folha/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
