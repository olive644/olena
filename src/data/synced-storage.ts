import { mergeXpLedgers, XP_LEDGER_KEY } from "../domain/xp-ledger";
import { ACCOUNT_PROFILE_KEY, profileRecord } from "../domain/profile-progress";
export const SYNCED_STORAGE_KEYS = [
  "helenastudy.workspace.v1",
  "helenastudy.theme",
  "helena.onboarding.v1",
  "helena.profile.v1",
  "helena.soloProgress",
  "helena.mathLearning.v1",
  "helena.mathLearning.v2",
  "helena.mathGame.v3",
  "helena.mathGame.v4",
  "helena.mathGame.v5",
  "helena.mathPlaceRewards.v1",
  "helena-study:word-frequency:v1",
  "noteoli.pomodoro-streak.v1",
  "helena.notebookPreferences.v1",
  "helena.systemUpdates.read.v1",
  "olena.focus-session.v1",
  "helena.agendaTimeZone.v1",
] as const;

export const SYNCED_STORAGE_EVENT = "helena:synced-storage-change";
export const SYNCED_STORAGE_APPLIED_EVENT = "helena:synced-storage-applied";

export function writeSyncedStorage(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
}

export function readSyncedStorage(): Record<string, string> {
  const items = Object.fromEntries(
    SYNCED_STORAGE_KEYS.flatMap((key) => {
      const value = window.localStorage.getItem(key);
      return value === null ? [] : [[key, value]];
    }),
  );
  const profile = profileRecord(items[ACCOUNT_PROFILE_KEY]);
  const xp = mergeXpLedgers(
    JSON.stringify(profile["xpLedger"]),
    window.localStorage.getItem(XP_LEDGER_KEY),
  );
  if (xp)
    items[ACCOUNT_PROFILE_KEY] = JSON.stringify({
      ...profile,
      xpLedger: JSON.parse(xp) as unknown,
    });
  return items;
}

export function applySyncedStorage(items: Record<string, string>) {
  for (const key of SYNCED_STORAGE_KEYS) {
    const value = items[key];
    if (typeof value === "string") window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  }
  const xp = profileRecord(items[ACCOUNT_PROFILE_KEY])["xpLedger"];
  if (xp) window.localStorage.setItem(XP_LEDGER_KEY, JSON.stringify(xp));
  else window.localStorage.removeItem(XP_LEDGER_KEY);
  window.dispatchEvent(new Event(SYNCED_STORAGE_APPLIED_EVENT));
}
