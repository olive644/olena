import { nextEnglishQuestion, validEnglishSelection } from "../domain/english-adaptive.js";

export async function englishResponse(request: Request) {
  if (request.method !== "POST") return { status: 405, body: { error: "Método não permitido." } };
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return { status: 415, body: { error: "Envie JSON." } };
  if (Number(request.headers.get("content-length")) > 4096)
    return { status: 413, body: { error: "Pedido muito grande." } };
  const raw = await request.text();
  if (raw.length > 4096) return { status: 413, body: { error: "Pedido muito grande." } };
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: "JSON inválido." } };
  }
  if (!validEnglishSelection(input)) return { status: 400, body: { error: "Pedido inválido." } };
  return { status: 200, body: { version: 1, ...nextEnglishQuestion(input) } };
}
