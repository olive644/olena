import { englishProgress, validLanguageAttempt } from "../domain/language-progress.js";
import type { PracticeActivity } from "../domain/workspace.js";
import { createHash } from "node:crypto";
import { isMathCourse } from "../data/math-courses.js";
import type { SocialActivitySummary } from "../domain/profile-social.js";
export type StudyActivity = SocialActivitySummary;
const identity = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);
function acceptedEnglish(records: unknown, now: number): PracticeActivity[] {
  if (!Array.isArray(records)) return [];
  const candidates: PracticeActivity[] = [];
  for (const record of records.slice(-5000)) {
    if (!record || typeof record !== "object") continue;
    const item = record as Record<string, unknown>;
    const attempt = item["englishA1Attempt"] ?? item["englishAttempt"] ?? item["languageAttempt"];
    if (
      (item["islandId"] !== "english" && item["islandId"] !== "languages") ||
      typeof item["id"] !== "string" ||
      typeof item["completedAt"] !== "string" ||
      Date.parse(item["completedAt"]) > now ||
      !validLanguageAttempt(attempt) ||
      typeof item["answers"] !== "number" ||
      typeof item["correct"] !== "number"
    )
      continue;
    candidates.push({
      id: item["id"],
      islandId: item["islandId"],
      islandName: "",
      completedAt: item["completedAt"],
      answers: item["answers"],
      correct: item["correct"],
      englishAttempt: attempt,
      ...(item["englishFinalFailure"] === true ? { englishFinalFailure: true } : {}),
      ...(item["englishA1FinalFailure"] === true ? { englishA1FinalFailure: true } : {}),
    });
  }
  return englishProgress(candidates).accepted;
}
// Apenas IDs de cursos/módulos oficiais e totais numéricos, nunca textos privados.
export function studyActivitySummary(
  raw: string | null,
  now: number,
  timeZone = "America/Sao_Paulo",
): StudyActivity[] {
  let workspace: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    workspace = value as Record<string, unknown>;
  } catch {
    return [];
  }
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const days = new Set<string>();
  const grouped = new Map<string, StudyActivity>();
  let latest = 0;
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
        value > 10000 ||
        typeof item["id"] !== "string"
      )
        continue;
      if (
        kind === "practice" &&
        (item["islandId"] === "english" || item["islandId"] === "languages")
      )
        continue;
      latest = Math.max(latest, at);
      const date = day.format(new Date(at));
      days.add(date);
      if (now - at > 86400000) continue;
      const course =
        typeof item["islandId"] === "string" ? item["islandId"].replace(/^mathematics:/, "") : "";
      if (kind === "practice" && !isMathCourse(course)) continue;
      if (
        kind === "practice" &&
        Number.isInteger(item["moduleLevel"]) &&
        Number(item["moduleLevel"]) >= 0 &&
        Number(item["moduleLevel"]) < 6
      ) {
        const level = Number(item["moduleLevel"]);
        const id = identity(`module:${course}:${level}`);
        grouped.set(id, { id, kind: "module", value: 1, course, level, at });
      }
      const id = identity(`${kind}:${date}:${course}`);
      const previous = grouped.get(id);
      grouped.set(id, {
        id,
        kind,
        value: Math.min(10000, (previous?.value ?? 0) + value),
        at: Math.max(previous?.at ?? 0, at),
        ...(kind === "practice" ? { course } : {}),
      });
    }
  }
  for (const record of acceptedEnglish(workspace["practiceActivities"], now)) {
    const at = Date.parse(record.completedAt);
    const date = day.format(new Date(at));
    days.add(date);
    latest = Math.max(latest, at);
    if (now - at > 86400000) continue;
    const attempt = record.englishAttempt!;
    if (Number(attempt.curriculum) >= 3 && attempt.mode === "final" && record.correct >= 4) {
      const id = identity(`module:english:${attempt.part}`);
      if (!grouped.has(id))
        grouped.set(id, {
          id,
          kind: "module",
          course: "english",
          level: attempt.part,
          value: 1,
          at,
        });
    }
    const id = identity(`practice:${date}:english`);
    const previous = grouped.get(id);
    grouped.set(id, {
      id,
      kind: "practice",
      course: "english",
      value: Math.min(10000, (previous?.value ?? 0) + record.answers),
      at: Math.max(previous?.at ?? 0, at),
    });
  }
  const today = day.format(new Date(now));
  let streak = 0;
  while (
    days.has(
      new Date(Date.parse(`${today}T00:00:00Z`) - streak * 86400000).toISOString().slice(0, 10),
    )
  )
    streak++;
  if ([3, 7, 14, 30, 60, 100, 365].includes(streak)) {
    const id = identity(`streak:${today}`);
    grouped.set(id, { id, kind: "streak", value: streak, at: latest });
  }
  return [...grouped.values()]
    .filter(
      (item) =>
        item.kind === "module" ||
        item.kind === "streak" ||
        item.value >= (item.kind === "quiz" ? 5 : 10),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 12);
}
