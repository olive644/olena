import { createHash } from "node:crypto";
import {
  HELENA_API_VERSION,
  isStudyCapability,
  parseHelenaRequest,
  parseHelenaResponse,
  type HelenaErrorCode,
  type HelenaRequest,
  type HelenaResponse,
} from "../ai/helena-contract.js";
import { ModelProviderQuotaError } from "../ai/event-stream.js";
import {
  credits,
  estimateRequest,
  estimateTokens,
  neuronsFor,
  type BudgetSnapshot,
  type RequestEstimate,
} from "./helena-budget.js";
import { looksLikeText, sanitizeSourceText } from "./helena-guard.js";
import {
  DAY_SECONDS,
  ASSISTANT_OFF_MESSAGE,
  noticeLanguage,
  quotaMessage,
  secondsUntilReset,
  type RateLimitDenial,
} from "./helena-quota.js";

const MAX_BODY_BYTES = 64_000;
// A função da Vercel tem 60 s (`maxDuration`). O resumo, que gera um texto longo, ganha mais tempo
// que a conversa.
const STREAM_TIMEOUT_MS = 45_000;
const SUMMARY_STREAM_TIMEOUT_MS = 55_000;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,80}$/;

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
  ): Promise<
    Omit<HelenaResponse, "version" | "requestId" | "generatedAt"> & {
      /** Tokens que o modelo contou, quando informou. Sem isso o gasto é estimado pela resposta. */
      usage?: { inputTokens: number; outputTokens: number };
    }
  >;
  stream?(request: HelenaRequest, signal: AbortSignal): AsyncIterable<string>;
};

/** Como o pedido terminou, para acertar o que foi reservado. */
export type SpendOutcome = {
  /** O que foi reservado antes de chamar o modelo, em neurons. */
  reserved: number;
  /** O que o pedido gastou de verdade ou, sem a contagem do modelo, o que se estima. */
  actual: number;
  /** Só a entrada: o que o provedor cobra mesmo quando a resposta falha. */
  inputOnly: number;
  /** Falha nossa (modelo fora do ar, resposta inválida): a pessoa não paga. */
  failed: boolean;
};

type HelenaRateLimiter = {
  /** `true` libera e reserva o custo; um motivo nega o pedido. */
  consume(
    clientId: string,
    request: Request,
    capability: HelenaRequest["capability"],
    estimate: RequestEstimate,
  ): Promise<true | RateLimitDenial>;
  /** Acerta o gasto e solta a trava de um pedido por vez. Chamado uma vez por pedido liberado. */
  settle?(
    clientId: string,
    request: Request,
    capability: HelenaRequest["capability"],
    outcome: SpendOutcome,
  ): Promise<void>;
  /** O orçamento do dia da pessoa, para a tela mostrar antes de gerar. */
  usage?(clientId: string, request: Request): Promise<BudgetSnapshot>;
};

export type HelenaHandlerDependencies = {
  allowedOrigins: readonly string[];
  identifyClient(request: Request): Promise<string> | string;
  provider: HelenaProvider;
  rateLimiter: HelenaRateLimiter;
  /** Registra um pedido e devolve `false` se esta pessoa já o enviou (repetição de pedido capturado). */
  claimRequest?(clientId: string, key: string): Promise<boolean>;
  /** Conversa, plano de estudo e explicação. Desligado na produção para guardar a cota do resumo. */
  chatEnabled?: boolean;
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

/** Quantidade pedida em "count=10;..." (só vale número limitado), para estimar a saída. */
function requestedCount(prompt: string): number {
  const found = /count=(\d{1,3})/i.exec(prompt)?.[1];
  return Math.min(20, Math.max(3, Number(found) || 10));
}

/** Registro de segurança: o motivo e o tipo, nunca o conteúdo nem a identidade em claro. */
function securityLog(event: string, capability: string, clientId: string, extra = {}) {
  console.warn(
    JSON.stringify({
      event: `helena_${event}`,
      capability,
      who: createHash("sha256").update(clientId).digest("hex").slice(0, 12),
      ...extra,
    }),
  );
}

export function createHelenaHandler(dependencies: HelenaHandlerDependencies) {
  async function checkOrigin(request: Request): Promise<Response | undefined> {
    const origin = request.headers.get("Origin");
    if (!origin || !dependencies.allowedOrigins.includes(origin)) {
      return errorResponse(403, "invalid_request", "Origem não autorizada.");
    }
    return undefined;
  }

  /** GET ?usage=1: quanto a pessoa já gastou hoje e quanto custa um pedido máximo. */
  async function handleUsage(request: Request): Promise<Response> {
    const denied = await checkOrigin(request);
    if (denied) return denied;
    const language = noticeLanguage(request.headers.get("X-App-Language"));
    const clientId = await dependencies.identifyClient(request);
    if (!clientId)
      return errorResponse(
        401,
        "invalid_request",
        language === "en"
          ? "Sign in to your account to use Olena."
          : "Entre na sua conta para usar a Olena.",
      );
    const snapshot = await dependencies.rateLimiter.usage?.(clientId, request);
    if (!snapshot) return errorResponse(404, "invalid_request", "Indisponível.");
    return jsonResponse(200, {
      version: HELENA_API_VERSION,
      usage: {
        usedCredits: credits(snapshot.usedNeurons),
        limitCredits: credits(snapshot.limitNeurons),
        remainingCredits: Math.max(0, credits(snapshot.remainingNeurons)),
        requestMaxCredits: credits(snapshot.requestMaxNeurons),
        resetInSeconds: snapshot.resetInSeconds,
      },
    });
  }

  return async function handleHelena(request: Request): Promise<Response> {
    if (request.method === "GET" && new URL(request.url).searchParams.has("usage"))
      return handleUsage(request);
    if (request.method !== "POST") {
      return errorResponse(405, "invalid_request", "Método não permitido.");
    }

    const originDenied = await checkOrigin(request);
    if (originDenied) return originDenied;
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

    const language = noticeLanguage(request.headers.get("X-App-Language"));
    // A conversa, o plano de estudo e a explicação foram desligados: a cota gratuita é da Biblioteca
    // (resumo, flashcards, quiz e simulado).
    if (dependencies.chatEnabled === false && !isStudyCapability(parsed.value.capability))
      return errorResponse(410, "provider_unavailable", ASSISTANT_OFF_MESSAGE[language]);

    const clientId = await dependencies.identifyClient(request);
    if (!clientId)
      return errorResponse(
        401,
        "invalid_request",
        language === "en"
          ? "Sign in to your account to use Olena."
          : "Entre na sua conta para usar a Olena.",
      );

    // Texto limpo antes de contar tokens e de chegar ao modelo (veja `sanitizeSourceText`).
    const cleaned: HelenaRequest = {
      ...parsed.value,
      sources: parsed.value.sources.map((source) => ({
        ...source,
        content: sanitizeSourceText(source.content),
      })),
    };
    if (cleaned.sources.some((source) => !looksLikeText(source.content))) {
      securityLog("unreadable_text", cleaned.capability, clientId);
      return errorResponse(
        400,
        "invalid_request",
        language === "en"
          ? "The text does not look readable. If it is a scanned PDF, try another file."
          : "O texto enviado não parece legível. Se for um PDF escaneado, tente outro arquivo.",
      );
    }
    const capability = cleaned.capability;
    const estimate = estimateRequest(cleaned, requestedCount(cleaned.prompt));
    const quotaHeaders = (denial?: RateLimitDenial) =>
      denial ? { "Retry-After": String(denial.retryAfterSeconds) } : undefined;

    const decision = await dependencies.rateLimiter.consume(
      clientId,
      request,
      capability,
      estimate,
    );
    if (decision !== true) {
      securityLog("denied", capability, clientId, { limit: decision.limit });
      return errorResponse(
        decision.limit === "request-too-big" ? 413 : 429,
        decision.limit === "request-too-big" ? "invalid_request" : "rate_limited",
        quotaMessage(decision.limit, capability, language, decision),
        quotaHeaders(decision),
      );
    }

    // A partir daqui há reserva e trava de um pedido por vez: toda saída acerta o gasto uma vez.
    let settled = false;
    const finish = (outcome: Omit<SpendOutcome, "reserved" | "inputOnly">) => {
      if (settled) return;
      settled = true;
      void Promise.resolve(
        dependencies.rateLimiter.settle?.(clientId, request, capability, {
          reserved: estimate.neurons,
          inputOnly: neuronsFor(estimate.inputTokens, 0),
          ...outcome,
        }),
      ).catch(() => {});
    };
    const actualFor = (
      answerLength: number,
      usage?: { inputTokens: number; outputTokens: number },
    ) =>
      neuronsFor(
        usage?.inputTokens ?? estimate.inputTokens,
        usage?.outputTokens ?? Math.min(estimate.maxOutputTokens, estimateTokens(answerLength)),
      );

    // Repetir um pedido capturado (mesma chave ou mesmo corpo) não gasta a cota duas vezes.
    const header = request.headers.get("Idempotency-Key");
    const key =
      header && IDEMPOTENCY_KEY.test(header)
        ? `key:${header}`
        : `body:${createHash("sha256").update(rawBody).digest("hex")}`;
    if (dependencies.claimRequest && !(await dependencies.claimRequest(clientId, key))) {
      finish({ actual: 0, failed: true });
      securityLog("duplicate", capability, clientId);
      return errorResponse(409, "invalid_request", quotaMessage("duplicate", capability, language));
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
            capability === "summarize" ? SUMMARY_STREAM_TIMEOUT_MS : STREAM_TIMEOUT_MS,
          ),
        ]);
        const iterator = dependencies.provider.stream(cleaned, signal)[Symbol.asyncIterator]();
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
                  finish({ actual: actualFor(answer.length), failed: false });
                  controller.enqueue(event({ type: "done", response: completed.value }));
                  controller.close();
                } catch (error) {
                  const cancelled = request.signal.aborted || abort.signal.aborted;
                  if (!cancelled)
                    console.error(
                      "[helena] fluxo interrompido",
                      JSON.stringify({
                        capability,
                        ms: Date.now() - startedAt,
                        chars: answer.length,
                        motivo: failureReason(error, signal),
                      }),
                    );
                  abort.abort();
                  await iterator.return?.().catch(() => {});
                  // Quem cancelou paga o que já saiu; falha nossa não é cobrada da pessoa.
                  finish(
                    cancelled
                      ? { actual: actualFor(answer.length), failed: false }
                      : { actual: 0, failed: true },
                  );
                  if (cancelled) controller.error(new Error("Aborted"));
                  else {
                    // Cota gratuita do provedor esgotada: a pessoa precisa saber o que houve.
                    controller.enqueue(
                      event(
                        error instanceof ModelProviderQuotaError
                          ? {
                              type: "error",
                              code: "rate_limited",
                              message: quotaMessage("provider-quota", capability, language),
                            }
                          : {
                              type: "error",
                              message:
                                language === "en"
                                  ? "The answer was interrupted. Try again."
                                  : "A resposta foi interrompida. Tente novamente.",
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
                finish({ actual: actualFor(answer.length), failed: false });
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
      const generated = await dependencies.provider.generate(cleaned, request.signal);
      const response: HelenaResponse = {
        version: HELENA_API_VERSION,
        requestId: dependencies.createRequestId?.() ?? crypto.randomUUID(),
        answer: generated.answer,
        suggestions: generated.suggestions,
        generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
      };
      const validated = parseHelenaResponse(response);
      if (!validated.ok) throw new Error(validated.message);
      finish({ actual: actualFor(generated.answer.length, generated.usage), failed: false });
      return jsonResponse(200, validated.value);
    } catch (error) {
      console.error(
        "[helena] resposta indisponível",
        JSON.stringify({
          capability,
          motivo: error instanceof Error ? error.message.slice(0, 120) : "desconhecido",
        }),
      );
      finish({ actual: 0, failed: true });
      if (error instanceof ModelProviderQuotaError)
        return errorResponse(
          429,
          "rate_limited",
          quotaMessage("provider-quota", capability, language),
          { "Retry-After": String(secondsUntilReset(DAY_SECONDS)) },
        );
      return errorResponse(503, "provider_unavailable", "A Olena está indisponível no momento.");
    }
  };
}
