import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NotebookSpread } from "./notebook-spread";
import { createInitialWorkspace, workspaceReducer } from "../domain/workspace";
import { isHandwritingDocument, loadWorkspace } from "../data/local-workspace";

function fixture() {
  let state = workspaceReducer(createInitialWorkspace(), {
    type: "notebook/added",
    id: "book",
    title: "Ciências",
    subjectId: "",
    createdAt: "2026-09-25",
  });
  state = workspaceReducer(state, {
    type: "subject/added",
    id: "math",
    name: "Matemática",
    color: "#7C3AED",
  });
  state = workspaceReducer(state, {
    type: "notebook/subject-linked",
    id: "book",
    subjectId: "math",
  });
  for (const id of ["one", "two", "three"])
    state = workspaceReducer(state, {
      type: "note/added",
      id,
      notebookId: "book",
      subjectId: "",
      updatedAt: "2026-09-25",
      append: true,
    });
  return state;
}

it("mostra duas folhas reais e navega até a última sem perder a criação", () => {
  const state = fixture();
  const onOpen = vi.fn();
  const onCreate = vi.fn();
  render(
    <NotebookSpread
      notebook={state.notebooks[0]!}
      pages={state.notebooks[0]!.pageIds.map((id) => state.notes.find((note) => note.id === id)!)}
      subjects={state.subjects}
      dispatch={vi.fn()}
      onOpen={onOpen}
      onCreate={onCreate}
      onRemove={vi.fn()}
    />,
  );
  expect(screen.getAllByRole("button", { name: /Abrir preview/ })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: /Abrir preview.*folha 2$/ }));
  expect(onOpen).toHaveBeenCalledWith("two");
  fireEvent.click(screen.getByRole("button", { name: "Próxima ›" }));
  expect(screen.getByText("Folhas 3 de 3")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Criar próxima folha" }));
  expect(onCreate).toHaveBeenCalledWith("");
  fireEvent.click(screen.getByRole("button", { name: "Matemática" }));
  fireEvent.click(screen.getByRole("button", { name: "Criar próxima folha" }));
  expect(onCreate).toHaveBeenLastCalledWith("math");
});

it("preserva divisórias, conteúdo e atribuições ao recarregar", () => {
  const state = workspaceReducer(fixture(), {
    type: "note/subject-changed",
    id: "two",
    subjectId: "math",
    updatedAt: "2026-09-26",
  });
  const loaded = loadWorkspace({ getItem: () => JSON.stringify(state) });
  expect(loaded.notebooks[0]?.subjectIds).toEqual(["math"]);
  expect(loaded.notes.find((note) => note.id === "two")?.subjectId).toBe("math");
  expect(loaded.notebooks[0]?.pageIds).toEqual(["one", "two", "three"]);
  expect(
    workspaceReducer(state, {
      type: "note/subject-changed",
      id: "two",
      subjectId: "missing",
      updatedAt: "now",
    }),
  ).toBe(state);
  for (const paper of ["weekly", "calendar"])
    expect(isHandwritingDocument({ version: 1, paper, strokes: [], stickies: [] })).toBe(true);
});
