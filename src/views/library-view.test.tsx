import { fireEvent, render, screen, within } from "@testing-library/react";
import { useReducer } from "react";
import { expect, it } from "vitest";
import { LibraryView } from "./library-view";
import { createInitialWorkspace, workspaceReducer } from "../domain/workspace";

function Harness() {
  const [workspace, dispatch] = useReducer(workspaceReducer, {
    ...createInitialWorkspace(),
    materials: [
      {
        id: "m",
        title: "Equações",
        content: "Conteúdo de álgebra",
        kind: "text" as const,
        subjectId: "subject-math",
        createdAt: "2026-10-24",
      },
    ],
    flashcards: [
      {
        id: "f",
        front: "Pergunta",
        back: "Resposta oculta",
        subjectId: "subject-math",
        intervalDays: 0,
        nextReview: "2020-01-01",
      },
    ],
  });
  return <LibraryView workspace={workspace} dispatch={dispatch} />;
}
it("hides the answer until reveal and reviews each card only once per session", () => {
  render(<Harness />);
  expect(screen.queryByText("Resposta oculta")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Revisar flashcards" }));
  expect(screen.queryByText("Resposta oculta")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Revelar resposta" }));
  expect(screen.getByText("Resposta oculta")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Errei" }));
  expect(screen.getByText("Revisão concluída!")).toBeTruthy();
});
it("filters, archives, restores and confirms deletion", () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Buscar no acervo"), { target: { value: "missing" } });
  expect(screen.queryByRole("heading", { name: "Equações" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Buscar no acervo"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Arquivar material" }));
  expect(screen.queryByRole("heading", { name: "Equações" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Arquivados" }));
  fireEvent.click(screen.getByRole("button", { name: "Restaurar material" }));
  fireEvent.click(screen.getByRole("button", { name: "Arquivados" }));
  fireEvent.click(screen.getByRole("button", { name: "Excluir material" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
  expect(screen.getByRole("heading", { name: "Equações" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Excluir material" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Excluir" }));
  expect(screen.queryByRole("heading", { name: "Equações" })).toBeNull();
});
