import { act, render } from "@testing-library/react";
import { useReducer } from "react";
import { expect, it, vi } from "vitest";
import { NotesView } from "./notes-view";
import { createInitialWorkspace, workspaceReducer, type WorkspaceState } from "../domain/workspace";
import type { useNotebookCollaboration } from "../hooks/use-notebook-collaboration";

let options: Parameters<typeof useNotebookCollaboration>[0];
vi.mock("../hooks/use-notebook-collaboration", () => ({
  useNotebookCollaboration: (next: typeof options) => {
    options = next;
    return { state: { code: "", status: "idle", error: "" }, join: vi.fn(), syncPages: vi.fn() };
  },
}));

it("convite na mesma conta isola IDs locais sem perder as folhas do caderno original", () => {
  let initial = createInitialWorkspace();
  for (const id of ["owner", "shared-ABCDE"])
    initial = workspaceReducer(initial, {
      type: "notebook/added",
      id,
      title: id,
      subjectId: "",
      createdAt: "2026-09-26",
    });
  initial = workspaceReducer(initial, {
    type: "note/added",
    id: "original-page",
    notebookId: "owner",
    subjectId: "",
    updatedAt: "2026-09-26",
  });
  let latest: WorkspaceState = initial;
  function Screen() {
    const [workspace, dispatch] = useReducer(workspaceReducer, initial);
    latest = workspace;
    return <NotesView workspace={workspace} dispatch={dispatch} initialNotebookId="shared-ABCDE" />;
  }
  render(<Screen />);
  const room = {
    code: "ABCDE",
    notebookId: "owner",
    pages: [
      {
        id: "original-page",
        title: "Do colega",
        document: { version: 1 as const, paper: "ruled" as const, strokes: [] },
      },
    ],
    participants: [],
    actions: [],
    revision: 1,
    createdAt: 0,
    updatedAt: 0,
    expiresAt: 99999,
  };
  act(() => options.onRoom?.(room));
  expect(latest.notebooks.find((book) => book.id === "shared-ABCDE")?.pageIds).toEqual([
    "shared-ABCDE:original-page",
  ]);
  expect(latest.notes.find((note) => note.id === "original-page")?.title).toBe("Nova folha");
  expect(options.pages?.[0]?.id).toBe("original-page");
  act(() => options.onRoom?.({ ...room, revision: 2, pages: [] }));
  expect(latest.notes.some((note) => note.id === "original-page")).toBe(true);
  expect(latest.notes.some((note) => note.id === "shared-ABCDE:original-page")).toBe(false);
});
