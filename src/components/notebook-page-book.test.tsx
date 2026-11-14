import { fireEvent, render, screen } from "@testing-library/react";
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
it("mantém a seta à direita na última folha e cria a próxima", () => {
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
    "/navigation-icons/paper/paper-editor-icon.svg#redo",
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
  fireEvent.click(next);
  expect(onSelect).toHaveBeenCalledWith("second");
});
