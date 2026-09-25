import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  DEFAULT_NOTEBOOK_PREFERENCES,
  NOTEBOOK_PREFERENCES_KEY,
  readNotebookPreferences,
  useNotebookPreferences,
} from "./notebook-preferences";
import { applySyncedStorage, readSyncedStorage } from "./synced-storage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe("preferências do caderno", () => {
  it("valida os dados e preserva padrões para campos ausentes", () => {
    localStorage.setItem(NOTEBOOK_PREFERENCES_KEY, '{"penOnly":true,"stabilization":"false"}');
    expect(readNotebookPreferences()).toEqual({ ...DEFAULT_NOTEBOOK_PREFERENCES, penOnly: true });
    localStorage.setItem(NOTEBOOK_PREFERENCES_KEY, "corrompido");
    expect(readNotebookPreferences()).toEqual(DEFAULT_NOTEBOOK_PREFERENCES);
  });
  it("persiste no snapshot sincronizado e recebe mudanças da conta", () => {
    const { result } = renderHook(useNotebookPreferences);
    act(() => result.current.changePreference("stabilization", false));
    expect(JSON.parse(readSyncedStorage()[NOTEBOOK_PREFERENCES_KEY]!)).toMatchObject({
      stabilization: false,
    });
    act(() => applySyncedStorage({ [NOTEBOOK_PREFERENCES_KEY]: '{"penOnly":true}' }));
    expect(result.current.preferences).toEqual({ ...DEFAULT_NOTEBOOK_PREFERENCES, penOnly: true });
  });
});
