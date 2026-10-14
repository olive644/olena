import { challengeQuestion, type QualityQuestion } from "../data/math-challenge-bank.js";
import { isMathCourse, type MathCourseId } from "../data/math-courses.js";
import { assessMath } from "./adaptive-math.js";
import { countSolved } from "./math-game-progress.js";
import {
  challengeCompletion,
  hasChallenge,
  normalizeChallenge,
  validChallengeProgress,
  type ChallengeProgress,
} from "./math-challenge-progress.js";

export function nextChallenge(course: MathCourseId, progress: ChallengeProgress): QualityQuestion {
  const level = progress.level,
    seeds = Array.from({ length: 48 }, (_, i) => level * 48 + i + 1);
  const recent = new Set(progress.recent),
    due = progress.retry.filter((item) => item.due <= progress.attempts && !recent.has(item.seed));
  let seed: number;
  const review = seeds.filter((s) => hasChallenge(progress, s, true) && !recent.has(s));
  if (due.length && progress.attempts % 4 === 0)
    seed = due.sort((a, b) => a.due - b.due || a.seed - b.seed)[0]!.seed;
  // Retoma um acerto depois de várias outras contas. Rever não duplica o crédito
  // de uma questão e a janela recente continua valendo, inclusive entre partidas.
  else if (progress.attempts > 0 && progress.attempts % 8 === 0 && review.length)
    seed = review[(Math.floor(progress.attempts / 8) - 1) % review.length]!;
  else {
    const unseen = seeds.filter((s) => !hasChallenge(progress, s) && !recent.has(s));
    const unsolved = seeds.filter((s) => !hasChallenge(progress, s, true) && !recent.has(s));
    const available = unseen.length
      ? unseen
      : unsolved.length
        ? unsolved
        : seeds.filter((s) => !recent.has(s));
    const desired = unseen.length
      ? (countSolved(progress.seen[level]!) + countSolved(progress.extraSeen[level]!)) % 8
      : progress.attempts % 8;
    available.sort((a, b) => {
      const ai = (a - 1) % 48,
        bi = (b - 1) % 48;
      const formatA = Math.floor(ai / 6),
        formatB = Math.floor(bi / 6);
      const distanceA = (formatA - desired + 8) % 8,
        distanceB = (formatB - desired + 8) % 8;
      const difficultyOrder = [0, 2, 4, 1, 3, 5];
      return (
        distanceA - distanceB ||
        difficultyOrder.indexOf(ai % 6) - difficultyOrder.indexOf(bi % 6) ||
        a - b
      );
    });
    seed = available[0]!;
  }
  return challengeQuestion(course, level, (seed - 1) % 48, progress.attempts + 1);
}
export function assessChallenge(
  course: MathCourseId,
  progress: ChallengeProgress,
  question: QualityQuestion,
  choice: number,
  elapsed: number,
  streak: number,
  timedOut = false,
) {
  const result = assessMath(progress, question, choice, elapsed, streak, timedOut);
  const solved = [...progress.solved],
    seen = [...progress.seen],
    extraSolved = [...progress.extraSolved],
    extraSeen = [...progress.extraSeen];
  const index = (question.seed - 1) % 48,
    bit = 1 << (index % 24),
    level = progress.level;
  (index < 24 ? seen : extraSeen)[level]! |= bit;
  if (result.correct) (index < 24 ? solved : extraSolved)[level]! |= bit;
  const retry = progress.retry.filter((item) => item.seed !== question.seed);
  if (!result.correct)
    retry.push({ seed: question.seed, due: Math.min(100004, progress.attempts + 5) });
  const next = normalizeChallenge({
    ...progress,
    solved,
    seen,
    extraSolved,
    extraSeen,
    attempts: Math.min(100000, progress.attempts + 1),
    recent: [...progress.recent, question.seed].slice(-4),
    retry,
    correct: Math.min(100000, progress.correct + Number(result.correct)),
  });
  const completion = challengeCompletion(next);
  const milestone =
    (completion.mastered & (1 << level)) !== 0 && (progress.mastered & (1 << level)) === 0
      ? { topic: question.topic, courseComplete: completion.mastered === 63 }
      : null;
  return {
    ...result,
    message: !result.correct && !result.timedOut ? "Poxa! Quem sabe na próxima!" : result.message,
    progress: next,
    milestone,
    question: nextChallenge(course, next),
  };
}
export type ChallengeResult = ReturnType<typeof assessChallenge>;
export async function requestChallenge(
  input: {
    course: MathCourseId;
    progress: ChallengeProgress;
    action: "question" | "answer";
    question?: QualityQuestion;
    choice?: number;
    elapsed?: number;
    streak?: number;
    timedOut?: boolean;
  },
  signal: AbortSignal,
): Promise<ChallengeResult> {
  signal.throwIfAborted();
  if (!isMathCourse(input.course) || !validChallengeProgress(input.progress))
    throw new Error("Progresso inválido.");
  const expected = nextChallenge(input.course, input.progress);
  if (input.action === "question")
    return {
      ...assessChallenge(input.course, input.progress, expected, NaN, 0, 0),
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
        JSON.stringify(input.question![key as keyof QualityQuestion]) !== JSON.stringify(value),
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
  return assessChallenge(
    input.course,
    input.progress,
    expected,
    input.choice!,
    input.elapsed!,
    input.streak!,
    input.timedOut,
  );
}
