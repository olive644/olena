import {
  HELENA_API_VERSION,
  parseHelenaRequest,
  parseHelenaResponse,
  type HelenaErrorCode,
  type HelenaRequest,
  type HelenaResponse,
} from "../ai/helena-contract.js";

const MAX_BODY_BYTES = 64_000;

export type HelenaProvider = {
  generate(
    request: HelenaRequest,
  ): Promise<Omit<HelenaResponse, "version" | "requestId" | "generatedAt">>;
};

export type HelenaRateLimiter = {
  consume(clientId: string): Promise<boolean>;
};

export type HelenaHandlerDependencies = {
  allowedOrigins: readonly string[];
  identifyClient(request: Request): Promise<string> | string;
  provider: HelenaProvider;
  rateLimiter: HelenaRateLimiter;
  createRequestId?: () => string;
  now?: () => Date;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function errorResponse(status: number, code: HelenaErrorCode, message: string): Response {
  return jsonResponse(status, { version: HELENA_API_VERSION, error: { code, message } });
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
        "Entre na sua conta para conversar com a Helena.",
      );
    if (!(await dependencies.rateLimiter.consume(clientId))) {
      return errorResponse(
        429,
        "rate_limited",
        "Limite de uso atingido. Tente novamente mais tarde.",
      );
    }

    try {
      const generated = await dependencies.provider.generate(parsed.value);
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
    } catch {
      return errorResponse(503, "provider_unavailable", "A Helena está indisponível no momento.");
    }
  };
}
