import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { LibraryFolderContents } from "./library-shelf-view";

const stream = vi.hoisted(() => vi.fn());
const services = vi.hoisted(() => vi.fn());
vi.mock("../data/helena-client", () => ({ streamHelena: stream }));
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: services }));
const pdfOpen = vi.hoisted(() => vi.fn());
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, getDocument: pdfOpen }));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "pdf.worker.js" }));
const recognized = vi.hoisted(() => vi.fn());
const terminate = vi.hoisted(() => vi.fn(async () => undefined));
const createWorker = vi.hoisted(() =>
  vi.fn(async () => ({
    recognize: async () => ({ data: { text: recognized() as string } }),
    terminate,
  })),
);
vi.mock("tesseract.js", () => ({ createWorker }));

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
    pdfOpen.mockReset();
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(stream.mock.calls[0]![0].sources).toEqual([
      expect.objectContaining({ id: "fonte-1", title: "ENIAC.txt" }),
    ]);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Guia do ENIAC", tags: ["folder-summary", "ENIAC.txt"] }),
    );
  });

  it("abre o PDF pelos bytes, sem pedir o endereço data: ao leitor", async () => {
    signedIn();
    const page = {
      getTextContent: async () => ({ items: [{ str: "O ENIAC foi concluído em 1945." }] }),
      cleanup: () => undefined,
    };
    pdfOpen.mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: async () => page }),
      destroy: async () => undefined,
    });
    stream.mockResolvedValue({
      version: 1,
      requestId: "r3",
      answer: "# Guia\n\n## 1. Origem\nTexto.",
      suggestions: [],
      generatedAt: "2026-11-16T12:00:00.000Z",
    });
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={[
          {
            ...source,
            id: "pdf-1",
            title: "eniac.pdf",
            kind: "pdf",
            content: "data:application/pdf;base64,JVBERi0xLjQK",
          },
        ]}
        subjectId="materia-1"
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resumo" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar resumo" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Selecionar eniac.pdf" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const options = pdfOpen.mock.calls[0]![0];
    expect(options.url).toBeUndefined();
    expect(options.data).toBeInstanceOf(Uint8Array);
    expect(stream.mock.calls[0]![0].sources[0].content).toContain("Página 1: O ENIAC");
  });

  it("explica em português quando o PDF não abre", async () => {
    signedIn();
    pdfOpen.mockReturnValue({
      promise: Promise.reject(new Error("Unexpected server response (0) while retrieving PDF")),
      destroy: async () => undefined,
    });
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={[
          {
            ...source,
            id: "pdf-2",
            title: "quebrado.pdf",
            kind: "pdf",
            content: "data:application/pdf;base64,JVBERi0xLjQK",
          },
        ]}
        subjectId="materia-1"
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resumo" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar resumo" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Selecionar quebrado.pdf" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Não consegui abrir o PDF quebrado.pdf.",
    );
    expect(stream).not.toHaveBeenCalled();
  });
});

describe("resumo automático no aparelho", () => {
  const longText = [
    "# O ENIAC",
    "O ENIAC foi concluído em 1945 na Universidade da Pensilvânia, nos Estados Unidos. Ele foi um dos primeiros computadores eletrônicos de uso geral e foi construído para calcular tabelas de tiro da artilharia.",
    "Usava cerca de 18 mil válvulas e pesava aproximadamente 30 toneladas. A programação era feita por cabos e chaves, que precisavam ser reconectados a cada nova tarefa.",
    "A ideia do programa armazenado foi descrita em 1945 por John von Neumann. Os computadores seguintes passaram a usar essa arquitetura, que continua sendo a base das máquinas atuais.",
  ].join("\n\n");

  beforeEach(() => {
    stream.mockReset();
    services.mockReset();
    pdfOpen.mockReset();
    recognized.mockReset();
    createWorker.mockClear();
    terminate.mockClear();
  });

  function renderWith(material: WorkspaceState["materials"][number]) {
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={[material]}
        subjectId="materia-1"
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resumo" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar resumo" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: `Selecionar ${material.title}` }));
    return { dispatch, dialog };
  }

  it("resume um texto sem login, sem rede e sem chamar a Olena", async () => {
    const { dispatch, dialog } = renderWith({ ...source, content: longText });
    fireEvent.click(within(dialog).getByRole("button", { name: "Resumo automático" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(services).not.toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();
    const action = dispatch.mock.calls[0]![0];
    expect(action).toEqual(
      expect.objectContaining({
        type: "material/added",
        kind: "text",
        collectionId: "pasta-1",
        tags: ["folder-summary", "ENIAC.txt"],
      }),
    );
    if (action.type !== "material/added") throw new Error("ação inesperada");
    expect(action.content).toContain("Sobre este resumo");
    expect(action.content).not.toMatch(/[\u2013\u2014]/);
  });

  const scannedPdf = () => {
    const page = {
      getViewport: () => ({ width: 600, height: 800 }),
      getTextContent: async () => ({ items: [] }),
      render: () => ({ promise: Promise.resolve() }),
      cleanup: () => undefined,
    };
    pdfOpen.mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: async () => page }),
      destroy: async () => undefined,
    });
    return renderWith({
      ...source,
      id: "pdf-3",
      title: "escaneado.pdf",
      kind: "pdf",
      content: "data:application/pdf;base64,JVBERi0xLjQK",
    });
  };

  it("lê PDF escaneado com OCR em português e resume o texto", async () => {
    recognized.mockReturnValue(
      "A fotossíntese é o processo pelo qual as plantas transformam energia luminosa em energia química.\n\nNesse processo, a planta usa gás carbônico, água e luz para produzir glicose e liberar oxigênio.\n\nO cloroplasto é a organela que contém a clorofila, pigmento verde que absorve a luz do sol.",
    );
    const { dispatch, dialog } = scannedPdf();
    fireEvent.click(within(dialog).getByRole("button", { name: "Resumo automático" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(createWorker).toHaveBeenCalledWith("por", 1, expect.anything());
    expect(terminate).toHaveBeenCalled();
    const action = dispatch.mock.calls[0]![0];
    if (action.type !== "material/added") throw new Error("ação inesperada");
    expect(action.content).toContain("fotossíntese");
    expect(stream).not.toHaveBeenCalled();
  });

  it("explica quando nem o OCR encontra texto", async () => {
    recognized.mockReturnValue("");
    const { dispatch, dialog } = scannedPdf();
    fireEvent.click(within(dialog).getByRole("button", { name: "Resumo automático" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Não encontrei texto em escaneado.pdf, nem lendo as imagens. Se a foto estiver torta ou borrada, tente outra ou use a Olena.",
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("lê o texto de uma imagem no aparelho e resume sem a Olena", async () => {
    recognized.mockReturnValue(
      "A fotossíntese é o processo pelo qual as plantas produzem energia a partir da luz. " +
        "A clorofila absorve a luz do sol dentro dos cloroplastos. " +
        "Sem luz, a planta não consegue produzir o açúcar de que precisa para crescer.",
    );
    const { dispatch, dialog } = renderWith({
      ...source,
      id: "img-1",
      title: "foto.png",
      kind: "image",
      content: "data:image/png;base64,AAAA",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Resumo automático" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(createWorker).toHaveBeenCalledWith("por", 1, expect.anything());
    expect(terminate).toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();
  });

  it("avisa quando nem o OCR acha texto na imagem", async () => {
    recognized.mockReturnValue("");
    const { dispatch, dialog } = renderWith({
      ...source,
      id: "img-2",
      title: "foto.png",
      kind: "image",
      content: "data:image/png;base64,AAAA",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Resumo automático" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("não oferece escolher o tamanho: o resumo grátis já sai no máximo", () => {
    const { dialog } = renderWith(source);
    expect(
      within(dialog).queryByRole("group", { name: "Tamanho do resumo automático" }),
    ).toBeNull();
    expect(within(dialog).queryByRole("radio", { name: "Curto" })).toBeNull();
  });

  function openFlashcards(content: string) {
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={[{ ...source, content }]}
        subjectId="materia-1"
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar flashcards" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: `Selecionar ${source.title}` }));
    return { dispatch, dialog };
  }

  it("cria flashcards no aparelho, sem login, sem rede e sem a Olena, sem escolher tamanho", async () => {
    const { dispatch, dialog } = openFlashcards(longText);
    expect(within(dialog).queryByRole("radio")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Gerar com a Olena" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Flashcards automáticos" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(services).not.toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();
    const action = dispatch.mock.calls[0]![0];
    if (action.type !== "flashcards/imported") throw new Error("ação inesperada");
    expect(action.subjectId).toBe("materia-1");
    expect(action.cards.length).toBeGreaterThan(0);
    expect(action.cards.every((card) => card.deck === folder.title)).toBe(true);
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("avisa quando o texto não rende nenhum flashcard", async () => {
    const { dispatch, dialog } = openFlashcards("Oi.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Flashcards automáticos" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("lista na pasta os flashcards do baralho dela, com a resposta ao abrir", () => {
    render(
      <LibraryFolderContents
        folder={folder}
        materials={[source]}
        subjectId="materia-1"
        flashcards={[
          {
            id: "c1",
            subjectId: "materia-1",
            deck: folder.title,
            front: "O que é o ENIAC?",
            back: "Um dos primeiros computadores eletrônicos.",
            intervalDays: 0,
            nextReview: "2026-11-17",
          },
        ]}
        dispatch={vi.fn()}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));
    const list = screen.getByRole("list", { name: "Flashcards desta pasta" });
    expect(within(list).getByText("O que é o ENIAC?")).toBeTruthy();
    expect(within(list).getByText("Um dos primeiros computadores eletrônicos.")).toBeTruthy();
    expect(screen.queryByText("Ainda não há flashcards")).toBeNull();
  });
});
