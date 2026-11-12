import { render, screen } from "@testing-library/react";
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

describe("estante de cadernos", () => {
  it("mantém pastas antigas salvas e exibe só cadernos na estante", () => {
    const { getLatest } = renderShelf();
    expect(screen.queryByRole("button", { name: /Pasta A/ })).toBeNull();
    expect(getLatest().notebooks.some((notebook) => notebook.id === "folder-a")).toBe(true);
    expect(screen.getByRole("button", { name: /Caderno 1/ })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Crie" }).closest(".notebook-display-shelf"),
    ).toBeTruthy();
  });
});
