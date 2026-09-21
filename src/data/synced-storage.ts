export const SYNCED_STORAGE_KEYS = [
  "helenastudy.workspace.v1",
  "helenastudy.theme",
  "helena.onboarding.v1",
  "helena.profile.v1",
  "helena.soloProgress",
  "helena-study:word-frequency:v1",
] as const;

export const SYNCED_STORAGE_EVENT = "helena:synced-storage-change";
export const SYNCED_STORAGE_APPLIED_EVENT = "helena:synced-storage-applied";

export function writeSyncedStorage(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
}

export function readSyncedStorage(): Record<string, string> {
  return Object.fromEntries(
    SYNCED_STORAGE_KEYS.flatMap((key) => {
      const value = window.localStorage.getItem(key);
      return value === null ? [] : [[key, value]];
    }),
  );
}

export function applySyncedStorage(items: Record<string, string>) {
  for (const key of SYNCED_STORAGE_KEYS) {
    const value = items[key];
    if (typeof value === "string") window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event(SYNCED_STORAGE_APPLIED_EVENT));
}
