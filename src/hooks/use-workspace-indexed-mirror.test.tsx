import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORKSPACE_STORAGE_KEY } from "../data/local-workspace";
import { createInitialWorkspace } from "../domain/workspace";

const spies = vi.hoisted(() => ({ openIndexedWorkspaceStore: vi.fn() }));
vi.mock("../data/indexed-workspace-store", () => ({
  openIndexedWorkspaceStore: spies.openIndexedWorkspaceStore,
}));

import { useWorkspace } from "./use-workspace";

// Espelho falso em memória: o mesmo formato do de verdade (get/set assíncronos), sem IndexedDB.
function fakeMirror(initial?: string) {
  let value = initial;
  return {
    store: {
      get: vi.fn(async () => value),
      set: vi.fn(async (next: string) => {
        value = next;
      }),
    },
    read: () => value,
  };
}

beforeEach(() => {
  localStorage.clear();
  spies.openIndexedWorkspaceStore.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("espelho em IndexedDB (etapa 1)", () => {
  it("sem nada no espelho ainda, grava nele o mesmo texto salvo no localStorage", async () => {
    const mirror = fakeMirror();
    spies.openIndexedWorkspaceStore.mockReturnValue(mirror.store);
    const { result } = renderHook(() => useWorkspace());
    act(() =>
      result.current.dispatch({
        type: "notebook/added",
        id: "n1",
        title: "Cornell",
        subjectId: "",
        createdAt: "2026-09-27",
      }),
    );
    await waitFor(() => expect(mirror.store.set).toHaveBeenCalled());
    const localValue = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    expect(mirror.read()).toBe(localValue);
  });

  it("com um espaço válido já no espelho, ele substitui o carregado do localStorage ao abrir", async () => {
    const base = createInitialWorkspace();
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(base));
    const fromMirror = JSON.stringify({
      ...base,
      notebooks: [
        {
          id: "do-espelho",
          title: "Do espelho",
          subjectId: base.subjects[0]!.id,
          createdAt: "2026-09-27",
          pageIds: [],
        },
      ],
    });
    const mirror = fakeMirror(fromMirror);
    spies.openIndexedWorkspaceStore.mockReturnValue(mirror.store);
    const { result } = renderHook(() => useWorkspace());
    expect(result.current.workspace.notebooks).toHaveLength(0);
    await waitFor(() =>
      expect(result.current.workspace.notebooks.some((n) => n.id === "do-espelho")).toBe(true),
    );
  });

  it("sem IndexedDB disponível (openIndexedWorkspaceStore devolve nulo), continua funcionando normalmente", async () => {
    spies.openIndexedWorkspaceStore.mockReturnValue(null);
    const { result } = renderHook(() => useWorkspace());
    expect(() =>
      act(() =>
        result.current.dispatch({
          type: "notebook/added",
          id: "n2",
          title: "Sem espelho",
          subjectId: "",
          createdAt: "2026-09-27",
        }),
      ),
    ).not.toThrow();
    expect(
      result.current.workspace.notebooks.some((notebook) => notebook.title === "Sem espelho"),
    ).toBe(true);
  });

  it("uma falha no espelho não impede o salvamento de verdade no localStorage", async () => {
    spies.openIndexedWorkspaceStore.mockReturnValue({
      get: vi.fn(async () => {
        throw new Error("indisponível");
      }),
      set: vi.fn(async () => {
        throw new Error("indisponível");
      }),
    });
    const { result } = renderHook(() => useWorkspace());
    act(() =>
      result.current.dispatch({
        type: "notebook/added",
        id: "n3",
        title: "Resiliente",
        subjectId: "",
        createdAt: "2026-09-27",
      }),
    );
    await waitFor(() =>
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toContain("Resiliente"),
    );
  });
});
