import { ACCOUNT_PROFILE_KEY, profileRecord } from "../domain/profile-progress";
import {
  mergeEnglishCheckpoints,
  validEnglishCheckpoint,
  type EnglishCheckpoint,
} from "../domain/english-checkpoint";
import { ACCOUNT_OWNER_KEY } from "./personal-data";
import { writeSyncedStorage } from "./synced-storage";
function checkpoints(): Record<string, EnglishCheckpoint> {
  try {
    return mergeEnglishCheckpoints(
      profileRecord(localStorage.getItem(ACCOUNT_PROFILE_KEY))["englishCheckpoints"],
    );
  } catch {
    return {};
  }
}
function currentOwner() {
  try {
    return localStorage.getItem(ACCOUNT_OWNER_KEY);
  } catch {
    return undefined;
  }
}
export function readEnglishCheckpoint(part: number, mode: EnglishCheckpoint["mode"]) {
  const value = checkpoints()[`${part}:${mode}`];
  return value && value.owner === currentOwner() && value.question !== null ? value : undefined;
}
export function saveEnglishCheckpoint(
  input: Omit<EnglishCheckpoint, "updatedAt">,
  owner: string | null,
) {
  const value: EnglishCheckpoint = { ...input, updatedAt: Date.now() };
  if (owner !== currentOwner() || !validEnglishCheckpoint(value) || value.owner !== owner)
    return false;
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_KEY);
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const profile = profileRecord(raw);
    const entries = mergeEnglishCheckpoints(profile["englishCheckpoints"]);
    const key = `${value.part}:${value.mode}`;
    entries[key] = {
      ...value,
      updatedAt: Math.max(
        Date.now(),
        ...Object.values(entries).map((entry) => entry.updatedAt + 1),
      ),
    };
    writeSyncedStorage(
      ACCOUNT_PROFILE_KEY,
      JSON.stringify({ ...profile, englishCheckpoints: entries }),
    );
    return true;
  } catch {
    return false;
  }
}

export function lastEnglishCheckpointPart() {
  const owner = currentOwner();
  return Object.values(checkpoints())
    .filter((entry) => entry.owner === owner)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.part;
}
