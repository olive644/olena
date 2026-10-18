import type { WorkspaceState } from "../domain/workspace";
import { serializeWorkspace, WORKSPACE_STORAGE_KEY } from "./local-workspace";
import { SYNCED_STORAGE_KEYS } from "./synced-storage";

// Exportação local por lista permitida. Nunca enumerar todo o armazenamento.
export function createStudyDataExport(workspace: WorkspaceState, storage: Record<string, string>) {
  const exportedStorage: Record<string, string> = {
    ...Object.fromEntries(
      SYNCED_STORAGE_KEYS.flatMap((key) =>
        typeof storage[key] === "string" ? [[key, storage[key]]] : [],
      ),
    ),
    [WORKSPACE_STORAGE_KEY]: serializeWorkspace(workspace),
  };
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    storage: exportedStorage,
  };
}
