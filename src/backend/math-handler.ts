import { isMathCourse, validMathProgress } from "../data/math-courses.js";
import { mathChallenge, assessMath } from "../domain/adaptive-math.js";
import { validMathGame } from "../domain/math-game-progress.js";
import { requestMathGame } from "../domain/math-game.js";
import { requestChallenge } from "../domain/math-challenge-engine.js";
import { validChallengeProgress } from "../domain/math-challenge-progress.js";

export async function mathResponse(
  request: Request,
  version: 1 | 2 | 3 | 4 = 1,
): Promise<{ status: number; body: unknown }> {
  if (request.method !== "POST") return { status: 405, body: { error: "Método não permitido." } };
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return { status: 415, body: { error: "Envie JSON." } };
  if (Number(request.headers.get("content-length")) > 4096)
    return { status: 413, body: { error: "Pedido muito grande." } };
  const raw = await request.text();
  if (raw.length > 4096) return { status: 413, body: { error: "Pedido muito grande." } };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: "JSON inválido." } };
  }
  if (!data || typeof data !== "object")
    return { status: 400, body: { error: "Pedido inválido." } };
  const input = data as Record<string, unknown>;
  if (version === 4) {
    if (
      !isMathCourse(input["course"]) ||
      !validChallengeProgress(input["progress"]) ||
      !["question", "answer"].includes(String(input["action"]))
    )
      return { status: 400, body: { error: "Pedido inválido." } };
    try {
      return {
        status: 200,
        body: await requestChallenge(
          input as Parameters<typeof requestChallenge>[0],
          request.signal,
        ),
      };
    } catch {
      return { status: 400, body: { error: "Resposta inválida." } };
    }
  }
  if (version === 3) {
    if (
      !isMathCourse(input["course"]) ||
      !validMathGame(input["progress"]) ||
      !["question", "answer"].includes(String(input["action"]))
    )
      return { status: 400, body: { error: "Pedido inválido." } };
    try {
      const result = await requestMathGame(
        input as Parameters<typeof requestMathGame>[0],
        request.signal,
      );
      return { status: 200, body: result };
    } catch {
      return { status: 400, body: { error: "Resposta inválida." } };
    }
  }
  if (!isMathCourse(input["course"]) || !validMathProgress(input["progress"]))
    return { status: 400, body: { error: "Progresso inválido." } };
  const course = input["course"],
    progress = input["progress"];
  if (version === 1 && (progress.mastery > 3 || progress.mastered !== undefined))
    return { status: 400, body: { error: "Progresso inválido." } };
  if (input["action"] === "question")
    return { status: 200, body: { question: mathChallenge(course, progress), progress } };
  const question = input["question"];
  if (input["action"] !== "answer" || !question || typeof question !== "object")
    return { status: 400, body: { error: "Ação inválida." } };
  const item = question as Record<string, unknown>;
  if (
    !Number.isSafeInteger(item["seed"]) ||
    Number(item["seed"]) < 1 ||
    Number(item["seed"]) > 2147483646
  )
    return { status: 400, body: { error: "Questão inválida." } };
  const expected = mathChallenge(course, progress, Number(item["seed"]));
  if (
    Object.keys(item).length !== Object.keys(expected).length ||
    Object.entries(expected).some(
      ([key, value]) => JSON.stringify(item[key]) !== JSON.stringify(value),
    )
  )
    return { status: 400, body: { error: "Questão alterada." } };
  if (
    typeof item["expression"] !== "string" ||
    item["expression"].length > 180 ||
    typeof item["answer"] !== "number" ||
    !Number.isFinite(item["answer"]) ||
    !Array.isArray(item["choices"]) ||
    item["choices"].length !== 4 ||
    !item["choices"].every((value) => typeof value === "number" && Number.isFinite(value)) ||
    typeof item["budget"] !== "number" ||
    item["budget"] !== expected.budget ||
    typeof item["drain"] !== "number" ||
    item["drain"] !== expected.drain ||
    typeof item["topic"] !== "string" ||
    typeof input["choice"] !== "number" ||
    !item["choices"].includes(input["choice"]) ||
    typeof input["elapsed"] !== "number" ||
    input["elapsed"] < 0 ||
    input["elapsed"] > 120 ||
    !Number.isSafeInteger(input["streak"]) ||
    Number(input["streak"]) < 0 ||
    Number(input["streak"]) > 100000 ||
    (input["timedOut"] !== undefined && typeof input["timedOut"] !== "boolean") ||
    (input["timedOut"] === true && input["elapsed"] < expected.budget / expected.drain - 0.1)
  )
    return { status: 400, body: { error: "Resposta inválida." } };
  const result = assessMath(
    progress,
    question as Parameters<typeof assessMath>[1],
    input["choice"],
    input["elapsed"],
    Number(input["streak"]),
    input["timedOut"] === true,
  );
  if (version === 1) {
    const mastery = result.correct
      ? progress.mastery + (result.fast ? 2 : 1)
      : Math.max(0, progress.mastery - 1);
    const advance = mastery >= 4 && progress.level < 5;
    const errors = result.correct ? 0 : (progress.errors ?? 0) + 1;
    const retreat = errors >= 2 && progress.level > 0;
    const legacy = {
      level: progress.level + Number(advance) - Number(retreat),
      mastery: advance || retreat ? 0 : Math.min(3, mastery),
      errors: retreat ? 0 : Math.min(2, errors),
      correct: result.progress.correct,
      best: progress.best,
    };
    return {
      status: 200,
      body: {
        correct: result.correct,
        timedOut: result.timedOut,
        fast: result.fast,
        points: result.points,
        streak: result.streak,
        message: result.message,
        progress: legacy,
        question: mathChallenge(course, legacy),
      },
    };
  }
  return { status: 200, body: { ...result, question: mathChallenge(course, result.progress) } };
}
