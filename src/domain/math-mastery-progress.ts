import { isMathCourse, MATH_COURSES, type MathCourseId } from "../data/math-courses.js";
import { QUESTION_MASK, countSolved } from "./math-game-progress.js";
import {
  challengeCompletion,
  mergeChallengeProgress,
  upgradeChallengeProgress,
  validChallengeProgress,
  type ChallengeProgress,
} from "./math-challenge-progress.js";

export const MASTERY_KEY = "helena.mathGame.v5";
export const ERROR_KINDS = [
  "regrouping",
  "inverse",
  "sign",
  "scale",
  "rule",
  "order",
  "time",
] as const;
export type ErrorKind = (typeof ERROR_KINDS)[number];
export type FinalRound = { level: number; slots: number[]; answered: number; correct: number };
export type Recovery = {
  seed: number;
  kind: ErrorKind;
  due: number;
  updated: number;
  resolved: boolean;
};
export type MasteryProgress = ChallengeProgress & {
  confirmed: number;
  finalSeen: number[];
  final: FinalRound | null;
  recovery: Recovery[];
  cooldown: number;
};

// Fronteira explícita: versões anteriores não recebem campos desconhecidos.
export function challengeEvidence(p: MasteryProgress): ChallengeProgress {
  return {
    level: p.level,
    mastery: p.mastery,
    mastered: p.mastered,
    solved: p.solved,
    seen: p.seen,
    extraSolved: p.extraSolved,
    extraSeen: p.extraSeen,
    attempts: p.attempts,
    recent: p.recent,
    retry: p.retry,
    correct: p.correct,
    best: p.best,
    ...(p.errors === undefined ? {} : { errors: p.errors }),
  };
}
export function upgradeMasteryProgress(p = upgradeChallengeProgress()): MasteryProgress {
  return {
    ...p,
    confirmed: p.mastered,
    finalSeen: Array<number>(6).fill(0),
    final: null,
    recovery: [],
    cooldown: 0,
  };
}
export function masteryCompletion(p: MasteryProgress) {
  const counts = challengeCompletion(p).counts.map((count, level) =>
    (p.confirmed & (1 << level)) !== 0 ? 20 : Math.min(19, count),
  );
  return {
    counts,
    mastered: p.confirmed,
    level: Array.from({ length: 6 }, (_, i) => i).find((i) => (p.confirmed & (1 << i)) === 0) ?? 5,
    percent: Math.floor((counts.reduce((a, b) => a + b, 0) / 120) * 100),
  };
}
export function pendingFinal(p: MasteryProgress): FinalRound | null {
  if (p.final) return p.final;
  const level = masteryCompletion(p).level;
  if (p.confirmed === 63 || p.cooldown > 0 || (p.mastered & (1 << level)) === 0) return null;
  const available = Array.from({ length: 24 }, (_, i) => i).filter(
    (i) => (p.finalSeen[level]! & (1 << i)) === 0,
  );
  const slots: number[] = [];
  for (let i = 0; i < 5; i++) {
    const format = (level + Math.floor(countSolved(p.finalSeen[level]!) / 5) + i) % 4;
    const slot =
      available.find((s) => Math.floor(s / 6) === format) ??
      Array.from({ length: 24 }, (_, s) => s).find(
        (s) => !slots.includes(s) && Math.floor(s / 6) === format,
      )!;
    slots.push(slot);
    const position = available.indexOf(slot);
    if (position !== -1) available.splice(position, 1);
  }
  return { level, slots, answered: 0, correct: 0 };
}
export function settleMastery(p: MasteryProgress): MasteryProgress {
  let result = p;
  if (p.final?.answered === 31) {
    const passed = countSolved(p.final.correct) >= 4;
    result = {
      ...p,
      final: null,
      cooldown: passed ? 0 : 4,
      confirmed: p.confirmed | (passed ? 1 << p.final.level : 0),
    };
  }
  const level = masteryCompletion(result).level;
  return {
    ...result,
    final:
      result.final && (result.confirmed & (1 << result.final.level)) === 0 ? result.final : null,
    recovery: result.recovery.filter(
      (r) => Math.floor((r.seed - 1) / 48) === level && result.confirmed !== 63,
    ),
  };
}
export function validMasteryProgress(value: unknown): value is MasteryProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as MasteryProgress;
  const allowed = [
    "level",
    "mastery",
    "mastered",
    "solved",
    "seen",
    "extraSolved",
    "extraSeen",
    "attempts",
    "recent",
    "retry",
    "correct",
    "best",
    "errors",
    "confirmed",
    "finalSeen",
    "final",
    "recovery",
    "cooldown",
  ];
  if (
    Object.keys(p).some((key) => !allowed.includes(key)) ||
    !validChallengeProgress(challengeEvidence(p))
  )
    return false;
  const integer = (n: unknown, min: number, max: number) =>
    Number.isSafeInteger(n) && Number(n) >= min && Number(n) <= max;
  if (
    !integer(p.confirmed, 0, 63) ||
    (p.confirmed & p.mastered) !== p.confirmed ||
    ![0, 1, 3, 7, 15, 31, 63].includes(p.confirmed) ||
    !integer(p.cooldown, 0, 4) ||
    p.level > masteryCompletion(p).level + 1
  )
    return false;
  if (
    !Array.isArray(p.finalSeen) ||
    p.finalSeen.length !== 6 ||
    !p.finalSeen.every((m) => integer(m, 0, QUESTION_MASK))
  )
    return false;
  if (
    !Array.isArray(p.recovery) ||
    p.recovery.length > 6 ||
    new Set(p.recovery.map((r) => r?.seed)).size !== p.recovery.length ||
    !p.recovery.every(
      (r) =>
        r &&
        Object.keys(r).length === 5 &&
        integer(r.seed, 1, 288) &&
        ERROR_KINDS.includes(r.kind) &&
        integer(r.due, 0, 100004) &&
        integer(r.updated, 0, p.attempts) &&
        typeof r.resolved === "boolean" &&
        Math.floor((r.seed - 1) / 48) === masteryCompletion(p).level,
    )
  )
    return false;
  if (p.final !== null) {
    const f = p.final;
    if (
      !f ||
      typeof f !== "object" ||
      Object.keys(f).length !== 4 ||
      !integer(f.level, 0, 5) ||
      f.level !== masteryCompletion(p).level ||
      (p.mastered & (1 << f.level)) === 0 ||
      p.cooldown !== 0 ||
      !Array.isArray(f.slots) ||
      f.slots.length !== 5 ||
      new Set(f.slots).size !== 5 ||
      new Set(f.slots.map((s) => Math.floor(s / 6))).size !== 4 ||
      !f.slots.every((s) => integer(s, 0, 23)) ||
      !integer(f.answered, 0, 30) ||
      ![0, 1, 3, 7, 15].includes(f.answered) ||
      !integer(f.correct, 0, 31) ||
      (f.correct & f.answered) !== f.correct ||
      !f.slots.every(
        (s, i) => (f.answered & (1 << i)) === 0 || (p.finalSeen[f.level]! & (1 << s)) !== 0,
      )
    )
      return false;
  }
  return true;
}
export function mergeMasteryProgress(a: MasteryProgress, b: MasteryProgress): MasteryProgress {
  const latest =
    a.attempts > b.attempts
      ? a
      : b.attempts > a.attempts
        ? b
        : JSON.stringify(a) <= JSON.stringify(b)
          ? a
          : b;
  let final = latest.final;
  if (
    a.final &&
    b.final &&
    a.final.level === b.final.level &&
    JSON.stringify(a.final.slots) === JSON.stringify(b.final.slots)
  )
    final = {
      ...a.final,
      answered: a.final.answered | b.final.answered,
      correct: a.final.correct | b.final.correct,
    };
  const recovery = [...a.recovery, ...b.recovery]
    .sort(
      (x, y) =>
        y.updated - x.updated ||
        Number(y.resolved) - Number(x.resolved) ||
        y.due - x.due ||
        x.seed - y.seed ||
        x.kind.localeCompare(y.kind),
    )
    .filter((r, i, list) => list.findIndex((other) => other.seed === r.seed) === i)
    .slice(0, 6);
  return settleMastery({
    ...latest,
    ...mergeChallengeProgress(challengeEvidence(a), challengeEvidence(b)),
    confirmed: a.confirmed | b.confirmed,
    finalSeen: a.finalSeen.map((m, l) => m | b.finalSeen[l]!),
    final,
    recovery,
  });
}
export function parseMasteryProgress(
  raw: string | null,
): Partial<Record<MathCourseId, MasteryProgress>> {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([id, p]) => isMathCourse(id) && validMasteryProgress(p)),
    );
  } catch {
    return {};
  }
}
export function unlockedMasteryCourse(
  course: MathCourseId,
  progress: Partial<Record<MathCourseId, MasteryProgress>>,
) {
  return MATH_COURSES.slice(
    0,
    MATH_COURSES.findIndex((c) => c.id === course),
  ).every((c) => progress[c.id] && masteryCompletion(progress[c.id]!).percent === 100);
}
