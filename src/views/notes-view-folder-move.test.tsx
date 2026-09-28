import { fireEvent, render, screen, within } from "@testing-library/react";
import { useReducer } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotesView } from "./notes-view";
import { createInitialWorkspace, workspaceReducer, type WorkspaceState } from "../domain/workspace";

vi.mock("../hooks/use-notebook-collaboration", () => ({
  useNotebookCollaboration: () => ({
    state: { code: "", status: "idle", error: "" },
    join: vi.fn(),
    syncPages: vi.fn(),
  }),
}));

afterEach(() => {
  localStorage.clear();
});

function buildWorkspace(): WorkspaceState {
  let workspace = createInitialWorkspace();
  const subjectId = workspace.subjects[0]!.id;
  workspace = workspaceReducer(workspace, {
    type: "notebook/added",
    kind: "collection",
    id: "folder-a",
    title: "Pasta A",
    subjectId,
    createdAt: "2026-09-28",
  });
  workspace = workspaceReducer(workspace, {
    type: "notebook/added",
    id: "book-1",
    title: "Caderno 1",
    subjectId,
    createdAt: "2026-09-28",
  });
  return workspace;
}

function renderShelf() {
  const initial = buildWorkspace();
  let latest: WorkspaceState = initial;
  function Screen() {
    const [workspace, dispatch] = useReducer(workspaceReducer, initial);
    latest = workspace;
    return <NotesView workspace={workspace} dispatch={dispatch} />;
  }
  render(<Screen />);
  return { getLatest: () => latest };
}

describe("mover cadernos para pasta pelo teclado, sem arrastar", () => {
  it("move o caderno selecionado para a pasta escolhida", () => {
    const { getLatest } = renderShelf();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir Caderno 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover para pasta (1)" }));
    const dialog = screen.getByRole("dialog", { name: "Mover para pasta" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Pasta A" }));
    expect(getLatest().notebooks.find((book) => book.id === "book-1")?.parentId).toBe("folder-a");
    expect(screen.getByText("1 item movido para Pasta A.")).toBeTruthy();
  });

  it("move de volta para a vitrine", () => {
    renderShelf();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir Caderno 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Mover para pasta/ }));
    const dialog = screen.getByRole("dialog", { name: "Mover para pasta" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Vitrine (tirar da pasta)" }));
    expect(screen.getByText("1 item movido para a vitrine.")).toBeTruthy();
  });

  it("avisa quando a pasta já está cheia (limite de três itens)", () => {
    let workspace = buildWorkspace();
    for (const id of ["already-1", "already-2", "already-3"]) {
      workspace = workspaceReducer(workspace, {
        type: "notebook/added",
        id,
        title: id,
        subjectId: workspace.subjects[0]!.id,
        createdAt: "2026-09-28",
      });
      workspace = workspaceReducer(workspace, {
        type: "notebook/stored",
        id,
        folderId: "folder-a",
      });
    }
    function Screen() {
      const [state, dispatch] = useReducer(workspaceReducer, workspace);
      return <NotesView workspace={state} dispatch={dispatch} />;
    }
    render(<Screen />);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir Caderno 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Mover para pasta/ }));
    const dialog = screen.getByRole("dialog", { name: "Mover para pasta" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Pasta A" }));
    expect(
      screen.getByText("A pasta Pasta A já tem três itens. Escolha outra pasta."),
    ).toBeTruthy();
  });

  it("Fechar não move nada", () => {
    renderShelf();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir Caderno 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Mover para pasta/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog", { name: "Mover para pasta" })).toBeNull();
    expect(screen.queryByText(/movido/)).toBeNull();
  });
});
