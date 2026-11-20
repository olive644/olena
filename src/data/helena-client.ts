import { uiLocale } from "../i18n/runtime";
import {
  parseHelenaResponse,
  type HelenaErrorCode,
  type HelenaRequest,
  type HelenaResponse,
} from "../ai/helena-contract";
import { readEventStream } from "../ai/event-stream";

const HELENA_ENDPOINT = "/api/helena";

/** Uma chave por tentativa: repetir a mesma chave (um pedido capturado) o servidor recusa. */
function attemptKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join("-")
  );
}
const MAX_RESPONSE_LENGTH = 32_000;
const INVALID_RESPONSE = "Resposta inválida. Tente novamente.";

/** Só o texto de limite de uso vem do servidor (é nosso e curto): é o que explica a falta de cota. */
async function limitErrorFrom(response: Response): Promise<HelenaClientError | undefined> {
  if (![400, 409, 413, 429].includes(response.status)) return undefined;
  try {
    const body: unknown = await response.json();
    const error =
      body && typeof body === "object" && "error" in body
        ? (body as { error: unknown }).error
        : undefined;
    if (error && typeof error === "object" && "code" in error && "message" in error) {
      const { code, message } = error as { code: unknown; message: unknown };
      if (
        typeof message === "string" &&
        message.length <= 300 &&
        (code === "rate_limited" || (code === "invalid_request" && response.status !== 400))
      )
        return new HelenaClientError(code, message);
    }
  } catch {
    // Corpo que não é JSON nosso (um proxy, por exemplo): vale o texto padrão.
  }
  return undefined;
}

export class HelenaClientError extends Error {
  readonly code: HelenaErrorCode;

  constructor(code: HelenaErrorCode, message: string) {
    super(message);
    this.name = "HelenaClientError";
    this.code = code;
  }
}

type HelenaClientOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  token?: string;
};

export async function streamHelena(
  request: HelenaRequest,
  options: HelenaClientOptions & { onText(text: string): void },
): Promise<HelenaResponse> {
  if (request.privacy?.consent !== true || request.privacy.retention !== "none")
    throw new HelenaClientError("invalid_request", "Autorize o envio primeiro.");
  // O resumo tem 55 s no servidor; o cliente espera um pouco mais para ver a resposta final.
  const limit = request.capability === "summarize" ? 58_000 : 55_000;
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(limit)])
    : AbortSignal.timeout(limit);
  const response = await (options.fetcher ?? fetch)(HELENA_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "X-App-Language": uiLocale(),
      "Idempotency-Key": attemptKey(),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  });
  if (
    !response.ok ||
    !response.body ||
    !response.headers.get("Content-Type")?.includes("text/event-stream")
  ) {
    const limited = await limitErrorFrom(response);
    if (limited) throw limited;
    await response.body?.cancel();
    throw new HelenaClientError(
      response.status === 429 ? "rate_limited" : "provider_unavailable",
      response.status === 401
        ? "Entre na conta para conversar."
        : "Serviço indisponível. Tente mais tarde.",
    );
  }
  let answer = "";
  try {
    for await (const data of readEventStream(response.body, signal)) {
      const event: unknown = JSON.parse(data);
      if (!event || typeof event !== "object" || !("type" in event)) throw new Error();
      if (
        event.type === "delta" &&
        "text" in event &&
        typeof event.text === "string" &&
        event.text
      ) {
        answer += event.text;
        if (answer.length > 12_000) throw new Error();
        options.onText(answer);
      } else if (event.type === "done" && "response" in event) {
        const completed = parseHelenaResponse(event.response);
        if (!completed.ok || completed.value.answer !== answer) throw new Error();
        return completed.value;
      } else if (
        event.type === "error" &&
        "code" in event &&
        event.code === "rate_limited" &&
        "message" in event &&
        typeof event.message === "string" &&
        event.message.length <= 300
      ) {
        throw new HelenaClientError("rate_limited", event.message);
      } else throw new Error();
    }
    throw new Error();
  } catch (error) {
    if (options.signal?.aborted || error instanceof HelenaClientError) throw error;
    throw new HelenaClientError(
      "provider_unavailable",
      "A resposta foi interrompida. Tente novamente.",
    );
  }
}

export async function requestHelena(
  request: HelenaRequest,
  options: HelenaClientOptions = {},
): Promise<HelenaResponse> {
  // The server validates the complete contract. Keep the privacy gate before any network call.
  if (request.privacy?.consent !== true || request.privacy.retention !== "none") {
    throw new HelenaClientError("invalid_request", "Autorize o envio primeiro.");
  }

  const fetcher = options.fetcher ?? globalThis.fetch;
  const init: RequestInit = {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-App-Language": uiLocale(),
      "Idempotency-Key": attemptKey(),
    },
    body: JSON.stringify(request),
  };
  if (options.token)
    (init.headers as Record<string, string>)["Authorization"] = `Bearer ${options.token}`;
  if (options.signal) init.signal = options.signal;

  const response = await fetcher(HELENA_ENDPOINT, init);
  if (!response.ok) {
    // Do not display arbitrary server/proxy error text in the conversation.
    const limited = await limitErrorFrom(response);
    if (limited) throw limited;
    throw new HelenaClientError(
      response.status === 429 ? "rate_limited" : "provider_unavailable",
      response.status === 401
        ? "Entre na conta para conversar."
        : "Serviço indisponível. Tente mais tarde.",
    );
  }
  const text = await response.text();
  if (text.length > MAX_RESPONSE_LENGTH) {
    throw new HelenaClientError("provider_unavailable", INVALID_RESPONSE);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new HelenaClientError("provider_unavailable", INVALID_RESPONSE);
  }

  const parsedResponse = parseHelenaResponse(payload);
  if (!parsedResponse.ok) {
    throw new HelenaClientError("provider_unavailable", parsedResponse.message);
  }
  return parsedResponse.value;
}

export type HelenaUsage = {
  /** Créditos já gastos hoje, o que a pessoa pode gastar hoje e o que ainda resta. */
  usedCredits: number;
  limitCredits: number;
  remainingCredits: number;
  /** O que um pedido máximo custa: acima disso o servidor recusa o texto. */
  requestMaxCredits: number;
  resetInSeconds: number;
};

/** O orçamento do dia da pessoa, para a tela mostrar antes de gerar. Undefined se não der. */
export async function fetchHelenaUsage(
  options: HelenaClientOptions = {},
): Promise<HelenaUsage | undefined> {
  if (!options.token) return undefined;
  try {
    const response = await (options.fetcher ?? globalThis.fetch)(`${HELENA_ENDPOINT}?usage=1`, {
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${options.token}`, "X-App-Language": uiLocale() },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    const usage =
      body && typeof body === "object" && "usage" in body
        ? (body as { usage: unknown }).usage
        : undefined;
    if (!usage || typeof usage !== "object") return undefined;
    const value = usage as Record<string, unknown>;
    const numbers = [
      "usedCredits",
      "limitCredits",
      "remainingCredits",
      "requestMaxCredits",
      "resetInSeconds",
    ].map((key) => value[key]);
    if (!numbers.every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0))
      return undefined;
    return {
      usedCredits: numbers[0] as number,
      limitCredits: numbers[1] as number,
      remainingCredits: numbers[2] as number,
      requestMaxCredits: numbers[3] as number,
      resetInSeconds: numbers[4] as number,
    };
  } catch {
    return undefined;
  }
}
