import { mergeMathRewards } from "./math-rewards-sync";
import { mergeReadUpdates, SYSTEM_UPDATES_READ_KEY } from "./system-updates";
import { FOCUS_SESSION_KEY, readFocusSession } from "../domain/focus-session";
export type SyncedItems = Record<string, string>;

export type SyncedMergeResult = {
  items: SyncedItems;
  conflicts: string[];
};

function valueAt(items: SyncedItems, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(items, key) ? items[key] : undefined;
}

/**
 * Three-way merge for localStorage keys.
 * Local edits win only when both devices changed the same key differently;
 * the caller can persist the remote snapshot before uploading the result.
 */
export function mergeSyncedItems(
  base: SyncedItems,
  local: SyncedItems,
  remote: SyncedItems,
): SyncedMergeResult {
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  const items: SyncedItems = {};
  const conflicts: string[] = [];
  for (const key of keys) {
    const baseValue = valueAt(base, key);
    const localValue = valueAt(local, key);
    const remoteValue = valueAt(remote, key);
    if (key === SYSTEM_UPDATES_READ_KEY) {
      items[key] = mergeReadUpdates(baseValue, localValue, remoteValue);
      continue;
    }
    if (key === FOCUS_SESSION_KEY) {
      const localSession = readFocusSession(localValue ?? null, Date.now());
      const remoteSession = readFocusSession(remoteValue ?? null, Date.now());
      const latest =
        localSession && (!remoteSession || localSession.savedAt >= remoteSession.savedAt)
          ? localValue
          : remoteSession
            ? remoteValue
            : undefined;
      if (latest !== undefined) items[key] = latest;
      continue;
    }
    if (key === "noteoli.pomodoro-streak.v1") {
      const days = (raw: string | undefined): string[] => {
        try {
          const parsed: unknown = JSON.parse(raw ?? "[]");
          return Array.isArray(parsed)
            ? parsed.filter(
                (day): day is string =>
                  typeof day === "string" &&
                  /^\d{4}-\d{2}-\d{2}$/.test(day) &&
                  Number.isFinite(Date.parse(`${day}T00:00:00Z`)) &&
                  new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day,
              )
            : [];
        } catch {
          return [];
        }
      };
      items[key] = JSON.stringify([...new Set([...days(localValue), ...days(remoteValue)])].sort());
      continue;
    }
    const localChanged = localValue !== baseValue;
    const remoteChanged = remoteValue !== baseValue;
    if (
      key === "helena.mathPlaceRewards.v1" &&
      localValue !== undefined &&
      remoteValue !== undefined &&
      localValue !== remoteValue
    ) {
      const result = mergeMathRewards(baseValue, localValue, remoteValue);
      items[key] = result.value;
      if (result.conflict) conflicts.push(key);
      continue;
    }
    const mergedValue =
      localChanged && remoteChanged && localValue !== remoteValue
        ? localValue
        : localChanged
          ? localValue
          : remoteValue;
    if (localChanged && remoteChanged && localValue !== remoteValue) conflicts.push(key);
    if (mergedValue !== undefined) items[key] = mergedValue;
  }
  return { items, conflicts };
}
