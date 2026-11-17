import {
  HELENA_API_VERSION,
  parseHelenaRequest,
  parseHelenaResponse,
  type HelenaErrorCode,
  type HelenaRequest,
  type HelenaResponse,
} from "../ai/helena-contract.js";
import { ModelProviderQuotaError } from "../ai/event-stream.js";
import {
  DAY_SECONDS,
  quotaMessage,
  secondsUntilReset,
  type RateLimitDenial,
} from "./helena-quota.js";

const MAX_BODY_BYTES = 64_000;
// A função da Vercel tem 60 s (`maxDuration`). O resumo, que gera um texto longo, ganha mais tempo
// que a conversa.
const STREAM_TIMEOUT_MS = 45_000;
const SUMMARY_STREAM_TIMEOUT_MS = 55_000;

/** Motivo curto para o registro do servidor: só mensagens nossas ou de rede, nunca o conteúdo. */
function failureReason(error: unknown, signal: AbortSignal): string {
  const aborted: unknown = signal.reason;
  if (signal.aborted && aborted instanceof Error && aborted.name === "TimeoutError")
    return "tempo esgotado";
  return error instanceof Error ? error.message.slice(0, 120) : "desconhecido";
}

export type HelenaProvider = {
  generate(
    request: HelenaRequest,
    signal?: AbortSignal,
  ): Promise<Omit<HelenaResponse, "version" | "requestId" | "generatedAt">>;
  stream?(request: HelenaRequest, signal: AbortSignal): AsyncIterable<string>;
};

type HelenaRateLimiter = {
  /** `true` libera; um motivo (ou `false`) nega o pedido. */
  consume(
    clientId: string,
    request: Request,
    capability: HelenaRequest["capability"],
  ): Promise<boolean | RateLimitDenial>;
};

export type HelenaHandlerDependencies = {
  allowedOrigins: readonly string[];
  identifyClient(request: Request): Promise<string> | string;
  provider: HelenaProvider;
  rateLimiter: HelenaRateLimiter;
  createRequestId?: () => string;
  now?: () => Date;
};

function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...extraHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function errorResponse(
  status: number,
  code: HelenaErrorCode,
  message: string,
  extraHeaders?: Record<string, string>,
): Response {
  return jsonResponse(
    status,
    { version: HELENA_API_VERSION, error: { code, message } },
    extraHeaders,
  );
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function createHelenaHandler(dependencies: HelenaHandlerDependencies) {
  return async function handleHelena(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return errorResponse(405, "invalid_request", "Método não permitido.");
    }

    const origin = request.headers.get("Origin");
    if (!origin || !dependencies.allowedOrigins.includes(origin)) {
      return errorResponse(403, "invalid_request", "Origem não autorizada.");
    }
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(415, "invalid_request", "Envie conteúdo JSON.");
    }

    const declaredLength = Number(request.headers.get("Content-Length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return errorResponse(413, "invalid_request", "Requisição muito longa.");
    }

    const rawBody = await request.text();
    if (byteLength(rawBody) > MAX_BODY_BYTES) {
      return errorResponse(413, "invalid_request", "Requisição muito longa.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      return errorResponse(400, "invalid_request", "JSON inválido.");
    }

    const parsed = parseHelenaRequest(payload);
    if (!parsed.ok) {
      const code = parsed.message.includes("Consentimento")
        ? "consent_required"
        : "invalid_request";
      return errorResponse(400, code, parsed.message);
    }

    const clientId = await dependencies.identifyClient(request);
    if (!clientId)
      return errorResponse(
        401,
        "invalid_request",
        "Entre na sua conta para conversar com a Olena.",
      );
    const decision = await dependencies.rateLimiter.consume(
      clientId,
      request,
      parsed.value.capability,
    );
    if (decision !== true) {
      const denial = typeof decision === "object" ? decision : undefined;
      return errorResponse(
        429,
        "rate_limited",
        quotaMessage(denial?.limit, parsed.value.capability),
        denial ? { "Retry-After": String(denial.retryAfterSeconds) } : undefined,
      );
    }

    try {
      if (request.headers.get("Accept")?.includes("text/event-stream")) {
        if (!dependencies.provider.stream) throw new Error("Streaming unavailable");
        const abort = new AbortController();
        const startedAt = Date.now();
        const signal = AbortSignal.any([
          request.signal,
          abort.signal,
          AbortSignal.timeout(
            parsed.value.capability === "summarize" ? SUMMARY_STREAM_TIMEOUT_MS : STREAM_TIMEOUT_MS,
          ),
        ]);
        const iterator = dependencies.provider.stream(parsed.value, signal)[Symbol.asyncIterator]();
        const encoder = new TextEncoder();
        let answer = "";
        const event = (value: unknown) => encoder.encode(`data: ${JSON.stringify(value)}\n\n`);
        return new Response(
          new ReadableStream<Uint8Array>(
            {
              async pull(controller) {
                try {
                  signal.throwIfAborted();
                  const chunk = await iterator.next();
                  signal.throwIfAborted();
                  if (!chunk.done) {
                    if (
                      typeof chunk.value !== "string" ||
                      !chunk.value ||
                      answer.length + chunk.value.length > 12_000
                    )
                      throw new Error("Invalid delta");
                    answer += chunk.value;
                    controller.enqueue(event({ type: "delta", text: chunk.value }));
                    return;
                  }
                  const completed = parseHelenaResponse({
                    version: HELENA_API_VERSION,
                    requestId: dependencies.createRequestId?.() ?? crypto.randomUUID(),
                    answer,
                    suggestions: [],
                    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
                  });
                  if (!completed.ok) throw new Error("Invalid completion");
                  controller.enqueue(event({ type: "done", response: completed.value }));
                  controller.close();
                } catch (error) {
                  const cancelled = request.signal.aborted || abort.signal.aborted;
                  if (!cancelled)
                    console.error(
                      "[helena] fluxo interrompido",
                      JSON.stringify({
                        capability: parsed.value.capability,
                        ms: Date.now() - startedAt,
                        chars: answer.length,
                        motivo: failureReason(error, signal),
                      }),
                    );
                  abort.abort();
                  await iterator.return?.().catch(() => {});
                  if (cancelled) controller.error(new Error("Aborted"));
                  else {
                    // Cota gratuita do provedor esgotada: a pessoa precisa saber o que houve.
                    controller.enqueue(
                      event(
                        error instanceof ModelProviderQuotaError
                          ? {
                              type: "error",
                              code: "rate_limited",
                              message: quotaMessage("provider-quota", parsed.value.capability),
                            }
                          : {
                              type: "error",
                              message: "A resposta foi interrompida. Tente novamente.",
                            },
                      ),
                    );
                    controller.close();
                  }
                }
              },
              cancel() {
                abort.abort();
                void iterator.return?.().catch(() => {});
              },
            },
            { highWaterMark: 0 },
          ),
          {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-store, no-transform",
              "X-Accel-Buffering": "no",
              "X-Content-Type-Options": "nosniff",
              "Referrer-Policy": "no-referrer",
            },
          },
        );
      }
      const generated = await dependencies.provider.generate(parsed.value, request.signal);
      const response: HelenaResponse = {
        version: HELENA_API_VERSION,
        requestId: dependencies.createRequestId?.() ?? crypto.randomUUID(),
        answer: generated.answer,
        suggestions: generated.suggestions,
        generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
      };
      const validated = parseHelenaResponse(response);
      if (!validated.ok) throw new Error(validated.message);
      return jsonResponse(200, validated.value);
    } catch (error) {
      console.error(
        "[helena] resposta indisponível",
        JSON.stringify({
          capability: parsed.value.capability,
          motivo: error instanceof Error ? error.message.slice(0, 120) : "desconhecido",
        }),
      );
      if (error instanceof ModelProviderQuotaError)
        return errorResponse(
          429,
          "rate_limited",
          quotaMessage("provider-quota", parsed.value.capability),
          { "Retry-After": String(secondsUntilReset(DAY_SECONDS)) },
        );
      return errorResponse(503, "provider_unavailable", "A Olena está indisponível no momento.");
    }
  };
}
