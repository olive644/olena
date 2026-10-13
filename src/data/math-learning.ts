import {
  EMPTY_MATH_PROGRESS,
  isMathCourse,
  validMathProgress,
  type MathCourseId,
  type MathProgress,
} from "./math-courses";
import { mathChallenge, assessMath, type MathChallenge } from "../domain/adaptive-math";
import { writeSyncedStorage } from "./synced-storage";
export const MATH_LEARNING_KEY = "helena.mathLearning.v2";
export const LEGACY_MATH_LEARNING_KEY = "helena.mathLearning.v1";
export function readMathLearning(): Partial<Record<MathCourseId, MathProgress>> {
  try {
    const modern = localStorage.getItem(MATH_LEARNING_KEY);
    const data: unknown = JSON.parse(
      modern ?? localStorage.getItem(LEGACY_MATH_LEARNING_KEY) ?? "{}",
    );
    if (!data || typeof data !== "object") return {};
    const courses: Partial<Record<MathCourseId, MathProgress>> = Object.fromEntries(
      Object.entries(data)
        .filter(([key, value]) => isMathCourse(key) && validMathProgress(value))
        .map(([key, value]: [string, MathProgress]) => [
          key,
          modern === null ? { ...value, mastery: 0, mastered: (1 << value.level) - 1 } : value,
        ]),
    );
    if (modern !== null) {
      let legacy: unknown;
      try {
        legacy = JSON.parse(localStorage.getItem(LEGACY_MATH_LEARNING_KEY) ?? "{}");
      } catch {
        return courses;
      }
      if (legacy && typeof legacy === "object") {
        for (const [id, value] of Object.entries(legacy)) {
          if (!isMathCourse(id) || !validMathProgress(value)) continue;
          const current = courses[id];
          if (!current || value.correct > current.correct) {
            courses[id] = {
              ...value,
              mastery: 0,
              best: Math.max(value.best, current?.best ?? 0),
              mastered: (current?.mastered ?? 0) | ((1 << value.level) - 1),
            };
          }
        }
      }
    }
    return courses;
  } catch {
    return {};
  }
}
export function mathLearning(course: MathCourseId): MathProgress {
  return readMathLearning()[course] ?? { ...EMPTY_MATH_PROGRESS };
}
export function saveMathLearning(course: MathCourseId, progress: MathProgress): boolean {
  if (!validMathProgress(progress)) return false;
  try {
    const courses = { ...readMathLearning(), [course]: progress };
    // Abas antigas continuam lendo o formato original, sem perder seus estudos.
    localStorage.setItem(
      LEGACY_MATH_LEARNING_KEY,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(courses).map(([id, value]) => [
            id,
            {
              level: value.level,
              mastery: Math.min(3, value.mastery),
              correct: value.correct,
              best: value.best,
              ...(value.errors === undefined ? {} : { errors: value.errors }),
            },
          ]),
        ),
      ),
    );
    writeSyncedStorage(MATH_LEARNING_KEY, JSON.stringify(courses));
    return true;
  } catch {
    return false;
  }
}
export type MathApiResult = Omit<ReturnType<typeof assessMath>, "progress"> & {
  progress: MathProgress;
  question: MathChallenge;
};
export async function requestMath(
  input: {
    course: MathCourseId;
    progress: MathProgress;
    action: "question" | "answer";
    question?: MathChallenge;
    choice?: number;
    elapsed?: number;
    streak?: number;
    timedOut?: boolean;
  },
  signal: AbortSignal,
): Promise<MathApiResult> {
  signal.throwIfAborted();
  if (!isMathCourse(input.course) || !validMathProgress(input.progress))
    throw new Error("Progresso inválido. Volte à ilha e tente novamente.");
  const question = input.question;
  if (input.action === "question") {
    const next = mathChallenge(input.course, input.progress);
    return {
      ...assessMath(input.progress, next, NaN, 0, 0),
      progress: input.progress,
      question: next,
      milestone: null,
    };
  }
  if (
    !question ||
    !Number.isSafeInteger(question.seed) ||
    question.seed < 1 ||
    question.seed > 2147483646
  )
    throw new Error("Questão inválida. Volte à ilha e tente novamente.");
  const expected = mathChallenge(input.course, input.progress, question.seed);
  if (
    Object.keys(question).length !== Object.keys(expected).length ||
    Object.entries(expected).some(
      ([key, value]) =>
        JSON.stringify(question[key as keyof MathChallenge]) !== JSON.stringify(value),
    ) ||
    !question.choices.includes(input.choice!) ||
    !Number.isFinite(input.elapsed) ||
    input.elapsed! < 0 ||
    input.elapsed! > 120 ||
    !Number.isSafeInteger(input.streak) ||
    input.streak! < 0 ||
    input.streak! > 100000 ||
    (input.timedOut !== undefined && typeof input.timedOut !== "boolean") ||
    (input.timedOut === true && input.elapsed! < expected.budget / expected.drain - 0.1)
  )
    throw new Error("Resposta inválida. Volte à ilha e tente novamente.");
  // Mesmo motor determinístico da API, sem uma ida à rede por resposta.
  const result = assessMath(
    input.progress,
    question,
    input.choice!,
    input.elapsed!,
    input.streak!,
    input.timedOut,
  );
  return { ...result, question: mathChallenge(input.course, result.progress) };
}
