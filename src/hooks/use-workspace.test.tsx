import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORKSPACE_STORAGE_KEY } from "../data/local-workspace";
import { WORKSPACE_HISTORY_KEY } from "../data/workspace-history";
import { useWorkspace } from "./use-workspace";

function quotaError() {
  return new DOMException("The quota has been exceeded.", "QuotaExceededError");
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("espaço do navegador cheio", () => {
  it("cede o histórico de versões para caber o espaço de estudos e segue funcionando", () => {
    const { result } = renderHook(() => useWorkspace());
    // Só falha enquanto o histórico ocupa lugar: como um navegador com a cota quase cheia.
    localStorage.setItem(WORKSPACE_HISTORY_KEY, "h".repeat(100));
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === WORKSPACE_STORAGE_KEY && this.getItem(WORKSPACE_HISTORY_KEY) !== null)
        throw quotaError();
      setItem.call(this, key, value);
    });
    act(() =>
      result.current.dispatch({
        type: "notebook/added",
        id: "n1",
        title: "Novo",
        subjectId: "",
        createdAt: "2026-09-26",
      }),
    );
    expect(result.current.storageFull).toBe(false);
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toContain("Novo");
  });

  it("sem lugar nem assim, não derruba o app: só avisa que não salvou", () => {
    const { result } = renderHook(() => useWorkspace());
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === WORKSPACE_STORAGE_KEY) throw quotaError();
      setItem.call(this, key, value);
    });
    expect(() =>
      act(() =>
        result.current.dispatch({
          type: "notebook/added",
          id: "n2",
          title: "Outro",
          subjectId: "",
          createdAt: "2026-09-26",
        }),
      ),
    ).not.toThrow();
    expect(result.current.storageFull).toBe(true);
    // O espaço em memória continua com a alteração para a pessoa seguir usando.
    expect(result.current.workspace.notebooks.some((item) => item.title === "Outro")).toBe(true);
  });

  it("volta ao normal quando há espaço de novo", () => {
    const { result } = renderHook(() => useWorkspace());
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    act(() =>
      result.current.dispatch({
        type: "notebook/added",
        id: "n3",
        title: "A",
        subjectId: "",
        createdAt: "2026-09-26",
      }),
    );
    expect(result.current.storageFull).toBe(true);
    spy.mockRestore();
    act(() =>
      result.current.dispatch({
        type: "notebook/added",
        id: "n4",
        title: "B",
        subjectId: "",
        createdAt: "2026-09-26",
      }),
    );
    expect(result.current.storageFull).toBe(false);
  });
});
