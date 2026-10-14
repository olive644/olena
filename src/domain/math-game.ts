import { bankQuestion, type MathBankQuestion } from "../data/math-game-bank.js";
import { isMathCourse, type MathCourseId } from "../data/math-courses.js";
import { assessMath, type MathChallenge } from "./adaptive-math.js";
import {
  countSolved,
  gameCompletion,
  STAGE_TARGET,
  validMathGame,
  type MathGameProgress,
} from "./math-game-progress.js";

export function gameQuestion(course: MathCourseId, progress: MathGameProgress): MathBankQuestion {
  const level = progress.level;
  const indexes = Array.from({ length: 24 }, (_, index) => index);
  const unseen = indexes.filter((index) => (progress.seen[level]! & (1 << index)) === 0);
  const unsolved = indexes.filter((index) => (progress.solved[level]! & (1 << index)) === 0);
  const available = unseen.length ? unseen : unsolved.length ? unsolved : indexes;
  // Intercala os quatro formatos antes de voltar a uma variante do mesmo formato.
  available.sort((a, b) => (a % 6) * 4 + Math.floor(a / 6) - ((b % 6) * 4 + Math.floor(b / 6)));
  return bankQuestion(
    course,
    level,
    available[unseen.length ? 0 : progress.correct % available.length]!,
  );
}
export function assessGame(
  course: MathCourseId,
  progress: MathGameProgress,
  question: MathChallenge,
  choice: number,
  elapsed: number,
  streak: number,
  timedOut = false,
) {
  const base = assessMath(progress, question, choice, elapsed, streak, timedOut);
  const solved = [...progress.solved],
    seen = [...progress.seen];
  const index = question.seed - 1 - progress.level * 24;
  seen[progress.level]! |= 1 << index;
  if (base.correct) solved[progress.level]! |= 1 << index;
  const completion = gameCompletion(solved);
  const completed = countSolved(solved[progress.level]!) >= STAGE_TARGET;
  const milestone =
    completed && ((progress.mastered ?? 0) & (1 << progress.level)) === 0
      ? { topic: question.topic, courseComplete: completion.mastered === 63 }
      : null;
  const next: MathGameProgress = {
    ...progress,
    level: completion.level,
    mastered: completion.mastered,
    mastery: Math.min(5, countSolved(solved[completion.level]!)),
    solved,
    seen,
    correct: Math.min(100000, progress.correct + Number(base.correct)),
  };
  return {
    ...base,
    message: !base.correct && !base.timedOut ? "Poxa! Quem sabe na próxima!" : base.message,
    progress: next,
    milestone,
    question: gameQuestion(course, next),
  };
}
export type MathGameResult = ReturnType<typeof assessGame>;
export async function requestMathGame(
  input: {
    course: MathCourseId;
    progress: MathGameProgress;
    action: "question" | "answer";
    question?: MathChallenge;
    choice?: number;
    elapsed?: number;
    streak?: number;
    timedOut?: boolean;
  },
  signal: AbortSignal,
): Promise<MathGameResult> {
  signal.throwIfAborted();
  if (!isMathCourse(input.course) || !validMathGame(input.progress))
    throw new Error("Progresso inválido.");
  const expected = gameQuestion(input.course, input.progress);
  if (input.action === "question")
    return {
      ...assessGame(input.course, input.progress, expected, NaN, 0, 0),
      progress: input.progress,
      question: expected,
      milestone: null,
    };
  if (
    input.action !== "answer" ||
    !input.question ||
    Object.keys(input.question).length !== Object.keys(expected).length ||
    Object.entries(expected).some(
      ([key, value]) =>
        JSON.stringify(input.question![key as keyof MathChallenge]) !== JSON.stringify(value),
    ) ||
    !expected.choices.includes(input.choice!) ||
    !Number.isFinite(input.elapsed) ||
    input.elapsed! < 0 ||
    input.elapsed! > 120 ||
    !Number.isSafeInteger(input.streak) ||
    input.streak! < 0 ||
    input.streak! > 100000 ||
    (input.timedOut !== undefined && typeof input.timedOut !== "boolean") ||
    (input.timedOut === true && input.elapsed! < expected.budget / expected.drain - 0.1)
  )
    throw new Error("Resposta inválida.");
  return assessGame(
    input.course,
    input.progress,
    expected,
    input.choice!,
    input.elapsed!,
    input.streak!,
    input.timedOut,
  );
}
