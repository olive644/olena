import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NotesView } from "./notes-view";
import { createInitialWorkspace } from "../domain/workspace";

vi.mock("../hooks/use-notebook-collaboration", () => ({
  useNotebookCollaboration: () => ({
    state: { code: "", status: "idle", error: "" },
    join: vi.fn(),
    syncPages: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it.each(["note", "handwriting"] as const)(
  "%s: ferramentas de cartões e fontes pertencem apenas à nota de texto",
  (kind) => {
    const workspace = createInitialWorkspace();
    const subjectId = workspace.subjects[0]!.id;
    workspace.notes = [
      {
        id: "text-source",
        title: "Revisão",
        content: "Uma equação preserva a igualdade.",
        subjectId,
        assets: [],
        updatedAt: "2026-11-16",
      },
    ];
    workspace.notebooks = [
      {
        id: "source-book",
        title: "Revisão",
        ...(kind === "note" ? { kind: "note" as const } : {}),
        subjectId,
        pageIds: ["text-source"],
        createdAt: "2026-11-16",
      },
    ];
    const dispatch = vi.fn();
    render(
      <NotesView workspace={workspace} dispatch={dispatch} initialNotebookId="source-book" />,
    );
    const create = screen.queryByRole("button", { name: "Criar flashcard do trecho", exact: true });
    if (kind === "handwriting") {
      expect(create).toBeNull();
      expect(screen.queryByRole("button", { name: "Vincular material", exact: true })).toBeNull();
      return;
    }
    expect(create).not.toBeNull();
    expect(screen.getByRole("button", { name: "Vincular material", exact: true })).toBeTruthy();
    fireEvent.click(create!);
    expect(
      (screen.getByRole("textbox", { name: "Frente", exact: true }) as HTMLTextAreaElement).value,
    ).toBe("Uma equação preserva a igualdade.");
    fireEvent.change(screen.getByRole("textbox", { name: "Verso", exact: true }), {
      target: { value: "Dois lados iguais" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar flashcard", exact: true }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "flashcard/added",
        noteId: "text-source",
        front: "Uma equação preserva a igualdade.",
        back: "Dois lados iguais",
      }),
    );
  },
);
