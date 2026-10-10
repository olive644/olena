import { isMathCourse, validMathProgress } from "../data/math-courses.js";
import { mathChallenge, assessMath } from "../domain/adaptive-math.js";

export async function mathResponse(request: Request): Promise<{ status: number; body: unknown }> {
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
  if (!isMathCourse(input["course"]) || !validMathProgress(input["progress"]))
    return { status: 400, body: { error: "Progresso inválido." } };
  const course = input["course"],
    progress = input["progress"];
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
    item["budget"] !== 14 + progress.level * 3 ||
    typeof item["drain"] !== "number" ||
    item["drain"] !== 1 + progress.level * 0.16 ||
    typeof item["topic"] !== "string" ||
    typeof input["choice"] !== "number" ||
    !item["choices"].includes(input["choice"]) ||
    typeof input["elapsed"] !== "number" ||
    input["elapsed"] < 0 ||
    input["elapsed"] > 120 ||
    !Number.isSafeInteger(input["streak"]) ||
    Number(input["streak"]) < 0 ||
    Number(input["streak"]) > 100000
  )
    return { status: 400, body: { error: "Resposta inválida." } };
  const result = assessMath(
    progress,
    question as Parameters<typeof assessMath>[1],
    input["choice"],
    input["elapsed"],
    Number(input["streak"]),
  );
  return { status: 200, body: { ...result, question: mathChallenge(course, result.progress) } };
}
