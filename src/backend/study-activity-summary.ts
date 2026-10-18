import { createHash } from "node:crypto";
export type StudyActivity = {
  id: string;
  kind: "practice" | "focus" | "quiz" | "streak";
  value: number;
  at: number;
};

// Somente resumos numéricos de registros salvos, nunca títulos ou conteúdo de estudos.
export function studyActivitySummary(
  raw: string | null,
  now: number,
  timeZone = "America/Sao_Paulo",
): StudyActivity[] {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  let workspace: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    workspace = value as Record<string, unknown>;
  } catch {
    return [];
  }
  const result: StudyActivity[] = [];
  const days = new Set<string>();
  for (const [field, kind, number] of [
    ["practiceActivities", "practice", "answers"],
    ["focusSessions", "focus", "durationMinutes"],
    ["quizAttempts", "quiz", "correct"],
  ] as const) {
    const records = workspace[field];
    if (!Array.isArray(records)) continue;
    for (const record of records.slice(-5000)) {
      if (!record || typeof record !== "object") continue;
      const item = record as Record<string, unknown>;
      const at = typeof item["completedAt"] === "string" ? Date.parse(item["completedAt"]) : NaN;
      const value = item[number];
      if (
        !Number.isFinite(at) ||
        at > now ||
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value <= 0 ||
        value > 10000
      )
        continue;
      days.add(dateFormatter.format(new Date(at)));
      if (now - at > 86400000 || typeof item["id"] !== "string") continue;
      const id = createHash("sha256").update(`${kind}:${item["id"]}`).digest("hex").slice(0, 32);
      result.push({ id, kind, value, at });
    }
  }
  const today = dateFormatter.format(new Date(now));
  let streak = 0;
  while (
    days.has(
      new Date(Date.parse(`${today}T00:00:00Z`) - streak * 86400000).toISOString().slice(0, 10),
    )
  )
    streak++;
  if ([3, 7, 14, 30, 60, 100, 365].includes(streak))
    result.push({
      id: createHash("sha256").update(`streak:${today}`).digest("hex").slice(0, 32),
      kind: "streak",
      value: streak,
      at: Math.max(...result.map((item) => item.at), 0),
    });
  return result.sort((a, b) => b.at - a.at).slice(0, 12);
}
