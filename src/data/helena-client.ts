import {
  parseHelenaResponse,
  type HelenaErrorCode,
  type HelenaRequest,
  type HelenaResponse,
} from "../ai/helena-contract";
import { readEventStream } from "../ai/event-stream";

const HELENA_ENDPOINT = "/api/helena";
const MAX_RESPONSE_LENGTH = 32_000;
const INVALID_RESPONSE = "Resposta inválida. Tente novamente.";

/** Só o texto de limite de uso vem do servidor (é nosso e curto): é o que explica a falta de cota. */
async function limitErrorFrom(response: Response): Promise<HelenaClientError | undefined> {
  if (response.status !== 429) return undefined;
  try {
    const body: unknown = await response.json();
    const error =
      body && typeof body === "object" && "error" in body
        ? (body as { error: unknown }).error
        : undefined;
    if (error && typeof error === "object" && "code" in error && "message" in error) {
      const { code, message } = error as { code: unknown; message: unknown };
      if (code === "rate_limited" && typeof message === "string" && message.length <= 300)
        return new HelenaClientError("rate_limited", message);
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
    headers: { Accept: "application/json", "Content-Type": "application/json" },
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
