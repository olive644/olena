import { expect, it } from "vitest";
import {
  parseReadUpdates,
  parseSystemUpdates,
  recentSystemUpdates,
  SYSTEM_UPDATES_READ_KEY,
} from "./system-updates";
import { mergeSyncedItems } from "./sync-conflict";
import { applySyncedStorage, readSyncedStorage, writeSyncedStorage } from "./synced-storage";
import { clearPersonalData } from "./personal-data";

it("oculta avisos após 48 horas sem apagar os registros de leitura", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  const update = (id: number, age: number) => ({
    id,
    version: "beta",
    title: "Aviso",
    date: new Date(now - age).toISOString(),
  });
  const updates = [
    update(1, 0),
    update(2, 48 * 3600000 - 1),
    update(3, 48 * 3600000),
    update(4, -1000),
  ];
  expect(recentSystemUpdates(updates, now).map((item) => item.id)).toEqual([1, 2]);
  expect(updates).toHaveLength(4);
});

it("merges independent read receipts and preserves them with older clients", () => {
  const key = SYSTEM_UPDATES_READ_KEY;
  const result = mergeSyncedItems(
    { [key]: "[408]" },
    { [key]: "[408,409]" },
    { [key]: "[408,410]" },
  );
  expect(result.items[key]).toBe("[408,409,410]");
  expect(result.conflicts).toEqual([]);
  expect(mergeSyncedItems({ [key]: "[408]" }, {}, { [key]: "[408,409]" }).items[key]).toBe(
    "[408,409]",
  );
  writeSyncedStorage(key, result.items[key]!);
  expect(readSyncedStorage()[key]).toBe(result.items[key]);
  applySyncedStorage({ [key]: "[411]" });
  expect(parseReadUpdates(localStorage.getItem(key))).toEqual([411]);
  clearPersonalData(localStorage);
  expect(localStorage.getItem(key)).toBeNull();
});

it("rejects malformed notifications and read receipts", () => {
  expect(parseReadUpdates("null")).toEqual([]);
  expect(parseReadUpdates("broken")).toEqual([]);
  expect(parseReadUpdates('[408,408,-1,"409",null]')).toEqual([408]);
  const update = { id: 408, version: "beta.408", title: "Agenda", date: "2026-10-11T12:00:00Z" };
  expect(parseSystemUpdates([update, update, { ...update, id: 409, date: "bad" }])).toEqual([
    update,
  ]);
});
