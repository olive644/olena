export const SYSTEM_UPDATES_READ_KEY = "helena.systemUpdates.read.v1";
export type SystemUpdate = { id: number; version: string; title: string; date: string };

export function recentSystemUpdates(updates: SystemUpdate[], now = Date.now()): SystemUpdate[] {
  return updates.filter((update) => {
    const age = now - Date.parse(update.date);
    return age >= 0 && age < 48 * 60 * 60 * 1000;
  });
}

export function parseReadUpdates(raw: string | undefined | null): number[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0))]
          .sort((a, b) => a - b)
          .slice(-200)
      : [];
  } catch {
    return [];
  }
}

export function mergeReadUpdates(...values: (string | undefined | null)[]): string {
  return JSON.stringify(parseReadUpdates(JSON.stringify(values.flatMap(parseReadUpdates))));
}

export function parseSystemUpdates(value: unknown): SystemUpdate[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is SystemUpdate => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return (
        Number.isSafeInteger(record["id"]) &&
        Number(record["id"]) > 0 &&
        typeof record["version"] === "string" &&
        record["version"].length <= 50 &&
        typeof record["title"] === "string" &&
        record["title"].length <= 200 &&
        typeof record["date"] === "string" &&
        Number.isFinite(new Date(record["date"]).getTime())
      );
    })
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .slice(0, 50);
}
