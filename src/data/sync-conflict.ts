import { mergeMathRewards } from "./math-rewards-sync";
import { mergeReadUpdates, SYSTEM_UPDATES_READ_KEY } from "./system-updates";
import { FOCUS_SESSION_KEY, readFocusSession } from "../domain/focus-session";
import { isMathCourse, validMathProgress, type MathProgress } from "./math-courses";
import { MATH_GAME_KEY, mergeMathGame, parseMathGame } from "../domain/math-game-progress";
import {
  MASTERY_KEY,
  mergeMasteryProgress,
  parseMasteryProgress,
} from "../domain/math-mastery-progress";
import {
  CHALLENGE_KEY,
  mergeChallengeProgress,
  parseChallengeProgress,
} from "../domain/math-challenge-progress";
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
    if (key === MASTERY_KEY) {
      const left = parseMasteryProgress(localValue ?? "{}"),
        right = parseMasteryProgress(remoteValue ?? "{}");
      const merged = { ...left };
      for (const [id, p] of Object.entries(right))
        if (isMathCourse(id)) merged[id] = left[id] ? mergeMasteryProgress(left[id], p) : p;
      items[key] = JSON.stringify(merged);
      continue;
    }
    if (key === CHALLENGE_KEY) {
      const left = parseChallengeProgress(localValue ?? "{}"),
        right = parseChallengeProgress(remoteValue ?? "{}");
      const merged = { ...left };
      for (const [id, p] of Object.entries(right))
        if (isMathCourse(id)) merged[id] = left[id] ? mergeChallengeProgress(left[id], p) : p;
      items[key] = JSON.stringify(merged);
      continue;
    }
    if (key === MATH_GAME_KEY) {
      const left = parseMathGame(localValue ?? "{}"),
        right = parseMathGame(remoteValue ?? "{}");
      const merged = { ...left };
      for (const [id, progress] of Object.entries(right)) {
        if (!isMathCourse(id)) continue;
        merged[id] = left[id] ? mergeMathGame(left[id], progress) : progress;
      }
      items[key] = JSON.stringify(merged);
      continue;
    }
    if (key === "helena.mathLearning.v2") {
      const read = (raw: string | undefined): Record<string, MathProgress> => {
        try {
          const value: unknown = JSON.parse(raw ?? "{}");
          if (!value || typeof value !== "object" || Array.isArray(value)) return {};
          return Object.fromEntries(
            Object.entries(value).filter(
              ([id, progress]) => isMathCourse(id) && validMathProgress(progress),
            ),
          );
        } catch {
          return {};
        }
      };
      const left = read(localValue),
        right = read(remoteValue);
      const merged: Record<string, MathProgress> = {};
      for (const id of new Set([...Object.keys(left), ...Object.keys(right)])) {
        const a = left[id],
          b = right[id];
        if (!a || !b) {
          merged[id] = (a ?? b)!;
          continue;
        }
        const latest = a.correct >= b.correct ? a : b;
        merged[id] = {
          ...latest,
          best: Math.max(a.best, b.best),
          mastered: (a.mastered ?? 0) | (b.mastered ?? 0),
        };
      }
      items[key] = JSON.stringify(merged);
      continue;
    }
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
