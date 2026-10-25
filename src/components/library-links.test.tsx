import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LibraryLinks, NoteFlashcardTools } from "./library-links";
import { createInitialWorkspace } from "../domain/workspace";

it("creates a card from a Note only after the answer is supplied, preserving source", () => {
  const workspace = createInitialWorkspace(),
    dispatch = vi.fn();
  const note = {
    id: "n",
    title: "Álgebra",
    content: "Uma igualdade",
    subjectId: "math",
    assets: [],
    updatedAt: "2026-10-25",
  };
  render(<NoteFlashcardTools note={note} workspace={workspace} dispatch={dispatch} />);
  fireEvent.click(screen.getByRole("button", { name: "Criar flashcard do trecho" }));
  const dialog = screen.getByRole("dialog");
  expect((within(dialog).getByLabelText("Frente") as HTMLTextAreaElement).value).toBe(
    "Uma igualdade",
  );
  fireEvent.change(within(dialog).getByLabelText("Verso"), {
    target: { value: "Dois lados iguais" },
  });
  fireEvent.submit(dialog.querySelector("form")!);
  expect(dispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "flashcard/added",
      noteId: "n",
      front: "Uma igualdade",
      back: "Dois lados iguais",
    }),
  );
});

it("opens linked materials internally and unlinks without deleting the material", () => {
  const workspace = createInitialWorkspace(),
    dispatch = vi.fn();
  workspace.materials = [
    {
      id: "m",
      title: "Fonte",
      subjectId: "math",
      kind: "text",
      content: "Data",
      createdAt: "2026-10-25",
    },
  ];
  render(
    <LibraryLinks
      workspace={workspace}
      dispatch={dispatch}
      kind="task"
      item={{ id: "t", materialIds: ["m"] }}
    />,
  );
  expect(screen.getByRole("link", { name: "Fonte" }).getAttribute("href")).toBe(
    "/biblioteca?material=m",
  );
  fireEvent.click(screen.getByRole("button", { name: "Desvincular material" }));
  expect(dispatch).toHaveBeenCalledWith({
    type: "library/linked",
    kind: "task",
    id: "t",
    materialId: "m",
    remove: true,
  });
});
