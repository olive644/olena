import { describe, expect, it } from "vitest";
import {
  createInitialWorkspace,
  workspaceReducer,
  type StudyNotebook,
  type WorkspaceState,
} from "./workspace";
import { mergeAccountWorkspace, mergeWorkspaceStates } from "./workspace-sync-merge";
import { isWorkspaceState } from "../data/local-workspace";

function notebook(id: string, pageIds: string[] = []): StudyNotebook {
  return { id, title: id, subjectId: "", createdAt: "2026", pageIds };
}
function note(id: string): WorkspaceState["notes"][number] {
  return { id, title: id, content: "", subjectId: "", updatedAt: "2026", assets: [] };
}
function withBooks(): WorkspaceState {
  return {
    ...createInitialWorkspace(),
    notebooks: [notebook("a", ["a-1"]), notebook("b", ["b-1"])],
    notes: [note("a-1"), note("b-1")],
  };
}

describe("marcas de exclusão do espaço de estudos", () => {
  it("apagar caderno guarda a marca, e criar de novo o mesmo id a desfaz", () => {
    const removed = workspaceReducer(withBooks(), { type: "notebook/removed", ids: ["a"] });
    expect(removed.removedNotebookIds).toEqual(["a"]);
    expect(removed.notebooks.map((item) => item.id)).toEqual(["b"]);
    const again = workspaceReducer(removed, {
      type: "notebook/added",
      id: "a",
      title: "a",
      subjectId: "",
      createdAt: "2026",
    });
    expect(again.removedNotebookIds).toEqual([]);
  });

  it("limpar o nome da prateleira marca que ela foi apagada, e dar um nome novo desfaz", () => {
    const named = workspaceReducer(createInitialWorkspace(), {
      type: "notebook/shelf-named",
      name: "Minha prateleira",
    });
    expect(named.notebookShelfCleared).toBeUndefined();
    const cleared = workspaceReducer(named, { type: "notebook/shelf-named", name: "" });
    expect(cleared.notebookShelfCleared).toBe(true);
    const renamed = workspaceReducer(cleared, { type: "notebook/shelf-named", name: "Outra" });
    expect(renamed.notebookShelfCleared).toBeUndefined();
  });

  it("o espaço com marcas continua válido ao carregar, e marcas inválidas são recusadas", () => {
    const removed = workspaceReducer(withBooks(), { type: "notebook/removed", ids: ["a"] });
    expect(isWorkspaceState(JSON.parse(JSON.stringify(removed)))).toBe(true);
    expect(isWorkspaceState({ ...removed, removedNotebookIds: [1] })).toBe(false);
    expect(isWorkspaceState({ ...removed, notebookShelfCleared: "sim" })).toBe(false);
  });
});

describe("abrir com uma cópia mais antiga (conta ou IndexedDB)", () => {
  it("o caderno apagado neste aparelho não volta, nem as folhas dele", () => {
    const stale = withBooks();
    const local = workspaceReducer(stale, { type: "notebook/removed", ids: ["a"] });
    const result = mergeAccountWorkspace(local, stale);
    expect(result.notebooks.map((item) => item.id)).toEqual(["b"]);
    expect(result.notes.map((item) => item.id)).toEqual(["b-1"]);
    expect(result.removedNotebookIds).toEqual(["a"]);
  });

  it("sem marcas, a cópia da conta continua valendo (comportamento de sempre)", () => {
    const account = withBooks();
    const local = { ...createInitialWorkspace(), notebooks: [notebook("c")] };
    expect(mergeAccountWorkspace(local, account).notebooks.map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("a prateleira apagada aqui não ganha o nome de volta", () => {
    const stale: WorkspaceState = { ...withBooks(), notebookShelfName: "Minha prateleira" };
    let local = workspaceReducer(stale, { type: "notebook/removed", ids: ["a", "b"] });
    local = workspaceReducer(local, { type: "notebook/shelf-named", name: "" });
    const result = mergeAccountWorkspace(local, stale);
    expect(result.notebooks).toEqual([]);
    expect(result.notebookShelfName).toBe("");
    expect(result.notebookShelfCleared).toBe(true);
  });

  it("uma exclusão feita em outro aparelho (marca na conta) também vale", () => {
    const account = workspaceReducer(withBooks(), { type: "notebook/removed", ids: ["b"] });
    const oldLocal = withBooks();
    expect(mergeAccountWorkspace(oldLocal, account).notebooks.map((item) => item.id)).toEqual([
      "a",
    ]);
  });
});

describe("sincronização entre aparelhos", () => {
  it("o caderno apagado num aparelho some mesmo que o outro tenha editado outra coisa", () => {
    const base = withBooks();
    const local = workspaceReducer(base, { type: "notebook/removed", ids: ["a"] });
    const remote = { ...base, notebooks: [...base.notebooks, notebook("c")] };
    const { workspace } = mergeWorkspaceStates(base, local, remote);
    expect(workspace.notebooks.map((item) => item.id).sort()).toEqual(["b", "c"]);
    expect(workspace.notes.map((item) => item.id)).toEqual(["b-1"]);
  });

  it("um aparelho antigo que ainda tem o caderno e o editou não o traz de volta", () => {
    const base = withBooks();
    const local = workspaceReducer(base, { type: "notebook/removed", ids: ["a"] });
    const remote = {
      ...base,
      notebooks: base.notebooks.map((item) =>
        item.id === "a" ? { ...item, title: "Editado" } : item,
      ),
    };
    const { workspace } = mergeWorkspaceStates(base, local, remote);
    expect(workspace.notebooks.map((item) => item.id)).toEqual(["b"]);
  });

  it("dar um nome novo à prateleira vence a marca de apagada que ainda está na outra cópia", () => {
    const named: WorkspaceState = { ...createInitialWorkspace(), notebookShelfName: "Antiga" };
    const cleared = workspaceReducer(named, { type: "notebook/shelf-named", name: "" });
    const renamed = workspaceReducer(cleared, { type: "notebook/shelf-named", name: "Nova" });
    const { workspace } = mergeWorkspaceStates(cleared, renamed, cleared);
    expect(workspace.notebookShelfName).toBe("Nova");
    expect(workspace.notebookShelfCleared).toBeUndefined();
  });
});
