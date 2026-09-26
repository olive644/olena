import { WORKSPACE_VERSION, type WorkspaceState } from "../domain/workspace";
import { PACKED_STORAGE_WRITES, packWorkspace, unpackWorkspace } from "./handwriting-pack";

export const WORKSPACE_HISTORY_KEY = "helenastudy.workspace.history.v1";
export const MAX_WORKSPACE_HISTORY = 6;
const MAX_HISTORY_SNAPSHOT_LENGTH = 1_500_000;

export type WorkspaceHistoryEntry = {
  id: string;
  savedAt: number;
  workspace: WorkspaceState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkspace(value: unknown): value is WorkspaceState {
  if (!isRecord(value) || value["version"] !== WORKSPACE_VERSION) return false;
  return (
    [
      "subjects",
      "tasks",
      "events",
      "habits",
      "notebooks",
      "notes",
      "focusSessions",
      "materials",
      "flashcards",
      "goals",
      "quizAttempts",
      "bingoBoards",
      "homeworkLists",
    ].every((key) => Array.isArray(value[key])) &&
    isRecord(value["focusPreferences"]) &&
    isRecord(value["studyPreferences"])
  );
}

function isEntry(value: unknown): value is WorkspaceHistoryEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value["id"] === "string" &&
    typeof value["savedAt"] === "number" &&
    Number.isFinite(value["savedAt"]) &&
    isWorkspace(value["workspace"])
  );
}

export function loadWorkspaceHistory(storage: Pick<Storage, "getItem">): WorkspaceHistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(WORKSPACE_HISTORY_KEY) ?? "null");
    if (!isRecord(parsed) || parsed["version"] !== 1 || !Array.isArray(parsed["entries"])) {
      return [];
    }
    return parsed["entries"]
      .map((entry) =>
        isRecord(entry) ? { ...entry, workspace: unpackWorkspace(entry["workspace"]) } : entry,
      )
      .filter(isEntry)
      .slice(0, MAX_WORKSPACE_HISTORY);
  } catch {
    return [];
  }
}

export function recordWorkspaceSnapshot(
  storage: Pick<Storage, "getItem" | "setItem">,
  workspace: WorkspaceState,
  savedAt = Date.now(),
): boolean {
  const serializedWorkspace = JSON.stringify(workspace);
  if (serializedWorkspace.length > MAX_HISTORY_SNAPSHOT_LENGTH) return false;
  const current = loadWorkspaceHistory(storage);
  if (current[0] && JSON.stringify(current[0].workspace) === serializedWorkspace) return false;
  const entry: WorkspaceHistoryEntry = {
    id: `workspace-${savedAt}-${current.length}`,
    savedAt,
    workspace,
  };
  try {
    storage.setItem(
      WORKSPACE_HISTORY_KEY,
      JSON.stringify({
        version: 1,
        entries: [entry, ...current]
          .slice(0, MAX_WORKSPACE_HISTORY)
          .map((item) =>
            PACKED_STORAGE_WRITES ? { ...item, workspace: packWorkspace(item.workspace) } : item,
          ),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
