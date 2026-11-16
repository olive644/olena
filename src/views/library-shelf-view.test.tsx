import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceAction } from "../domain/workspace";
import { LibraryFolderContents } from "./library-shelf-view";

const stream = vi.hoisted(() => vi.fn());
const services = vi.hoisted(() => vi.fn());
vi.mock("../data/helena-client", () => ({ streamHelena: stream }));
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: services }));

const folder = { id: "pasta-1", title: "Tese", motif: "book" as const, createdAt: "2026-11-16" };
const source = {
  id: "fonte-1",
  title: "ENIAC.txt",
  kind: "text" as const,
  content: "O ENIAC foi um dos primeiros computadores eletrônicos, concluído em 1945.",
  subjectId: "materia-1",
  collectionId: "pasta-1",
  createdAt: "2026-11-16",
};

function signedIn() {
  services.mockResolvedValue({
    auth: { currentUser: { isAnonymous: false, getIdToken: async () => "token-da-conta" } },
  });
}

function renderFolder() {
  const dispatch = vi.fn<(action: WorkspaceAction) => void>();
  render(
    <LibraryFolderContents
      folder={folder}
      materials={[source]}
      subjectId="materia-1"
      dispatch={dispatch}
      onBack={() => undefined}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Resumo" }));
  fireEvent.click(screen.getByRole("button", { name: "Criar resumo" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Selecionar ENIAC.txt" }));
  return { dispatch, dialog };
}

describe("resumo estruturado com a Olena", () => {
  beforeEach(() => {
    stream.mockReset();
    services.mockReset();
  });

  it("pede o guia pela transmissão em fluxo e guarda o resumo na pasta", async () => {
    signedIn();
    stream.mockResolvedValue({
      version: 1,
      requestId: "r1",
      answer: "# O ENIAC\n\n## 1. Origem\nConcluído em 1945.",
      suggestions: [],
      generatedAt: "2026-11-16T12:00:00.000Z",
    });
    const { dispatch, dialog } = renderFolder();
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());

    const [request, options] = stream.mock.calls[0]!;
    expect(request.capability).toBe("summarize");
    expect(request.privacy).toEqual({ consent: true, retention: "none" });
    expect(request.sources).toEqual([
      expect.objectContaining({ id: "fonte-1", kind: "material", title: "ENIAC.txt" }),
    ]);
    expect(options.token).toBe("token-da-conta");
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "material/added",
        collectionId: "pasta-1",
        title: "O ENIAC",
        kind: "text",
        content: "## 1. Origem\nConcluído em 1945.",
        tags: ["folder-summary", "ENIAC.txt"],
      }),
    );
  });

  it("explica quando a pessoa não está logada, sem chamar a Olena", async () => {
    services.mockResolvedValue({ auth: { currentUser: null } });
    const { dispatch, dialog } = renderFolder();
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Entre na sua conta para gerar com a Olena.",
    );
    expect(stream).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("mostra o erro do serviço e não guarda nada quando a Olena falha", async () => {
    signedIn();
    stream.mockRejectedValue(new Error("Serviço indisponível. Tente mais tarde."));
    const { dispatch, dialog } = renderFolder();
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Serviço indisponível. Tente mais tarde.",
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("refaz um resumo antigo, sem seções, como guia estruturado a partir das mesmas fontes", async () => {
    signedIn();
    stream.mockResolvedValue({
      version: 1,
      requestId: "r2",
      answer: "# Guia do ENIAC\n\n## 1. Origem\nConcluído em 1945.",
      suggestions: [],
      generatedAt: "2026-11-16T12:00:00.000Z",
    });
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={[
          source,
          {
            id: "resumo-antigo",
            title: "Resumo do ENIAC",
            kind: "text",
            content: "O ENIAC foi um computador de 1945.",
            subjectId: "materia-1",
            collectionId: "pasta-1",
            createdAt: "2026-11-16",
            tags: ["folder-summary", "ENIAC.txt"],
          },
        ]}
        subjectId="materia-1"
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resumo" }));
    fireEvent.click(screen.getByRole("button", { name: /Resumo do ENIAC/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gerar resumo estruturado com a Olena" }));
    const dialog = screen.getByRole("dialog");
    expect(
      (within(dialog).getByRole("checkbox", { name: "Selecionar ENIAC.txt" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(stream.mock.calls[0]![0].sources).toEqual([
      expect.objectContaining({ id: "fonte-1", title: "ENIAC.txt" }),
    ]);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Guia do ENIAC", tags: ["folder-summary", "ENIAC.txt"] }),
    );
  });
});
