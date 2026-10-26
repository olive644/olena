import { createHash } from "node:crypto";
import { parseOnboardingAnswers, prepareOnboarding } from "../domain/onboarding-configuration.js";

export async function handleOnboarding(request: Request): Promise<Response> {
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Olena-API-Version": "1",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        ...(status === 405 ? { Allow: "POST" } : {}),
      },
    });
  if (request.method !== "POST") return reply(405, { error: "Use POST." });
  const url = new URL(request.url);
  if (
    url.searchParams.getAll("action").length !== 1 ||
    url.searchParams.get("action") !== "onboarding" ||
    url.searchParams.getAll("version").length !== 1 ||
    url.searchParams.get("version") !== "1" ||
    [...url.searchParams.keys()].some((key) => !["action", "version"].includes(key))
  )
    return reply(400, { error: "Pedido inválido." });
  const origin = request.headers.get("origin");
  const sameOrigin =
    origin === url.origin || (!origin && request.headers.get("sec-fetch-site") === "same-origin");
  // O middleware de preview usa localhost no Request e conserva o Origin do navegador.
  const localOrigin =
    url.hostname === "localhost" &&
    origin !== null &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!sameOrigin && !localOrigin) return reply(403, { error: "Origem não autorizada." });
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json"
  )
    return reply(415, { error: "Use JSON." });
  const reader = request.body?.getReader();
  if (!reader) return reply(400, { error: "Pedido inválido." });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return reply(413, { error: "Pedido muito grande." });
      }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      !("answers" in body)
    )
      return reply(400, { error: "Pedido inválido." });
    const answers = parseOnboardingAnswers(body.answers);
    if (!answers) return reply(400, { error: "Respostas inválidas." });
    const digest = createHash("sha256").update(JSON.stringify(answers)).digest("hex").slice(0, 24);
    return reply(200, prepareOnboarding(answers, `onboarding-v1-${digest}`));
  } catch {
    return reply(400, { error: "Pedido inválido." });
  } finally {
    reader.releaseLock();
  }
}
