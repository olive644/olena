import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORKSPACE_STORAGE_KEY } from "../data/local-workspace";
import { createInitialWorkspace } from "../domain/workspace";

const spies = vi.hoisted(() => ({ openIndexedWorkspaceStore: vi.fn() }));
vi.mock("../data/indexed-workspace-store", () => ({
  openIndexedWorkspaceStore: spies.openIndexedWorkspaceStore,
}));

import { useWorkspace } from "./use-workspace";

// Armazenamento falso em memória: o mesmo formato do IndexedDB de verdade (get/set
// assíncronos).
function fakeStore(initial?: string) {
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

describe("IndexedDB como gravação de verdade (etapa 2)", () => {
  it("grava no IndexedDB o mesmo texto salvo no localStorage", async () => {
    const indexed = fakeStore();
    spies.openIndexedWorkspaceStore.mockReturnValue(indexed.store);
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
    await waitFor(() => expect(indexed.store.set).toHaveBeenCalled());
    const localValue = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    expect(indexed.read()).toBe(localValue);
    expect(result.current.storageFull).toBe(false);
  });

  it("com um espaço válido já no IndexedDB, ele substitui o carregado do localStorage ao abrir", async () => {
    const base = createInitialWorkspace();
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(base));
    const fromIndexed = JSON.stringify({
      ...base,
      notebooks: [
        {
          id: "do-indexeddb",
          title: "Do IndexedDB",
          subjectId: base.subjects[0]!.id,
          createdAt: "2026-09-27",
          pageIds: [],
        },
      ],
    });
    const indexed = fakeStore(fromIndexed);
    spies.openIndexedWorkspaceStore.mockReturnValue(indexed.store);
    const { result } = renderHook(() => useWorkspace());
    expect(result.current.workspace.notebooks).toHaveLength(0);
    await waitFor(() =>
      expect(result.current.workspace.notebooks.some((n) => n.id === "do-indexeddb")).toBe(true),
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
          title: "Sem IndexedDB",
          subjectId: "",
          createdAt: "2026-09-27",
        }),
      ),
    ).not.toThrow();
    expect(
      result.current.workspace.notebooks.some((notebook) => notebook.title === "Sem IndexedDB"),
    ).toBe(true);
  });

  it("uma falha na leitura do IndexedDB não impede o app de abrir com o que já tinha no localStorage", async () => {
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

  it("quando o localStorage falha mas o IndexedDB grava, não avisa armazenamento cheio", async () => {
    const indexed = fakeStore();
    spies.openIndexedWorkspaceStore.mockReturnValue(indexed.store);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    const { result } = renderHook(() => useWorkspace());
    act(() =>
      result.current.dispatch({
        type: "notebook/added",
        id: "n4",
        title: "Salvo só no IndexedDB",
        subjectId: "",
        createdAt: "2026-09-27",
      }),
    );
    await waitFor(() => expect(indexed.store.set).toHaveBeenCalled());
    expect(result.current.storageFull).toBe(false);
  });

  it("quando o localStorage e o IndexedDB falham juntos, avisa armazenamento cheio", async () => {
    spies.openIndexedWorkspaceStore.mockReturnValue({
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => {
        throw new Error("indisponível");
      }),
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    const { result } = renderHook(() => useWorkspace());
    act(() =>
      result.current.dispatch({
        type: "notebook/added",
        id: "n5",
        title: "Sem onde salvar",
        subjectId: "",
        createdAt: "2026-09-27",
      }),
    );
    await waitFor(() => expect(result.current.storageFull).toBe(true));
  });
});
