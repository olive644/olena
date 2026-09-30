import { SpeechGenerationRateLimitError } from "./shared-speech-provider.js";
import { isValidLocalRoomCode, normalizeLocalRoomCode } from "../domain/local-room.js";

const MAX_BODY_BYTES = 1_000;
const MAX_TEXT_LENGTH = 160;

export type SpeechRequest = {
  text: string;
  rate: number;
  consent: true;
  roomCode?: string;
};

type RoomSpeechRequest = SpeechRequest & { roomCredential?: string };

export type SpeechAudio = {
  audio: Uint8Array;
  contentType: string;
};

export type SpeechProvider = {
  synthesize(request: SpeechRequest, clientId?: string): Promise<SpeechAudio>;
};

export type SpeechRateLimiter = {
  consume(clientId: string): Promise<boolean> | boolean;
};

export type SpeechHandlerDependencies = {
  identifyClient(request: Request): Promise<string> | string;
  provider: SpeechProvider;
  rateLimiter: SpeechRateLimiter;
  authorizeRoom?(code: string, credential: string, text: string): Promise<boolean>;
  guardRoomRequest?(request: Request): Promise<Response | undefined>;
  observe?(event: { scope: "room" | "individual"; status: number; durationMs: number }): void;
};

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isSpeechRequest(value: unknown): value is RoomSpeechRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    Object.keys(candidate).every((key) =>
      ["text", "rate", "consent", "roomCode", "roomCredential"].includes(key),
    ) &&
    typeof candidate["text"] === "string" &&
    candidate["text"].trim().length > 0 &&
    candidate["text"].length <= MAX_TEXT_LENGTH &&
    typeof candidate["rate"] === "number" &&
    Number.isFinite(candidate["rate"]) &&
    candidate["rate"] >= 0.7 &&
    candidate["rate"] <= 1.05 &&
    candidate["consent"] === true &&
    (candidate["roomCode"] === undefined
      ? candidate["roomCredential"] === undefined
      : typeof candidate["roomCode"] === "string" &&
        isValidLocalRoomCode(candidate["roomCode"]) &&
        typeof candidate["roomCredential"] === "string" &&
        candidate["roomCredential"].length > 0 &&
        candidate["roomCredential"].length <= 256)
  );
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function createSpeechHandler(dependencies: SpeechHandlerDependencies) {
  return async function handleSpeech(request: Request): Promise<Response> {
    const started = Date.now();
    let scope: "room" | "individual" = "individual";
    const finish = (response: Response) => {
      dependencies.observe?.({ scope, status: response.status, durationMs: Date.now() - started });
      return response;
    };
    if (request.method !== "POST") return finish(jsonError(405, "Método não permitido."));

    const requestOrigin = new URL(request.url).origin;
    if (request.headers.get("Origin") !== requestOrigin) {
      return finish(jsonError(403, "Origem não autorizada."));
    }
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return finish(jsonError(415, "Envie conteúdo JSON."));
    }

    const rawBody = await request.text();
    if (byteLength(rawBody) > MAX_BODY_BYTES)
      return finish(jsonError(413, "Requisição muito longa."));

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      return finish(jsonError(400, "JSON inválido."));
    }
    if (!isSpeechRequest(payload)) {
      return finish(jsonError(400, "Dados de voz inválidos ou consentimento ausente."));
    }

    scope = payload.roomCode ? "room" : "individual";
    if (payload.roomCode) {
      if (payload.rate !== 1) return finish(jsonError(400, "A velocidade da voz da sala é fixa."));
      try {
        const blocked = await dependencies.guardRoomRequest?.(request);
        if (blocked) return finish(blocked);
      } catch {
        return finish(jsonError(503, "A proteção da sala está indisponível."));
      }
      if (!dependencies.authorizeRoom)
        return finish(jsonError(503, "A voz da sala está indisponível."));
      try {
        if (
          !(await dependencies.authorizeRoom(
            payload.roomCode,
            payload.roomCredential!,
            payload.text,
          ))
        )
          return finish(jsonError(403, "Não autorizado a ouvir esta sala."));
      } catch {
        return finish(jsonError(503, "A voz da sala está indisponível."));
      }
    }

    let clientId: string;
    try {
      clientId = await dependencies.identifyClient(request);
      if (!clientId || !(await dependencies.rateLimiter.consume(clientId))) {
        return finish(jsonError(429, "Limite de voz atingido. Tente novamente em instantes."));
      }
    } catch {
      return finish(jsonError(503, "A voz está indisponível. Tente novamente em instantes."));
    }

    try {
      const result = await dependencies.provider.synthesize(
        {
          text: payload.text.trim(),
          rate: payload.rate,
          consent: true,
          ...(payload.roomCode ? { roomCode: normalizeLocalRoomCode(payload.roomCode) } : {}),
        },
        clientId,
      );
      return finish(
        new Response(result.audio.buffer as ArrayBuffer, {
          headers: {
            "Cache-Control": "private, max-age=3600",
            "Content-Type": result.contentType,
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
          },
        }),
      );
    } catch (error) {
      if (error instanceof SpeechGenerationRateLimitError) {
        return finish(jsonError(429, "Limite de voz atingido. Tente novamente em instantes."));
      }
      const response = jsonError(503, "O áudio está indisponível. Tente novamente em instantes.");
      if (
        error instanceof Error &&
        "providerStatus" in error &&
        typeof error.providerStatus === "number"
      ) {
        response.headers.set("X-Provider-Status", String(error.providerStatus));
      }
      return finish(response);
    }
  };
}
