import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NotebookSpread } from "./notebook-spread";
import { createInitialWorkspace, workspaceReducer } from "../domain/workspace";
import { isHandwritingDocument, loadWorkspace } from "../data/local-workspace";
import { notebookPaperTabs } from "./notebook-paper-tools";

it("edita o título no preview sem abrir editor e permite cancelar", () => {
  const state = fixture();
  const notebook = state.notebooks[0]!;
  const pages = notebook.pageIds.map((id) => state.notes.find((page) => page.id === id)!);
  const dispatch = vi.fn();
  const onOpen = vi.fn();
  render(
    <NotebookSpread
      notebook={notebook}
      pages={pages}
      subjects={state.subjects}
      dispatch={dispatch}
      onOpen={onOpen}
      onCreate={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  const title = screen.getByRole("textbox", { name: "Título da folha 1" });
  fireEvent.change(title, { target: { value: "  Constelações  " } });
  fireEvent.blur(title);
  expect(dispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "note/updated",
      id: "one",
      title: "Constelações",
      content: pages[0]!.content,
    }),
  );
  expect(onOpen).not.toHaveBeenCalled();
  dispatch.mockClear();
  fireEvent.change(title, { target: { value: "Descartar" } });
  fireEvent.keyDown(title, { key: "Escape" });
  fireEvent.blur(title);
  expect(dispatch).not.toHaveBeenCalled();
});

it("oferece Sol e preserva o modelo do marcador ao recarregar", () => {
  const state = fixture();
  const notebook = state.notebooks[0]!;
  const pages = notebook.pageIds.map((id) => state.notes.find((page) => page.id === id)!);
  const paperTabs = [
    {
      id: "marker",
      kind: "bookmark" as const,
      pageId: "one",
      label: "Ideias",
      color: "#FACC15",
      position: 0.4,
    },
  ];
  const dispatch = vi.fn();
  render(
    <NotebookSpread
      notebook={{ ...notebook, paperTabs }}
      pages={pages}
      subjects={state.subjects}
      dispatch={dispatch}
      onOpen={vi.fn()}
      onCreate={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Editar marcas" }));
  fireEvent.click(screen.getByRole("button", { name: "Marcador Ideias, folha 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Sol" }));
  const action = dispatch.mock.calls[0]![0];
  expect(action.changes.paperTabs[0].motif).toBe("sun");
  const updated = workspaceReducer(state, action);
  expect(
    loadWorkspace({ getItem: () => JSON.stringify(updated) }).notebooks[0]?.paperTabs?.[0]?.motif,
  ).toBe("sun");
});

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

it("mostra duas folhas reais e navega até a última sem perder a criação", async () => {
  const state = fixture();
  const onOpen = vi.fn();
  const onCreate = vi.fn();
  const notebook = state.notebooks[0]!;
  const pages = notebook.pageIds.map((id) => state.notes.find((note) => note.id === id)!);
  const paperTabs = notebookPaperTabs(notebook, pages, state.subjects);
  paperTabs.push({
    id: "moon-bookmark",
    kind: "bookmark",
    pageId: "one",
    label: "Lua",
    color: "#FACC15",
    position: 0.35,
  });
  render(
    <NotebookSpread
      notebook={{ ...notebook, paperTabs }}
      pages={pages}
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
  expect(
    screen.getByRole("button", { name: "Marcador Lua, folha 1" }).getAttribute("aria-current"),
  ).toBe("page");
  fireEvent.click(screen.getByRole("button", { name: "Próxima ›" }));
  await waitFor(() => expect(screen.getByText("Folhas 3 de 3")).toBeTruthy());
  expect(screen.getByRole("button", { name: "Divisória Matemática, folha 1" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Marcador Lua, folha 1" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Marcador Lua, folha 1" }).hasAttribute("aria-current"),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Criar próxima folha" }));
  expect(onCreate).toHaveBeenCalledWith("");
  expect(screen.getByRole("button", { name: "Divisória Matemática, folha 1" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Marcador Lua, folha 1" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "‹ Anterior" }));
  await waitFor(() => expect(screen.getByText("Folhas 1 e 2 de 3")).toBeTruthy());
  expect(
    screen.getByRole("button", { name: "Marcador Lua, folha 1" }).getAttribute("aria-current"),
  ).toBe("page");
  fireEvent.click(screen.getByRole("button", { name: "Divisória Matemática, folha 1" }));
  await waitFor(() => expect(screen.getByText("Folhas 1 e 2 de 3")).toBeTruthy());
  expect(screen.getAllByRole("button", { name: /Abrir preview/ })).toHaveLength(2);
});

it("converte marcações antigas em peças e preserva posição, cor e folha", () => {
  let state = fixture();
  const notebook = state.notebooks[0]!;
  const pages = notebook.pageIds.map((id) => state.notes.find((page) => page.id === id)!);
  const tabs = notebookPaperTabs(
    { ...notebook, bookmarkedPageIds: ["two"] },
    pages,
    state.subjects,
  );
  expect(tabs.map((tab) => [tab.kind, tab.pageId])).toEqual([
    ["divider", "one"],
    ["bookmark", "two"],
  ]);
  tabs[0] = { ...tabs[0]!, position: 0.8, color: "#FACC15", label: "Ideias", pageId: "three" };
  state = workspaceReducer(state, {
    type: "notebook/organized",
    id: "book",
    changes: { paperTabs: tabs },
  });
  expect(loadWorkspace({ getItem: () => JSON.stringify(state) }).notebooks[0]?.paperTabs).toEqual(
    tabs,
  );
  state = workspaceReducer(state, { type: "note/removed", notebookId: "book", noteId: "three" });
  expect(state.notebooks[0]?.paperTabs?.map((tab) => tab.pageId)).toEqual(["two"]);
  expect(state.notes.find((page) => page.id === "two")).toBeTruthy();
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

it("ordena divisórias, muda a posição e conserva folhas marcadas", () => {
  let state = fixture();
  state = workspaceReducer(state, {
    type: "subject/added",
    id: "history",
    name: "História",
    color: "#ac365e",
  });
  state = workspaceReducer(state, {
    type: "notebook/subject-linked",
    id: "book",
    subjectId: "history",
  });
  state = workspaceReducer(state, {
    type: "notebook/organized",
    id: "book",
    changes: { subjectIds: ["history", "math"] },
  });
  state = workspaceReducer(state, {
    type: "notebook/organized",
    id: "book",
    changes: { dividerPosition: "bottom" },
  });
  state = workspaceReducer(state, {
    type: "notebook/organized",
    id: "book",
    changes: { bookmarkedPageIds: ["two"] },
  });
  const loaded = loadWorkspace({ getItem: () => JSON.stringify(state) });
  expect(loaded.notebooks[0]?.subjectIds).toEqual(["history", "math"]);
  expect(loaded.notebooks[0]?.dividerPosition).toBe("bottom");
  expect(loaded.notebooks[0]?.bookmarkedPageIds).toEqual(["two"]);
});
