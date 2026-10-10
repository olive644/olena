import {
  EMPTY_MATH_PROGRESS,
  isMathCourse,
  validMathProgress,
  type MathCourseId,
  type MathProgress,
} from "./math-courses";
import type { MathChallenge, assessMath } from "../domain/adaptive-math";
import { writeSyncedStorage } from "./synced-storage";
export const MATH_LEARNING_KEY = "helena.mathLearning.v1";
export function readMathLearning(): Partial<Record<MathCourseId, MathProgress>> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(MATH_LEARNING_KEY) ?? "{}");
    if (!data || typeof data !== "object") return {};
    return Object.fromEntries(
      Object.entries(data).filter(([key, value]) => isMathCourse(key) && validMathProgress(value)),
    );
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
    writeSyncedStorage(
      MATH_LEARNING_KEY,
      JSON.stringify({ ...readMathLearning(), [course]: progress }),
    );
    return true;
  } catch {
    return false;
  }
}
export type MathApiResult = ReturnType<typeof assessMath> & { question: MathChallenge };
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
  const response = await fetch("/api/olena?action=math&version=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) throw new Error("A Olena não conseguiu preparar esta conta. Tente novamente.");
  const data = (await response.json()) as MathApiResult;
  if (
    !data.question ||
    !validMathProgress(data.progress) ||
    !Number.isFinite(data.question.answer) ||
    !Array.isArray(data.question.choices) ||
    data.question.choices.length !== 4 ||
    typeof data.question.expression !== "string" ||
    !data.question.choices.every((value) => typeof value === "number" && Number.isFinite(value)) ||
    new Set(data.question.choices).size !== 4 ||
    !data.question.choices.includes(data.question.answer) ||
    typeof data.question.topic !== "string" ||
    !Number.isFinite(data.question.budget) ||
    data.question.budget <= 0 ||
    !Number.isFinite(data.question.drain) ||
    data.question.drain < 1 ||
    !Number.isSafeInteger(data.question.seed) ||
    (input.action === "answer" &&
      (typeof data.correct !== "boolean" ||
        typeof data.timedOut !== "boolean" ||
        typeof data.fast !== "boolean" ||
        !Number.isFinite(data.points) ||
        data.points < 0 ||
        !Number.isSafeInteger(data.streak) ||
        typeof data.message !== "string"))
  )
    throw new Error("A Olena retornou uma conta inválida.");
  return data;
}
