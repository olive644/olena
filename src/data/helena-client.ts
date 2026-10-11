import {
  parseHelenaResponse,
  type HelenaErrorCode,
  type HelenaRequest,
  type HelenaResponse,
} from "../ai/helena-contract";

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
