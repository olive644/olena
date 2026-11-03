export type EnglishMiss = { id: number; choice: string; timedOut: boolean };
export type EnglishCheckpoint = {
  owner: string | null;
  part: number;
  mode: "practice" | "final";
  updatedAt: number;
  question: number | null;
  final?: { id: string; ids: number[]; at: number; correct: number[]; missed: EnglishMiss[] };
};
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function validEnglishCheckpoint(value: unknown): value is EnglishCheckpoint {
  if (
    !object(value) ||
    !(
      value["owner"] === null ||
      (typeof value["owner"] === "string" && value["owner"].length <= 256)
    ) ||
    !Number.isInteger(value["part"]) ||
    Number(value["part"]) < 0 ||
    Number(value["part"]) > 5 ||
    !["practice", "final"].includes(String(value["mode"])) ||
    !Number.isSafeInteger(value["updatedAt"]) ||
    Number(value["updatedAt"]) < 0
  )
    return false;
  const bank = value["part"] === 0 ? 240 : 120;
  const id = (n: unknown): n is number => Number.isInteger(n) && Number(n) >= 0 && Number(n) < bank;
  if (value["question"] === null) return value["final"] === undefined;
  if (!id(value["question"])) return false;
  if (value["mode"] === "practice") return value["final"] === undefined;
  const final = value["final"];
  if (
    !object(final) ||
    typeof final["id"] !== "string" ||
    !/^english:arcade:[a-zA-Z0-9-]{1,80}$/.test(final["id"]) ||
    !Array.isArray(final["ids"]) ||
    final["ids"].length !== 5 ||
    !final["ids"].every(id) ||
    new Set(final["ids"]).size !== 5 ||
    !Number.isInteger(final["at"]) ||
    Number(final["at"]) < 0 ||
    Number(final["at"]) > 4 ||
    final["ids"][Number(final["at"])] !== value["question"] ||
    !Array.isArray(final["correct"]) ||
    !Array.isArray(final["missed"])
  )
    return false;
  const answered = final["ids"].slice(0, Number(final["at"]));
  const correct: unknown[] = final["correct"],
    missed: unknown[] = final["missed"];
  return (
    correct.every((n) => id(n) && answered.includes(n)) &&
    new Set(correct).size === correct.length &&
    missed.length + correct.length === answered.length &&
    missed.every(
      (m) =>
        object(m) &&
        id(m["id"]) &&
        answered.includes(m["id"]) &&
        !correct.includes(m["id"]) &&
        typeof m["choice"] === "string" &&
        m["choice"].length <= 1600 &&
        typeof m["timedOut"] === "boolean",
    ) &&
    new Set(missed.map((m) => (m as EnglishMiss).id)).size === missed.length
  );
}
export function mergeEnglishCheckpoints(...values: unknown[]): Record<string, EnglishCheckpoint> {
  const result: Record<string, EnglishCheckpoint> = {};
  for (const value of values) {
    if (!object(value)) continue;
    for (const entry of Object.values(value)) {
      if (!validEnglishCheckpoint(entry)) continue;
      const key = `${entry.part}:${entry.mode}`,
        old = result[key];
      if (
        !old ||
        entry.updatedAt > old.updatedAt ||
        (entry.updatedAt === old.updatedAt && JSON.stringify(entry) > JSON.stringify(old))
      )
        result[key] = entry;
    }
  }
  return result;
}
