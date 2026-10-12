import { expect, it } from "vitest";
import { SYNCED_STORAGE_KEYS } from "./synced-storage";
import { encodeCloudItems, decodeCloudItems } from "./cloud-state-codec";

it("encodes every synced storage name into a legal Firebase key and round-trips values", () => {
  const local = Object.fromEntries(SYNCED_STORAGE_KEYS.map((key) => [key, `saved:${key}`]));
  const wire = encodeCloudItems(local);
  for (const key of Object.keys(wire)) {
    expect(key).not.toMatch(/[.$#[\]/]/);
    expect(key.length).toBeLessThanOrEqual(100);
  }
  expect(decodeCloudItems(wire)).toEqual(local);
});
it("reads legacy plain names and rejects malformed or unrelated wire entries", () => {
  const legacy = { "helenastudy.workspace.v1": "legacy", "helena.profile.v1": "profile" };
  expect(decodeCloudItems(legacy)).toEqual(legacy);
  expect(
    decodeCloudItems({ ...encodeCloudItems(legacy), unknown: "ignored", k_$$$$: "invalid" }),
  ).toEqual(legacy);
});
