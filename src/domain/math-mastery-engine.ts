import { challengeQuestion, type QualityQuestion } from "../data/math-challenge-bank.js";
import { isMathCourse, type MathCourseId } from "../data/math-courses.js";
import { assessMath } from "./adaptive-math.js";
import { assessChallenge, nextChallenge } from "./math-challenge-engine.js";
import { hasChallenge } from "./math-challenge-progress.js";
import { countSolved } from "./math-game-progress.js";
import {
  challengeEvidence,
  masteryCompletion,
  pendingFinal,
  settleMastery,
  validMasteryProgress,
  type MasteryProgress,
  type ErrorKind,
  type Recovery,
} from "./math-mastery-progress.js";

export type MasteryQuestion = QualityQuestion & {
  phase: "practice" | "recovery" | "final";
  position: number | null;
};
function location(q: QualityQuestion) {
  return q.seed > 288
    ? { level: Math.floor((q.seed - 289) / 24), index: 24 + ((q.seed - 289) % 24) }
    : { level: Math.floor((q.seed - 1) / 48), index: (q.seed - 1) % 48 };
}
// A alternativa sugere uma família de erro, não prova o raciocínio do aluno.
export function mistakeKind(
  course: MathCourseId,
  q: QualityQuestion,
  choice: number,
  timedOut = false,
): ErrorKind {
  if (timedOut) return "time";
  const { level } = location(q);
  if (course === "foundations" && level === 1 && [0, 6].includes(q.format)) {
    const match = /^(\d+) − (\d+)(?:\. Resultado\?)?$/.exec(q.expression);
    if (match && Number(match[1]) % 10 < Number(match[2]) % 10 && choice === q.answer + 10)
      return "regrouping";
  }
  if (
    course === "foundations" &&
    ((level < 2 && q.format === 1) || ([2, 3].includes(level) && q.format === 2))
  )
    return "inverse";
  if (q.answer !== 0 && choice === -q.answer) return "sign";
  if (
    q.answer !== 0 &&
    [q.answer * 2, q.answer / 2, q.answer * 10, q.answer / 10].some(
      (n) => Number(n.toFixed(2)) === choice,
    )
  )
    return "scale";
  if (course === "advanced" && level === 4) return "order";
  return "rule";
}
function context(p: MasteryProgress) {
  return { ...challengeEvidence(p), level: masteryCompletion(p).level, retry: [] };
}
function recoveryQuestion(course: MathCourseId, p: MasteryProgress, r: Recovery) {
  const level = Math.floor((r.seed - 1) / 48);
  const format = Math.floor(((r.seed - 1) % 48) / 6);
  const candidates = Array.from({ length: 6 }, (_, i) =>
    challengeQuestion(course, level, format * 6 + i, p.attempts + 1),
  )
    .filter((q) => q.seed !== r.seed && !p.recent.includes(q.seed))
    .filter(
      (q) =>
        r.kind === "time" ||
        q.choices.some((c) => c !== q.answer && mistakeKind(course, q, c) === r.kind),
    );
  candidates.sort(
    (a, b) => Number(hasChallenge(p, a.seed)) - Number(hasChallenge(p, b.seed)) || a.seed - b.seed,
  );
  return candidates[0];
}
function dueRecovery(course: MathCourseId, p: MasteryProgress) {
  return p.recovery
    .filter((r) => !r.resolved && r.due <= p.attempts)
    .sort((a, b) => a.due - b.due || a.seed - b.seed)
    .map((r) => ({ r, q: recoveryQuestion(course, p, r) }))
    .find((v) => v.q);
}
export function nextMasteryQuestion(course: MathCourseId, p: MasteryProgress): MasteryQuestion {
  const final = pendingFinal(p);
  if (final) {
    const position = countSolved(final.answered);
    return {
      ...challengeQuestion(course, final.level, 48 + final.slots[position]!, p.attempts + 1),
      phase: "final",
      position,
    };
  }
  const recovery = p.attempts % 4 === 0 || p.cooldown > 0 ? dueRecovery(course, p) : undefined;
  if (recovery?.q) return { ...recovery.q, phase: "recovery", position: null };
  return { ...nextChallenge(course, context(p)), phase: "practice", position: null };
}
export function assessMastery(
  course: MathCourseId,
  p: MasteryProgress,
  q: MasteryQuestion,
  choice: number,
  elapsed: number,
  streak: number,
  timedOut = false,
) {
  const base = assessMath(context(p), q, choice, elapsed, streak, timedOut);
  let next = { ...p };
  const final = q.phase === "final" ? pendingFinal(p)! : null;
  let finalOutcome: "passed" | "retry" | null = null;
  if (final) {
    const position = countSolved(final.answered);
    const finalSeen = [...p.finalSeen];
    finalSeen[final.level]! |= 1 << final.slots[position]!;
    next = {
      ...next,
      finalSeen,
      attempts: Math.min(100000, p.attempts + 1),
      correct: Math.min(100000, p.correct + Number(base.correct)),
      final: {
        ...final,
        answered: final.answered | (1 << position),
        correct: final.correct | (base.correct ? 1 << position : 0),
      },
    };
    if (next.final!.answered === 31)
      finalOutcome = countSolved(next.final!.correct) >= 4 ? "passed" : "retry";
  } else {
    const assessed = assessChallenge(course, context(p), q, choice, elapsed, streak, timedOut);
    next = { ...next, ...assessed.progress, cooldown: Math.max(0, p.cooldown - 1) };
  }
  const target = q.phase === "recovery" ? dueRecovery(course, p)?.r : undefined;
  let recovery = p.recovery.map((r) =>
    target && r.seed === target.seed
      ? {
          ...r,
          resolved: base.correct,
          updated: next.attempts,
          due: Math.min(100004, next.attempts + 4),
        }
      : r,
  );
  if (!base.correct) {
    const { level, index } = location(q);
    const seed = level * 48 + index + 1;
    recovery = recovery.filter((r) => r.seed !== seed);
    recovery.unshift({
      seed,
      kind: mistakeKind(course, q, choice, base.timedOut),
      due: Math.min(100004, next.attempts + 4),
      updated: next.attempts,
      resolved: false,
    });
  }
  next = settleMastery({ ...next, recovery: recovery.slice(0, 6) });
  const milestone =
    next.confirmed !== p.confirmed
      ? { topic: q.topic, courseComplete: next.confirmed === 63 }
      : null;
  return {
    ...base,
    progress: next,
    milestone,
    finalOutcome,
    message: !base.correct && !base.timedOut ? "Poxa! Quem sabe na próxima!" : base.message,
    question: nextMasteryQuestion(course, next),
  };
}
export type MasteryResult = ReturnType<typeof assessMastery>;
export async function requestMastery(
  input: {
    course: MathCourseId;
    progress: MasteryProgress;
    action: "question" | "answer";
    question?: MasteryQuestion;
    choice?: number;
    elapsed?: number;
    streak?: number;
    timedOut?: boolean;
  },
  signal: AbortSignal,
): Promise<MasteryResult> {
  signal.throwIfAborted();
  if (!isMathCourse(input.course) || !validMasteryProgress(input.progress))
    throw new Error("Progresso inválido.");
  const expected = nextMasteryQuestion(input.course, input.progress);
  if (input.action === "question") {
    const base = assessMath(context(input.progress), expected, NaN, 0, 0);
    return {
      ...base,
      progress: input.progress,
      question: expected,
      milestone: null,
      finalOutcome: null,
    };
  }
  if (
    input.action !== "answer" ||
    !input.question ||
    Object.keys(input.question).length !== Object.keys(expected).length ||
    Object.entries(expected).some(
      ([key, value]) =>
        JSON.stringify(input.question![key as keyof MasteryQuestion]) !== JSON.stringify(value),
    ) ||
    !expected.choices.includes(input.choice!) ||
    !Number.isFinite(input.elapsed) ||
    input.elapsed! < 0 ||
    input.elapsed! > 120 ||
    !Number.isSafeInteger(input.streak) ||
    input.streak! < 0 ||
    input.streak! > 100000 ||
    (input.timedOut !== undefined && typeof input.timedOut !== "boolean") ||
    (input.timedOut === true && input.elapsed! < expected.budget - 0.1)
  )
    throw new Error("Resposta inválida.");
  return assessMastery(
    input.course,
    input.progress,
    expected,
    input.choice!,
    input.elapsed!,
    input.streak!,
    input.timedOut,
  );
}
