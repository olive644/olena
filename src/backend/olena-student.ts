import { parseHelenaResponse, type HelenaCapability } from "../ai/helena-contract.js";
import { HELENA_TEACHER_POLICY } from "./helena-teacher.js";
import type { HelenaProvider } from "./helena-handler.js";
import { readModelStream } from "../ai/event-stream.js";

/** Promoção explícita por capacidade, nunca baseada em confiança declarada pela IA. */
export function createProgressiveProvider(
  teacher: HelenaProvider,
  student: HelenaProvider | undefined,
  approvedCapabilities: readonly HelenaCapability[],
): HelenaProvider {
  return {
    async *stream(request, signal) {
      if (student?.stream && approvedCapabilities.includes(request.capability)) {
        let started = false;
        try {
          for await (const delta of student.stream(request, signal)) {
            started = true;
            yield delta;
          }
          if (started) return;
        } catch (error) {
          if (started || signal.aborted) throw error;
        }
      }
      signal.throwIfAborted();
      if (!teacher.stream) throw new Error("Streaming unavailable");
      yield* teacher.stream(request, signal);
    },
    async generate(request, signal) {
      if (student && approvedCapabilities.includes(request.capability)) {
        try {
          const candidate = await student.generate(request, signal);
          const valid = parseHelenaResponse({
            ...candidate,
            version: 1,
            requestId: "student",
            generatedAt: new Date().toISOString(),
          });
          if (valid.ok) return candidate;
        } catch {
          /* O professor atende se o candidato aprovado falhar. */
        }
      }
      signal?.throwIfAborted();
      return teacher.generate(request, signal);
    },
  };
}

/** Endpoint do operador, não recebido do navegador. Modelo base + adaptador avaliados. */
export function createOlenaStudent(
  endpoint: string,
  model: string,
  token: string,
  fetcher: typeof fetch = fetch,
): HelenaProvider {
  const streamUrl = () => {
    const url = new URL(endpoint);
    if (
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) ||
      url.username ||
      url.password ||
      !model
    )
      throw new Error("Endpoint da Olena inválido.");
    return url;
  };
  return {
    async *stream(request, signal) {
      const response = await fetcher(streamUrl(), {
        method: "POST",
        redirect: "error",
        signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model,
          stream: true,
          max_tokens: 700,
          messages: [
            { role: "system", content: HELENA_TEACHER_POLICY },
            {
              role: "user",
              content: JSON.stringify({
                prompt: request.prompt,
                capability: request.capability,
                sources: request.sources,
                subject: request.subject,
              }),
            },
          ],
        }),
      });
      yield* readModelStream(response, signal);
    },
    async generate(request) {
      const url = new URL(endpoint);
      if (
        (url.protocol !== "https:" &&
          !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) ||
        url.username ||
        url.password ||
        !model
      )
        throw new Error("Endpoint da Olena inválido.");
      const response = await fetcher(url, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: HELENA_TEACHER_POLICY },
            {
              role: "user",
              content: JSON.stringify({
                prompt: request.prompt,
                capability: request.capability,
                sources: request.sources,
                subject: request.subject,
              }),
            },
          ],
          max_tokens: 700,
        }),
      });
      if (!response.ok) throw new Error("Olena indisponível.");
      const raw = await response.text();
      if (raw.length > 64000) throw new Error("Resposta muito longa.");
      const payload: unknown = JSON.parse(raw);
      if (
        !payload ||
        typeof payload !== "object" ||
        !("choices" in payload) ||
        !Array.isArray(payload.choices)
      )
        throw new Error("Resposta inválida.");
      const choice: unknown = payload.choices[0];
      if (!choice || typeof choice !== "object" || !("message" in choice))
        throw new Error("Resposta inválida.");
      const message = choice.message;
      if (
        !message ||
        typeof message !== "object" ||
        !("content" in message) ||
        typeof message.content !== "string"
      )
        throw new Error("Resposta inválida.");
      return { answer: message.content, suggestions: [] };
    },
  };
}
