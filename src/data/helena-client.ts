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
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(55_000)])
    : AbortSignal.timeout(55_000);
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
      } else throw new Error();
    }
    throw new Error();
  } catch (error) {
    if (options.signal?.aborted) throw error;
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
