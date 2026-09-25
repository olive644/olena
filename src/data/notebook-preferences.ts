import { useEffect, useState } from "react";
import { SYNCED_STORAGE_APPLIED_EVENT, writeSyncedStorage } from "./synced-storage";

export const NOTEBOOK_PREFERENCES_KEY = "helena.notebookPreferences.v1";
export const DEFAULT_NOTEBOOK_PREFERENCES = {
  stabilization: true,
  penOnly: false,
  textAutoCorrect: true,
  coordinateMeasurements: true,
  equalCoordinateAxes: true,
  writingWindowAutoFollow: true,
};
export type NotebookPreferences = typeof DEFAULT_NOTEBOOK_PREFERENCES;

export function readNotebookPreferences(): NotebookPreferences {
  const result = { ...DEFAULT_NOTEBOOK_PREFERENCES };
  try {
    const value: unknown = JSON.parse(localStorage.getItem(NOTEBOOK_PREFERENCES_KEY) ?? "{}");
    if (value && typeof value === "object") {
      for (const key of Object.keys(result) as (keyof NotebookPreferences)[]) {
        if (key in value && typeof value[key as keyof typeof value] === "boolean") {
          result[key] = value[key as keyof typeof value];
        }
      }
    }
  } catch {
    /* Uma preferência inválida não deve impedir a abertura do caderno. */
  }
  return result;
}

export function useNotebookPreferences() {
  const [preferences, setPreferences] = useState(readNotebookPreferences);
  const [preferenceError, setPreferenceError] = useState("");
  useEffect(() => {
    const apply = () => setPreferences(readNotebookPreferences());
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, apply);
    return () => window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, apply);
  }, []);
  function changePreference(key: keyof NotebookPreferences, value: boolean) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      writeSyncedStorage(NOTEBOOK_PREFERENCES_KEY, JSON.stringify(next));
      setPreferenceError("");
    } catch {
      setPreferenceError(
        "Preferências aplicadas nesta sessão. O dispositivo não permitiu salvá-las.",
      );
    }
  }
  return { preferences, changePreference, preferenceError };
}
