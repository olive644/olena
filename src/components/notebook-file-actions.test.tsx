import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NotebookFileActions } from "./notebook-file-actions";
import { downloadNotebookPdf } from "../data/notebook-export";
import type { StudyNote } from "../domain/workspace";

vi.mock("../data/notebook-export", () => ({ downloadNotebookPdf: vi.fn(async () => {}) }));
vi.mock("../data/room-app-check", () => ({ roomAppCheckToken: async () => undefined }));
const page: StudyNote = {
  id: "one",
  title: "Exercícios",
  content: "",
  subjectId: "",
  updatedAt: "",
  assets: [],
};
function setup(pages: StudyNote[] = [page]) {
  const onSave = vi.fn();
  render(
    <NotebookFileActions
      pages={pages}
      currentPageId="one"
      currentImage={() => "data:image/png;base64,AA=="}
      onSave={onSave}
      onUpload={() => {}}
      onPng={() => {}}
      onPdf={() => {}}
      onPrint={() => {}}
    />,
  );
  return { onSave };
}
it("salva explicitamente e oferece download seletivo somente para múltiplas folhas", () => {
  const { onSave } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
  expect(screen.queryByRole("button", { name: "Selecionar folhas para download" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Salvar caderno" }));
  expect(onSave).toHaveBeenCalledOnce();
});
it("baixa somente as folhas escolhidas e usa a versão atual do editor", async () => {
  setup([page, { ...page, id: "two", title: "Outra folha" }]);
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
  fireEvent.click(screen.getByRole("button", { name: "Selecionar folhas para download" }));
  const dialog = screen.getByRole("dialog", { name: "Selecionar folhas para download" });
  expect(within(dialog).getAllByRole("checkbox")).toHaveLength(2);
  fireEvent.click(within(dialog).getByRole("button", { name: "Baixar PDF selecionado" }));
  await waitFor(() =>
    expect(downloadNotebookPdf).toHaveBeenCalledWith(["data:image/png;base64,AA=="]),
  );
});
it("envia uma cópia somente após confirmação e mostra o link de leitura", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ token: "read-only-token" }));
  vi.stubGlobal("fetch", fetchMock);
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
  fireEvent.click(screen.getByRole("button", { name: "Link de visualização" }));
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Criar link" }));
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Link somente para leitura" }).getAttribute("value"),
    ).toContain("notebook-view=read-only-token"),
  );
  expect(fetchMock.mock.calls[0]?.[0]).toContain("action=view-create");
});
