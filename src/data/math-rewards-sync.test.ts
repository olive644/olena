import { beforeEach, expect, it, vi } from "vitest";
import {
  finishMathPlace,
  mathPlaceRewards,
  MATH_PLACE_REWARDS_KEY,
  openMathChest,
  revealMathCard,
  unlockMathChest,
} from "./math-place-rewards";
import { mergeSyncedItems } from "./sync-conflict";
import { applySyncedStorage, readSyncedStorage, SYNCED_STORAGE_EVENT } from "./synced-storage";
beforeEach(() => localStorage.clear());
function snapshot() {
  return readSyncedStorage();
}
it("exports rewards to account storage and notifies the upload queue", () => {
  const upload = vi.fn();
  window.addEventListener(SYNCED_STORAGE_EVENT, upload);
  try {
    finishMathPlace("foundations", "one", 100, () => 0.5);
    expect(upload).toHaveBeenCalledOnce();
    expect(snapshot()[MATH_PLACE_REWARDS_KEY]).toBeDefined();
  } finally {
    window.removeEventListener(SYNCED_STORAGE_EVENT, upload);
  }
});
it("combines offline rounds without duplicating shared points or chests", () => {
  finishMathPlace("foundations", "shared", 100, () => 0.5);
  const base = snapshot();
  finishMathPlace("foundations", "phone", 150, () => 0.5);
  const phone = snapshot();
  applySyncedStorage(base);
  finishMathPlace("foundations", "desktop", 200, () => 0.5);
  const merged = mergeSyncedItems(base, phone, snapshot());
  expect(merged.conflicts).toEqual([]);
  applySyncedStorage(merged.items);
  expect(mathPlaceRewards("foundations").points).toBe(450);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(3);
  expect(mergeSyncedItems(merged.items, merged.items, phone).items[MATH_PLACE_REWARDS_KEY]).toBe(
    merged.items[MATH_PLACE_REWARDS_KEY],
  );
});
it("preserves cloud countdown, loot and reveals after a stale device returns", () => {
  finishMathPlace("foundations", "one", 100, () => 0.5);
  const base = snapshot();
  unlockMathChest("foundations", "one", 1000);
  openMathChest("foundations", "one", 61000, () => 0);
  revealMathCard("foundations", "one");
  const remote = snapshot();
  const result = mergeSyncedItems(base, base, remote);
  applySyncedStorage(result.items);
  expect(mathPlaceRewards("foundations").chests[0]).toMatchObject({
    unlockAt: 61000,
    opened: true,
    revealed: 1,
    cards: ["first-star"],
  });
});
it("migrates legacy totals without recrediting receipts already present in the ledger", () => {
  finishMathPlace("foundations", "one", 100, () => 0.5);
  const modern = snapshot();
  const legacy = JSON.parse(modern[MATH_PLACE_REWARDS_KEY]!);
  delete legacy.foundations.rounds;
  const old = { [MATH_PLACE_REWARDS_KEY]: JSON.stringify(legacy) };
  applySyncedStorage(mergeSyncedItems({}, old, modern).items);
  expect(mathPlaceRewards("foundations").points).toBe(100);
});
it("backs up conflicting loot through the existing conflict signal instead of rerolling", () => {
  finishMathPlace("foundations", "one", 100, () => 0.5);
  unlockMathChest("foundations", "one", 0);
  const base = snapshot();
  openMathChest("foundations", "one", 60000, () => 0);
  const local = snapshot();
  applySyncedStorage(base);
  openMathChest("foundations", "one", 60000, () => 0.7);
  const merged = mergeSyncedItems(base, local, snapshot());
  expect(merged.conflicts).toEqual([MATH_PLACE_REWARDS_KEY]);
  expect(JSON.parse(merged.items[MATH_PLACE_REWARDS_KEY]!).foundations.chests[0].cards).toEqual([
    "first-star",
  ]);
});
it("keeps invalid remote data recoverable and clears rewards on account storage reset", () => {
  finishMathPlace("foundations", "one", 100, () => 0.5);
  const local = snapshot();
  const result = mergeSyncedItems({}, local, { [MATH_PLACE_REWARDS_KEY]: "corrupt" });
  expect(result.conflicts).toEqual([MATH_PLACE_REWARDS_KEY]);
  expect(result.items).toEqual(local);
  applySyncedStorage({});
  expect(mathPlaceRewards("foundations").points).toBe(0);
});
it("syncs arcane identity, deadline and single tarot reveal without rerolling", () => {
  finishMathPlace("foundations", "rare", 100, () => 0);
  const base = snapshot();
  unlockMathChest("foundations", "rare", 1000);
  openMathChest("foundations", "rare", 61000);
  revealMathCard("foundations", "rare");
  const remote = snapshot();
  const merged = mergeSyncedItems(base, base, remote);
  expect(merged.conflicts).toEqual([]);
  applySyncedStorage(merged.items);
  expect(mathPlaceRewards("foundations").chests[0]).toMatchObject({
    kind: "arcane",
    arcana: "oliver-star-tarot",
    opened: true,
    unlockAt: 61000,
    revealed: 1,
  });
  expect(mergeSyncedItems(merged.items, merged.items, base).items).toEqual(merged.items);
});
it("signals different chest kinds for the same receipt and preserves arcane identity", () => {
  finishMathPlace("foundations", "same", 100, () => 0);
  const arcane = snapshot();
  localStorage.clear();
  finishMathPlace("foundations", "same", 100, () => 0.5);
  const merged = mergeSyncedItems({}, arcane, snapshot());
  expect(merged.conflicts).toEqual([MATH_PLACE_REWARDS_KEY]);
  expect(JSON.parse(merged.items[MATH_PLACE_REWARDS_KEY]!).foundations.chests[0].arcana).toBe(
    "oliver-star-tarot",
  );
});
