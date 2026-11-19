import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { LibraryFolderContents } from "./library-shelf-view";

const stream = vi.hoisted(() => vi.fn());
const services = vi.hoisted(() => vi.fn());
const request = vi.hoisted(() => vi.fn());
vi.mock("../data/helena-client", () => ({ streamHelena: stream, requestHelena: request }));
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

describe("flashcards, quiz e simulado com a Olena", () => {
  beforeEach(() => {
    stream.mockReset();
    request.mockReset();
    services.mockReset();
    pdfOpen.mockReset();
  });

  const reply = (answer: string) => ({
    version: 1,
    requestId: "r",
    answer,
    suggestions: [],
    generatedAt: "2026-11-19T12:00:00.000Z",
  });
  const questions = JSON.stringify({
    questions: [
      {
        prompt: "x",
        question: "Em que ano o ENIAC foi concluído?",
        options: ["1939", "1945", "1957", "1969"],
        answer: 1,
        explanation: "Concluído em 1945.",
      },
      {
        question: "Quantas válvulas o ENIAC usava?",
        options: ["18 mil", "2 mil", "100", "1 milhão"],
        answer: 0,
        explanation: "Cerca de 18 mil.",
      },
    ],
  });
  const cards = JSON.stringify({
    cards: [1, 2, 3, 4].map((n) => ({ front: `Pergunta ${n}?`, back: `Resposta ${n}` })),
  });

  function open(tab: string, action: string, materials: WorkspaceState["materials"] = [source]) {
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={materials}
        subjectId="materia-1"
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: tab }));
    fireEvent.click(screen.getByRole("button", { name: action }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Selecionar ENIAC.txt" }));
    return { dispatch, dialog };
  }

  it("não há mais caminho gratuito no aparelho: só 'Gerar com a Olena', com aviso de envio e do limite", () => {
    signedIn();
    for (const [tab, action] of [
      ["Resumo", "Criar resumo"],
      ["Flashcards", "Criar flashcards"],
      ["Quizzes", "Criar quiz"],
      ["Simulados", "Criar simulado"],
    ] as const) {
      const { dialog } = open(tab, action);
      const buttons = within(dialog)
        .getAllByRole("button")
        .map((button) => button.textContent);
      expect(buttons).toContain("Gerar com a Olena");
      for (const free of [
        "Resumo automático",
        "Flashcards automáticos",
        "Quiz automático",
        "Gerar simulado",
      ])
        expect(buttons).not.toContain(free);
      expect(dialog.textContent).toContain("o texto das fontes selecionadas é enviado a ela");
      expect(dialog.textContent).toContain("2 vezes por dia");
      cleanup();
    }
  });

  it("flashcards: pede à Olena só números, manda o texto e guarda o baralho", async () => {
    signedIn();
    request.mockResolvedValue(reply(cards));
    const { dispatch, dialog } = open("Flashcards", "Criar flashcards");
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const [sent, options] = request.mock.calls[0]!;
    expect(sent.capability).toBe("flashcards");
    expect(sent.prompt).toBe("count=12");
    expect(sent.privacy).toEqual({ consent: true, retention: "none" });
    expect(sent.sources[0]).toMatchObject({ id: "fonte-1", title: "ENIAC.txt" });
    expect(options.token).toBe("token-da-conta");
    const added = dispatch.mock.calls.map(([a]) => a).filter((a) => a.type === "flashcard/added");
    expect(added).toHaveLength(4);
    expect(added[0]).toMatchObject({ deck: "ENIAC", materialId: "fonte-1", front: "Pergunta 1?" });
  });

  it("quiz: guarda as questões no formato do estudo, com a dificuldade escolhida", async () => {
    signedIn();
    request.mockResolvedValue(reply(questions));
    const { dispatch, dialog } = open("Quizzes", "Criar quiz");
    fireEvent.click(within(dialog).getByRole("button", { name: "Difícil" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Longo" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(request.mock.calls[0]![0]).toMatchObject({
      capability: "quiz",
      prompt: "count=15;options=4;difficulty=hard",
    });
    const action = dispatch.mock.calls[0]![0];
    if (action.type !== "material/added") throw new Error("ação inesperada");
    expect(action.tags).toEqual(["folder-quiz", "ENIAC.txt"]);
    const quiz = JSON.parse(action.content) as {
      difficulty: string;
      questions: { options: string[]; answer: number; page: number }[];
    };
    expect(quiz.difficulty).toBe("hard");
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[0]!.options[quiz.questions[0]!.answer]).toBe("1945");
    expect(quiz.questions[0]!.page).toBe(0);
  });

  it("simulado: usa o pedido de simulado e guarda como prova", async () => {
    signedIn();
    request.mockResolvedValue(reply(questions));
    const { dispatch, dialog } = open("Simulados", "Criar simulado");
    expect(dialog.textContent).toContain("podem estar erradas");
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(request.mock.calls[0]![0]).toMatchObject({
      capability: "exam",
      prompt: "count=15;options=4;difficulty=medium",
    });
    const action = dispatch.mock.calls[0]![0];
    if (action.type !== "material/added") throw new Error("ação inesperada");
    expect(action.tags?.[0]).toBe("folder-exam");
  });

  it("fácil pede 3 alternativas e a resposta com 4 é recusada", async () => {
    signedIn();
    request.mockResolvedValue(reply(questions));
    const { dispatch, dialog } = open("Quizzes", "Criar quiz");
    fireEvent.click(within(dialog).getByRole("button", { name: "Fácil" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "A Olena respondeu em um formato inesperado. Tente de novo.",
    );
    expect(request.mock.calls[0]![0].prompt).toBe("count=10;options=3;difficulty=easy");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("resposta fora do formato não guarda nada", async () => {
    signedIn();
    request.mockResolvedValue(reply("não é JSON"));
    const { dispatch, dialog } = open("Flashcards", "Criar flashcards");
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("sem conta, orienta a entrar e não chama a Olena nem lê o arquivo", async () => {
    services.mockResolvedValue({ auth: { currentUser: null } });
    for (const [tab, action] of [
      ["Flashcards", "Criar flashcards"],
      ["Quizzes", "Criar quiz"],
      ["Simulados", "Criar simulado"],
    ] as const) {
      const { dispatch, dialog } = open(tab, action);
      fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
      expect(await screen.findByRole("alert")).toHaveProperty(
        "textContent",
        "Entre na sua conta para gerar com a Olena.",
      );
      expect(dispatch).not.toHaveBeenCalled();
      cleanup();
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("limite diário: mostra o aviso do servidor e não guarda nada", async () => {
    signedIn();
    request.mockRejectedValue(
      new Error(
        "Você já fez 2 quizzes com a Olena hoje. Eles voltam às 21h (horário de Brasília).",
      ),
    );
    const { dispatch, dialog } = open("Quizzes", "Criar quiz");
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Você já fez 2 quizzes com a Olena hoje. Eles voltam às 21h (horário de Brasília).",
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  // O que cada tipo de fonte entrega à Olena: o texto sai do arquivo no aparelho, de cada jeito.
  function openMany(materials: WorkspaceState["materials"]) {
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={materials}
        subjectId="materia-1"
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar flashcards" }));
    const dialog = screen.getByRole("dialog");
    for (const item of materials)
      fireEvent.click(within(dialog).getByRole("checkbox", { name: `Selecionar ${item.title}` }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar com a Olena" }));
    return { dispatch };
  }
  const sent = () =>
    request.mock.calls[0]![0].sources as { id: string; title: string; content: string }[];

  it("Markdown e nota em branco vão como texto, com o título de cada uma", async () => {
    signedIn();
    request.mockResolvedValue(reply(cards));
    const { dispatch } = openMany([
      { ...source, id: "md", title: "aula.md", content: "# Aula\n\nA célula é a unidade da vida." },
      { ...source, id: "nota", title: "Minha nota", content: "Mitocôndria produz energia." },
    ]);
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(sent().map((item) => item.title)).toEqual(["aula.md", "Minha nota"]);
    expect(sent()[0]!.content).toContain("A célula é a unidade da vida.");
    expect(sent()[1]!.content).toBe("Mitocôndria produz energia.");
  });

  it("imagem: o texto vem do OCR em português, no aparelho", async () => {
    signedIn();
    recognized.mockReturnValue("O ENIAC foi concluído em 1945.");
    request.mockResolvedValue(reply(cards));
    const { dispatch } = openMany([
      {
        ...source,
        id: "foto",
        title: "foto.png",
        kind: "image",
        content: "data:image/png;base64,AAAA",
      },
    ]);
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(createWorker).toHaveBeenCalledWith("por", 1, expect.anything());
    expect(sent()[0]!.content).toBe("O ENIAC foi concluído em 1945.");
    expect(terminate).toHaveBeenCalled();
  });

  it("imagem sem texto legível: avisa e não chama a Olena", async () => {
    signedIn();
    recognized.mockReturnValue("   ");
    openMany([
      {
        ...source,
        id: "foto",
        title: "foto.png",
        kind: "image",
        content: "data:image/png;base64,AAAA",
      },
    ]);
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Não consegui extrair texto de foto.png.",
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("PDF digital: texto de cada página, com o número da página", async () => {
    signedIn();
    const pages = ["Primeira página sobre o ENIAC.", "Segunda página sobre a válvula."];
    pdfOpen.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: async (n: number) => ({
          getTextContent: async () => ({ items: [{ str: pages[n - 1] }] }),
          cleanup: () => undefined,
        }),
      }),
      destroy: async () => undefined,
    });
    request.mockResolvedValue(reply(cards));
    const { dispatch } = openMany([
      {
        ...source,
        id: "pdf",
        title: "aula.pdf",
        kind: "pdf",
        content: "data:application/pdf;base64,JVBERi0xLjQK",
      },
    ]);
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(sent()[0]!.content).toContain("Página 1: Primeira página sobre o ENIAC.");
    expect(sent()[0]!.content).toContain("Página 2: Segunda página sobre a válvula.");
  });

  it("PDF escaneado: a página sem texto passa pelo OCR em português", async () => {
    signedIn();
    recognized.mockReturnValue("Fotossíntese lida da imagem da página.");
    pdfOpen.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [] }),
          getViewport: () => ({ width: 600, height: 800 }),
          render: () => ({ promise: Promise.resolve() }),
          cleanup: () => undefined,
        }),
      }),
      destroy: async () => undefined,
    });
    request.mockResolvedValue(reply(cards));
    const { dispatch } = openMany([
      {
        ...source,
        id: "scan",
        title: "scan.pdf",
        kind: "pdf",
        content: "data:application/pdf;base64,JVBERi0xLjQK",
      },
    ]);
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(sent()[0]!.content).toContain("Página 1: Fotossíntese lida da imagem da página.");
  });

  it("três fontes de tipos diferentes dividem o texto enviado, sem passar de 30.000", async () => {
    signedIn();
    recognized.mockReturnValue("Texto da foto. ".repeat(3_000));
    request.mockResolvedValue(reply(cards));
    const { dispatch } = openMany([
      { ...source, id: "a", title: "a.txt", content: "Texto longo. ".repeat(6_000) },
      { ...source, id: "b", title: "b.png", kind: "image", content: "data:image/png;base64,AAAA" },
      { ...source, id: "c", title: "c.txt", content: "Curto." },
    ]);
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const total = sent().reduce((sum, item) => sum + item.content.length, 0);
    expect(total).toBeLessThanOrEqual(30_000);
    expect(sent().length).toBeLessThanOrEqual(12);
    expect(sent().every((item) => item.content.length <= 8_000)).toBe(true);
    for (const id of ["a", "b", "c"])
      expect(sent().some((item) => item.id.startsWith(id))).toBe(true);
  });

  it("link do YouTube nunca é enviado: fica só como referência", () => {
    signedIn();
    const link = {
      ...source,
      id: "yt",
      title: "https://youtu.be/x",
      kind: "link" as const,
      content: "https://youtu.be/x",
    };
    const { dialog } = open("Quizzes", "Criar quiz", [source, link]);
    expect(
      within(dialog).getByRole("checkbox", { name: "Selecionar https://youtu.be/x" }),
    ).toHaveProperty("disabled", true);
  });

  it("mostra o baralho como uma linha e estuda em outra tela: esquerda errei, direita acertei", () => {
    const card = (id: string, front: string, back: string) => ({
      id,
      subjectId: "materia-1",
      deck: "ENIAC",
      materialId: source.id,
      front,
      back,
      intervalDays: 0,
      nextReview: "2026-11-17",
    });
    const dispatch = vi.fn<(action: WorkspaceAction) => void>();
    render(
      <LibraryFolderContents
        folder={folder}
        materials={[source]}
        subjectId="materia-1"
        flashcards={[
          card("c1", "O que é o ENIAC?", "Um dos primeiros computadores eletrônicos."),
          card("c2", "O que aconteceu em 1945?", "O ENIAC foi concluído."),
        ]}
        dispatch={dispatch}
        onBack={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Flashcards" }));
    expect(screen.getByText("ENIAC.txt · 2 cartões")).toBeTruthy();
    expect(screen.queryByText("Ainda não há flashcards")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^ENIAC/ }));
    // abre outra tela, não um modal
    expect(screen.queryByRole("dialog")).toBeNull();
    const study = screen.getByRole("region", { name: "ENIAC" });
    expect(within(study).getByText("O que é o ENIAC?")).toBeTruthy();
    expect(within(study).getByText("1 de 2")).toBeTruthy();
    fireEvent.click(within(study).getByRole("button", { name: "Virar cartão" }));
    expect(within(study).getByText("Um dos primeiros computadores eletrônicos.")).toBeTruthy();
    // seta direita (verde) = acertei
    fireEvent.click(within(study).getByRole("button", { name: "Acertei" }));
    expect(within(study).getByText("O que aconteceu em 1945?")).toBeTruthy();
    expect(within(study).getByText("2 de 2")).toBeTruthy();
    // seta esquerda (vermelha) = errei, o último cartão volta para uma rodada de revisão
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(within(study).getByText("Vamos rever as perguntas que você errou.")).toBeTruthy();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "flashcard/reviewed", id: "c1", rating: "good" }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "flashcard/reviewed", id: "c2", rating: "again" }),
    );
    fireEvent.click(within(study).getByRole("button", { name: "Continuar" }));
    expect(within(study).getByText("O que aconteceu em 1945?")).toBeTruthy();
    expect(within(study).getByText("1 de 1")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(study).getByText("1/2")).toBeTruthy();
    expect(within(study).getByRole("button", { name: "Repetir as erradas" })).toBeTruthy();
    // repetições da revisão não geram novas revisões na agenda
    expect(dispatch).toHaveBeenCalledTimes(2);
    fireEvent.click(within(study).getByRole("button", { name: "Continuar" }));
    expect(screen.queryByRole("region", { name: "ENIAC" })).toBeNull();
  });
});
