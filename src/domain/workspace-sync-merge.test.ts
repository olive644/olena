import { describe, expect, it } from "vitest";
import { createInitialWorkspace, type WorkspaceState } from "./workspace";
import { mergeAccountWorkspace, mergeWorkspaceStates } from "./workspace-sync-merge";

function notebook(id: string, title: string): WorkspaceState["notebooks"][number] {
  return { id, title, subjectId: "subject-english", createdAt: "2026", pageIds: [] };
}

function note(id: string, content: string): WorkspaceState["notes"][number] {
  return {
    id,
    title: id,
    content,
    subjectId: "subject-english",
    updatedAt: "2026",
    assets: [],
  };
}

describe("mergeWorkspaceStates", () => {
  it("does not erase completed focus records when an older device sends a shorter history", () => {
    const session = {
      id: "focus-saved",
      subjectId: "",
      mode: "timer" as const,
      durationMinutes: 3,
      completedAt: "2026-10-12T12:00:00Z",
    };
    const base = { ...createInitialWorkspace(), focusSessions: [session] };
    const result = mergeWorkspaceStates(base, base, { ...base, focusSessions: [] });
    expect(result.workspace.focusSessions).toEqual([session]);
  });
  it("mantém o que cada dispositivo adicionou quando editam itens diferentes", () => {
    const base = createInitialWorkspace();
    const local = { ...base, notebooks: [notebook("n1", "Caderno do PC")] };
    const remote = { ...base, notebooks: [notebook("n2", "Caderno do celular")] };

    const { workspace, conflicts } = mergeWorkspaceStates(base, local, remote);

    expect(conflicts).toBe(0);
    expect(workspace.notebooks.map((n) => n.id).sort()).toEqual(["n1", "n2"]);
  });

  it("respeita uma remoção feita só de um dos lados", () => {
    const base = { ...createInitialWorkspace(), notebooks: [notebook("n1", "Caderno")] };
    const localRemoved = { ...base, notebooks: [] };
    const remoteUnchanged = base;

    const { workspace, conflicts } = mergeWorkspaceStates(base, localRemoved, remoteUnchanged);

    expect(conflicts).toBe(0);
    expect(workspace.notebooks).toEqual([]);
  });

  it("traz uma edição feita só remotamente, mesmo sem mudança local", () => {
    const base = { ...createInitialWorkspace(), notebooks: [notebook("n1", "Original")] };
    const remoteRenamed = { ...base, notebooks: [notebook("n1", "Renomeado no celular")] };

    const { workspace, conflicts } = mergeWorkspaceStates(base, base, remoteRenamed);

    expect(conflicts).toBe(0);
    expect(workspace.notebooks[0]?.title).toBe("Renomeado no celular");
  });

  it("quando o mesmo item muda de formas diferentes nos dois lados, conta o conflito e mantém o local", () => {
    const base = { ...createInitialWorkspace(), notes: [note("note-1", "original")] };
    const local = { ...base, notes: [note("note-1", "editado no PC")] };
    const remote = { ...base, notes: [note("note-1", "editado no celular")] };

    const { workspace, conflicts } = mergeWorkspaceStates(base, local, remote);

    expect(conflicts).toBe(1);
    expect(workspace.notes[0]?.content).toBe("editado no PC");
  });

  it("não conta conflito quando os dois lados chegaram ao mesmo resultado", () => {
    const base = { ...createInitialWorkspace(), notes: [note("note-1", "original")] };
    const sameEdit = { ...base, notes: [note("note-1", "mesma edição")] };

    const { conflicts } = mergeWorkspaceStates(base, sameEdit, sameEdit);

    expect(conflicts).toBe(0);
  });

  it("mescla as preferências como um valor único, com o local prevalecendo em conflito real", () => {
    const base = createInitialWorkspace();
    const local = {
      ...base,
      focusPreferences: { pomodoroMinutes: 50 as const, longBreaks: true },
    };
    const remote = {
      ...base,
      focusPreferences: { pomodoroMinutes: 25 as const, longBreaks: false },
    };

    const { workspace, conflicts } = mergeWorkspaceStates(base, local, remote);

    expect(conflicts).toBe(1);
    expect(workspace.focusPreferences).toEqual({ pomodoroMinutes: 50, longBreaks: true });
  });

  it("ignora diferenças de ordem de chaves ao comparar itens", () => {
    const base = createInitialWorkspace();
    const local = { ...base, notebooks: [notebook("n1", "Caderno")] };
    // Mesmo conteúdo do remoto, só com as chaves do objeto em outra ordem.
    const remote = {
      ...base,
      notebooks: [
        {
          pageIds: [] as string[],
          createdAt: "2026",
          subjectId: "subject-english",
          title: "Caderno",
          id: "n1",
        },
      ],
    };

    const { conflicts } = mergeWorkspaceStates(base, local, remote);

    expect(conflicts).toBe(0);
  });
});

describe("registros de prática concluídos", () => {
  const activity = (id: string): NonNullable<WorkspaceState["practiceActivities"]>[number] => ({
    id,
    islandId: "english",
    islandName: "Inglês",
    completedAt: "2026-11-07T10:00:00Z",
    answers: 4,
    correct: 4,
  });

  it("não apaga progresso concluído quando o outro aparelho envia uma cópia sem ele", () => {
    const base = {
      ...createInitialWorkspace(),
      practiceActivities: [activity("a"), activity("b")],
    };
    const result = mergeWorkspaceStates(base, base, { ...base, practiceActivities: [] });
    expect(result.workspace.practiceActivities?.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.conflicts).toBe(0);
  });

  it("junta o que cada lado concluiu, sem repetir", () => {
    const base = { ...createInitialWorkspace(), practiceActivities: [activity("a")] };
    const local = { ...base, practiceActivities: [activity("a"), activity("b")] };
    const remote = { ...base, practiceActivities: [activity("a"), activity("c")] };
    const result = mergeWorkspaceStates(base, local, remote);
    expect(result.workspace.practiceActivities?.map((item) => item.id).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("mergeAccountWorkspace", () => {
  const activity = (id: string): NonNullable<WorkspaceState["practiceActivities"]>[number] => ({
    id,
    islandId: "english",
    islandName: "Inglês",
    completedAt: "2026-11-07T10:00:00Z",
    answers: 4,
    correct: 4,
  });

  it("mantém no espaço da conta as atividades feitas neste aparelho e ainda não enviadas", () => {
    const account = { ...createInitialWorkspace(), practiceActivities: [activity("a")] };
    const local = {
      ...createInitialWorkspace(),
      practiceActivities: [activity("a"), activity("b")],
    };
    const merged = mergeAccountWorkspace(local, account);
    expect(merged.practiceActivities?.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("traz as atividades da conta e mantém as sessões de foco locais", () => {
    const session = {
      id: "focus-local",
      subjectId: "",
      mode: "timer" as const,
      durationMinutes: 3,
      completedAt: "2026-11-07T09:00:00Z",
    };
    const account = { ...createInitialWorkspace(), practiceActivities: [activity("a")] };
    const local = { ...createInitialWorkspace(), focusSessions: [session] };
    const merged = mergeAccountWorkspace(local, account);
    expect(merged.practiceActivities?.map((item) => item.id)).toEqual(["a"]);
    expect(merged.focusSessions).toEqual([session]);
  });

  it("não cria a lista de prática quando nenhum lado tem atividades", () => {
    const merged = mergeAccountWorkspace(createInitialWorkspace(), createInitialWorkspace());
    expect(merged.practiceActivities).toBeUndefined();
  });
});
