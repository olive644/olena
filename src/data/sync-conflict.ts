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
    const localChanged = localValue !== baseValue;
    const remoteChanged = remoteValue !== baseValue;
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
