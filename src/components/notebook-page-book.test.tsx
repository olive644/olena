import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NotebookPageBook } from "./notebook-page-book";
import type { StudyNote } from "../domain/workspace";

const pages: StudyNote[] = ["first", "second"].map((id) => ({
  id,
  title: id,
  content: "",
  subjectId: "",
  updatedAt: "2026-11-14",
  assets: [],
}));
it("mostra o ícone de adicionar na página vazia e cria somente ao clicar", () => {
  const onCreate = vi.fn();
  render(
    <NotebookPageBook
      pages={pages.slice(0, 1)}
      currentPageId="first"
      onSelect={vi.fn()}
      onCreate={onCreate}
    />,
  );
  const next = screen.getByRole("button", { name: "Criar próxima folha" });
  expect(next.querySelector("use")?.getAttribute("href")).toBe(
    "/navigation-icons/paper/paper-editor-icon.svg#add",
  );
  fireEvent.click(next);
  expect(onCreate).toHaveBeenCalledOnce();
});
it("usa a mesma seta para avançar a uma folha existente", () => {
  const onSelect = vi.fn();
  render(
    <NotebookPageBook pages={pages} currentPageId="first" onSelect={onSelect} onCreate={vi.fn()} />,
  );
  const next = screen.getByRole("button", { name: "Próxima folha" });
  expect(next.querySelector("use")?.getAttribute("href")).toBe(
    "/navigation-icons/paper/paper-editor-icon.svg#redo",
  );
  vi.useFakeTimers();
  try {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    fireEvent.click(next);
    expect(onSelect).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(620));
  } finally {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
  expect(onSelect).toHaveBeenCalledWith("second");
});
