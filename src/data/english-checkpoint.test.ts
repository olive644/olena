import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { validEnglishCheckpoint, mergeEnglishCheckpoints } from "../domain/english-checkpoint";
import {
  readEnglishCheckpoint,
  saveEnglishCheckpoint,
  lastEnglishCheckpointPart,
} from "./english-checkpoint";
import { mergeSyncedItems } from "./sync-conflict";
import { ACCOUNT_OWNER_KEY } from "./personal-data";
const profile = "helena.profile.v1";
const point = { owner: "a", part: 0, mode: "practice" as const, question: 137, updatedAt: 10 };
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it("keeps the exact pending ID while preserving profile data and refusing another owner", () => {
  localStorage.setItem(ACCOUNT_OWNER_KEY, "a");
  localStorage.setItem(
    profile,
    JSON.stringify({ name: "Learner", xpLedger: { total: 20, receipts: ["a"] } }),
  );
  expect(saveEnglishCheckpoint(point, "a")).toBe(true);
  expect(readEnglishCheckpoint(0, "practice")?.question).toBe(137);
  expect(JSON.parse(localStorage.getItem(profile)!).name).toBe("Learner");
  expect(JSON.parse(localStorage.getItem(profile)!).xpLedger.total).toBe(20);
  localStorage.setItem(ACCOUNT_OWNER_KEY, "b");
  expect(saveEnglishCheckpoint({ ...point, question: 138 }, "a")).toBe(false);
  expect(readEnglishCheckpoint(0, "practice")).toBeUndefined();
  expect(readEnglishCheckpoint(1, "practice")).toBeUndefined();
});
it("merges per-part cursors and preserves a newer clear without profile conflicts", () => {
  const key = "0:practice";
  const old = JSON.stringify({ name: "Old", englishCheckpoints: { [key]: point } });
  const next = JSON.stringify({
    name: "Old",
    englishCheckpoints: { [key]: { ...point, question: null, updatedAt: 20 } },
  });
  const remote = JSON.stringify({
    name: "New",
    englishCheckpoints: { [key]: point, "1:practice": { ...point, part: 1, question: 12 } },
  });
  const merged = mergeSyncedItems({ [profile]: old }, { [profile]: next }, { [profile]: remote });
  expect(merged.conflicts).toEqual([]);
  const result = JSON.parse(merged.items[profile]!);
  expect(result.name).toBe("New");
  expect(result.englishCheckpoints[key].question).toBeNull();
  expect(result.englishCheckpoints["1:practice"].question).toBe(12);
  expect(
    mergeEnglishCheckpoints(result.englishCheckpoints, { [key]: point })[key]?.question,
  ).toBeNull();
});
it("validates final positions and answers and rejects malformed or out-of-bank cursors", () => {
  const final = {
    owner: "a",
    part: 0,
    mode: "final",
    updatedAt: 10,
    question: 156,
    final: {
      id: "english:arcade:example",
      ids: [136, 156, 176, 196, 216],
      at: 1,
      correct: [136],
      missed: [],
    },
  };
  expect(validEnglishCheckpoint(final)).toBe(true);
  expect(validEnglishCheckpoint({ ...final, final: { ...final.final, at: 5 } })).toBe(false);
  expect(validEnglishCheckpoint({ ...final, final: { ...final.final, correct: [216] } })).toBe(
    false,
  );
  expect(validEnglishCheckpoint({ ...point, question: 240 })).toBe(false);
  expect(validEnglishCheckpoint({ ...point, part: 1, question: 151 })).toBe(true);
  expect(validEnglishCheckpoint({ ...point, part: 2, question: 151 })).toBe(true);
  expect(validEnglishCheckpoint({ ...point, part: 1, question: 176 })).toBe(false);
  expect(validEnglishCheckpoint({ ...point, part: 5, question: 120 })).toBe(false);
  expect(validEnglishCheckpoint({ ...point, question: null })).toBe(true);
});

it("remembers the last practiced part, including a cleared question", () => {
  localStorage.setItem(ACCOUNT_OWNER_KEY, "a");
  saveEnglishCheckpoint(point, "a");
  saveEnglishCheckpoint({ ...point, part: 2, question: 24 }, "a");
  expect(lastEnglishCheckpointPart()).toBe(2);
  saveEnglishCheckpoint({ ...point, part: 2, question: null }, "a");
  expect(lastEnglishCheckpointPart()).toBe(2);
  localStorage.setItem(ACCOUNT_OWNER_KEY, "b");
  expect(lastEnglishCheckpointPart()).toBeUndefined();
});

it("does not overwrite an unreadable profile or crash when browser storage is denied", () => {
  localStorage.setItem(ACCOUNT_OWNER_KEY, "a");
  localStorage.setItem(profile, "bad json");
  expect(saveEnglishCheckpoint(point, "a")).toBe(false);
  expect(localStorage.getItem(profile)).toBe("bad json");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  expect(readEnglishCheckpoint(0, "practice")).toBeUndefined();
  expect(lastEnglishCheckpointPart()).toBeUndefined();
  expect(saveEnglishCheckpoint(point, "a")).toBe(false);
});
