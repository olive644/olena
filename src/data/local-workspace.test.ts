import { describe, expect, it } from "vitest";
import { WORKSPACE_VERSION, createInitialWorkspace } from "../domain/workspace";
import { loadWorkspace, saveWorkspace, WORKSPACE_STORAGE_KEY } from "./local-workspace";

describe("local workspace", () => {
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
