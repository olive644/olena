import { describe, expect, it } from "vitest";
import { WORKSPACE_VERSION, createInitialWorkspace } from "../domain/workspace";
import {
  isHandwritingDocument,
  loadWorkspace,
  saveWorkspace,
  WORKSPACE_STORAGE_KEY,
} from "./local-workspace";

describe("local workspace", () => {
  it("valida quadro amplo sem limitar conteúdo à área A4 e rejeita dimensões inválidas", () => {
    const board = {
      version: 1,
      paper: "board",
      canvasSize: { width: 3200, height: 2400 },
      strokes: [],
      backgroundFrame: { x: 2000, y: 1800, width: 400, height: 400 },
    };
    expect(isHandwritingDocument(board)).toBe(true);
    expect(isHandwritingDocument({ ...board, paper: "ruled" })).toBe(true);
    for (const canvasSize of [
      { width: "3200", height: 2400 },
      { width: 999999, height: 2400 },
      { width: 3200, height: null },
    ]) {
      expect(isHandwritingDocument({ ...board, canvasSize })).toBe(false);
    }
    expect(
      isHandwritingDocument({
        ...board,
        backgroundFrame: { x: 3000, y: 2000, width: 400, height: 400 },
      }),
    ).toBe(false);
    expect(isHandwritingDocument({ version: 1, paper: "ruled", strokes: [] })).toBe(true);
  });
  it("valida posição e tamanho de imagens importadas", () => {
    const document = { version: 1, paper: "blank", strokes: [] };
    expect(
      isHandwritingDocument({
        ...document,
        backgroundFrame: { x: 100, y: 100, width: 500, height: 800 },
      }),
    ).toBe(true);
    for (const backgroundFrame of [
      { x: -1, y: 0, width: 100, height: 100 },
      { x: 1100, y: 0, width: 500, height: 100 },
      { x: 0, y: 0, width: 0, height: 100 },
      { x: 0, y: NaN, width: 100, height: 100 },
    ]) {
      expect(isHandwritingDocument({ ...document, backgroundFrame })).toBe(false);
    }
  });
  it("valida a imagem local de fundo sem aceitar URLs externas ou imagens grandes", () => {
    const document = { version: 1, paper: "blank", strokes: [] };
    expect(isHandwritingDocument({ ...document, background: "data:image/jpeg;base64,/9j/" })).toBe(
      true,
    );
    expect(isHandwritingDocument({ ...document, background: "https://example.com/page.jpg" })).toBe(
      false,
    );
    expect(
      isHandwritingDocument({ ...document, background: "data:image/svg+xml;base64,AAAA" }),
    ).toBe(false);
    expect(
      isHandwritingDocument({
        ...document,
        background: `data:image/jpeg;base64,${"A".repeat(500_000)}`,
      }),
    ).toBe(false);
  });
  it("valida vários objetos de imagem independentes", () => {
    const document = { version: 1, paper: "blank", strokes: [] };
    const image = {
      id: "image-1",
      dataUrl: "data:image/jpeg;base64,/9j/",
      x: 100,
      y: 120,
      width: 420,
      height: 300,
      rotation: -12,
    };
    expect(
      isHandwritingDocument({ ...document, images: [image, { ...image, id: "image-2" }] }),
    ).toBe(true);
    expect(
      isHandwritingDocument({
        ...document,
        images: [{ ...image, x: 900, width: 400 }],
      }),
    ).toBe(false);
    expect(
      isHandwritingDocument({
        ...document,
        images: [{ ...image, dataUrl: "https://example.com/image.jpg" }],
      }),
    ).toBe(false);
  });
  it("salva e recupera o estado versionado", () => {
    const workspace = createInitialWorkspace();
    saveWorkspace(window.localStorage, workspace);
    expect(loadWorkspace(window.localStorage)).toEqual(workspace);
  });

  it("recupera os traços de uma folha manuscrita para continuar a edição", () => {
    const workspace = createInitialWorkspace();
    workspace.notes.push({
      id: "note-handwriting",
      title: "Revisão",
      content: "",
      subjectId: workspace.subjects[0]!.id,
      updatedAt: "2026-09-20T10:00:00.000Z",
      assets: [
        {
          id: "drawing-1",
          kind: "drawing",
          name: "Folha manuscrita",
          dataUrl: "data:image/png;base64,AAAA",
          createdAt: "2026-09-20T10:00:00.000Z",
          handwriting: {
            version: 1,
            paper: "grid",
            strokes: [
              {
                id: "line-1",
                tool: "pen",
                color: "#17151c",
                width: 5,
                points: [{ x: 10, y: 20, pressure: 0.5 }],
              },
            ],
          },
        },
      ],
    });
    saveWorkspace(window.localStorage, workspace);
    expect(loadWorkspace(window.localStorage).notes[0]?.assets[0]?.handwriting).toEqual(
      workspace.notes[0]?.assets[0]?.handwriting,
    );
  });

  it("aceita post-its válidos e rejeita texto ou posição fora dos limites", () => {
    const document = {
      version: 1,
      paper: "ruled",
      strokes: [],
      stickies: [{ id: "sticky-1", x: 120, y: 150, color: "yellow", text: "Revisar amanhã" }],
    };
    expect(isHandwritingDocument(document)).toBe(true);
    expect(
      isHandwritingDocument({
        ...document,
        stickies: [
          {
            ...document.stickies[0],
            checklist: [{ id: "item-1", text: "Revisar", done: false }],
          },
        ],
      }),
    ).toBe(true);
    expect(
      isHandwritingDocument({
        ...document,
        stickies: [
          {
            ...document.stickies[0],
            checklist: [{ id: "item-1", text: "ok", done: "não" }],
          },
        ],
      }),
    ).toBe(false);
    expect(
      isHandwritingDocument({ ...document, stickies: [{ ...document.stickies[0], x: 1200 }] }),
    ).toBe(false);
    expect(
      isHandwritingDocument({
        ...document,
        stickies: [{ ...document.stickies[0], text: "x".repeat(241) }],
      }),
    ).toBe(false);
  });

  it("aceita visibilidade de camadas válida e rejeita camada incompleta", () => {
    const document = { version: 1, paper: "blank", strokes: [] };
    const visibility = {
      background: true,
      coordinates: true,
      strokes: true,
      text: true,
      stickies: true,
    };
    expect(isHandwritingDocument({ ...document, layers: { visibility } })).toBe(true);
    expect(
      isHandwritingDocument({
        ...document,
        layers: { visibility: { ...visibility, text: "yes" } },
      }),
    ).toBe(false);
  });

  it("aceita ordem de camadas completa e rejeita duplicatas", () => {
    const document = { version: 1, paper: "blank", strokes: [] };
    const visibility = {
      background: true,
      coordinates: true,
      strokes: true,
      text: true,
      stickies: true,
    };
    const order = ["stickies", "strokes", "text", "coordinates"];
    expect(isHandwritingDocument({ ...document, layers: { visibility, order } })).toBe(true);
    expect(
      isHandwritingDocument({
        ...document,
        layers: { visibility, order: ["stickies", "strokes", "text", "text"] },
      }),
    ).toBe(false);
  });

  it("ignora conteúdo inválido sem quebrar o aplicativo", () => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "{conteudo-invalido");
    expect(loadWorkspace(window.localStorage)).toEqual(createInitialWorkspace());
  });

  it("rejeita arrays com itens de formato inesperado", () => {
    const malformed = { ...createInitialWorkspace(), habits: [{ title: "Sem identificador" }] };
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(malformed));
    expect(loadWorkspace(window.localStorage)).toEqual(createInitialWorkspace());
  });

  it("migra o workspace v1 preservando os dados existentes", () => {
    const current = createInitialWorkspace();
    const legacy = {
      version: 1,
      subjects: current.subjects,
      tasks: current.tasks,
      events: current.events,
      habits: current.habits,
      notes: current.notes,
      focusSessions: current.focusSessions,
    };
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(legacy));

    const migrated = loadWorkspace(window.localStorage);
    expect(migrated.version).toBe(WORKSPACE_VERSION);
    expect(migrated.subjects).toEqual(current.subjects);
    expect(migrated.flashcards).toEqual([]);
    expect(migrated.materials).toEqual([]);
    expect(migrated.bingoBoards).toEqual([]);
    expect(migrated.homeworkLists).toEqual([]);
    expect(migrated.notebooks).toEqual([]);
  });

  it("migra o workspace v2 adicionando imagens e bingos sem perder os dados", () => {
    const current = createInitialWorkspace();
    const legacy = {
      ...current,
      version: 2,
      notes: [
        {
          id: "note-old",
          title: "Resumo antigo",
          content: "Conteúdo preservado",
          subjectId: "subject-english",
          updatedAt: "2026-08-30T10:00:00.000Z",
        },
      ],
    };
    const workspaceV2: Record<string, unknown> = { ...legacy };
    delete workspaceV2["bingoBoards"];
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceV2));

    const migrated = loadWorkspace(window.localStorage);
    expect(migrated.version).toBe(WORKSPACE_VERSION);
    expect(migrated.notes[0]).toMatchObject({
      title: "Resumo antigo",
      content: "Conteúdo preservado",
      assets: [],
    });
    expect(migrated.bingoBoards).toEqual([]);
    expect(migrated.homeworkLists).toEqual([]);
    expect(migrated.notebooks[0]).toMatchObject({
      title: "Resumo antigo",
      pageIds: ["note-old"],
    });
  });

  it("migra o workspace v3 adicionando homeworkLists sem perder os dados", () => {
    const current = createInitialWorkspace();
    const workspaceV3: Record<string, unknown> = { ...current, version: 3 };
    delete workspaceV3["homeworkLists"];
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceV3));

    const migrated = loadWorkspace(window.localStorage);
    expect(migrated.version).toBe(WORKSPACE_VERSION);
    expect(migrated.subjects).toEqual(current.subjects);
    expect(migrated.homeworkLists).toEqual([]);
  });

  it("migra o workspace v4 adicionando preferências sincronizadas de foco", () => {
    const current = createInitialWorkspace();
    const workspaceV4: Record<string, unknown> = { ...current, version: 4 };
    delete workspaceV4["focusPreferences"];
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceV4));

    expect(loadWorkspace(window.localStorage).focusPreferences).toEqual({
      pomodoroMinutes: 25,
      longBreaks: true,
    });
  });

  it("migra o workspace v5 adicionando preferências de estudo", () => {
    const workspaceV5 = { ...createInitialWorkspace(), version: 5 };
    delete (workspaceV5 as Partial<typeof workspaceV5>).studyPreferences;
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceV5));

    expect(loadWorkspace(window.localStorage).studyPreferences).toEqual({
      modalities: [],
      processing: "sequencial",
      rhythm: "focado",
      programming: "nenhum",
    });
  });

  it("migra folhas do workspace v6 para cadernos sem perder conteúdo", () => {
    const note = {
      id: "note-v6",
      title: "Revisão de verbos",
      content: "Conteúdo preservado",
      subjectId: "subject-english",
      updatedAt: "2026-09-20T10:00:00.000Z",
      assets: [],
    };
    const workspaceV6: Record<string, unknown> = {
      ...createInitialWorkspace(),
      version: 6,
      notes: [note],
    };
    delete workspaceV6["notebooks"];
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceV6));

    const migrated = loadWorkspace(window.localStorage);
    expect(migrated.notes[0]).toEqual(note);
    expect(migrated.notebooks[0]).toMatchObject({
      title: "Revisão de verbos",
      pageIds: ["note-v6"],
    });
  });
});
