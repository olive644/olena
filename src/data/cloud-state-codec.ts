import { SYNCED_STORAGE_KEYS } from "./synced-storage";

const supported = new Set<string>(SYNCED_STORAGE_KEYS);
export const cloudWireName = (key: string) =>
  `k_${btoa(key).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;
const wireName = cloudWireName;

// Storage names contain dots; Firebase child names cannot. Values remain unchanged.
export function encodeCloudItems(items: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(items)
      .filter(([key]) => supported.has(key))
      .map(([key, value]) => [wireName(key), value]),
  );
}

export function decodeCloudItems(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [wire, item] of Object.entries(value)) {
    if (typeof item !== "string") continue;
    if (supported.has(wire)) {
      result[wire] = item;
      continue;
    }
    if (!wire.startsWith("k_")) continue;
    try {
      const key = atob(wire.slice(2).replace(/-/g, "+").replace(/_/g, "/"));
      if (supported.has(key) && wireName(key) === wire) result[key] = item;
    } catch {
      /* Malformed keys cannot overwrite application storage. */
    }
  }
  return result;
}
