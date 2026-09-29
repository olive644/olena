import { createHash, randomUUID } from "node:crypto";
import type { KvStore } from "./kv-store.js";
import type {
  SpeechAudio,
  SpeechProvider,
  SpeechRateLimiter,
  SpeechRequest,
} from "./speech-handler.js";

const CACHE_SECONDS = 60 * 60;
const LOCK_SECONDS = 20;
const WAIT_MS = 350;
const MAX_WAIT_MS = 15_000;
const MAX_AUDIO_BYTES = 512_000;

type CachedSpeech =
  { status: "pending"; owner: string } | { status: "ready"; contentType: string; audio: string };

export class SpeechGenerationRateLimitError extends Error {}

// A chave contém apenas um hash. Frases e gravações ficam no caminho privado do Firebase,
// com expiração e limpeza programada, nunca na projeção pública da sala.
export function createSharedSpeechProvider(
  provider: SpeechProvider,
  store: KvStore,
  generationLimiter: SpeechRateLimiter,
): SpeechProvider {
  if (!store.readVersion || !store.compareAndSet) {
    throw new Error("O áudio compartilhado exige gravação transacional.");
  }

  return {
    async synthesize(request: SpeechRequest, clientId = "anonymous"): Promise<SpeechAudio> {
      if (!request.roomCode) {
        if (!(await generationLimiter.consume(clientId))) {
          throw new SpeechGenerationRateLimitError("Limite de geração de voz atingido.");
        }
        return provider.synthesize(request);
      }
      const key = `speech-audio/${createHash("sha256")
        .update(JSON.stringify(["melotts-v1", request.roomCode, request.rate, request.text.trim()]))
        .digest("hex")}`;
      const deadline = Date.now() + MAX_WAIT_MS;

      while (Date.now() < deadline) {
        const snapshot = await store.readVersion!(key);
        const cached = snapshot.value ? (JSON.parse(snapshot.value) as CachedSpeech) : undefined;
        if (cached?.status === "ready") {
          return {
            audio: new Uint8Array(Buffer.from(cached.audio, "base64")),
            contentType: cached.contentType,
          };
        }

        if (!cached) {
          const owner = randomUUID();
          const pending = JSON.stringify({ status: "pending", owner });
          const claimed = await store.compareAndSet!(key, pending, LOCK_SECONDS, snapshot.version);
          if (!claimed) continue;

          try {
            if (!(await generationLimiter.consume(clientId))) {
              throw new SpeechGenerationRateLimitError("Limite de geração de voz atingido.");
            }
            const result = await provider.synthesize(request);
            if (
              result.audio.byteLength > MAX_AUDIO_BYTES ||
              !result.contentType.startsWith("audio/")
            ) {
              throw new Error("Resposta de voz inválida ou longa demais.");
            }
            const current = await store.readVersion!(key);
            if (current.value !== pending) continue;
            const saved = await store.compareAndSet!(
              key,
              JSON.stringify({
                status: "ready",
                contentType: result.contentType,
                audio: Buffer.from(result.audio).toString("base64"),
              }),
              CACHE_SECONDS,
              current.version,
            );
            if (saved) return result;
          } catch (error) {
            const current = await store.readVersion!(key);
            if (current.value === pending) await store.del(key);
            throw error;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
      }

      throw new Error("Tempo esgotado aguardando a gravação compartilhada.");
    },
  };
}
