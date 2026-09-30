import { createCloudflareTtsProvider } from "../src/backend/cloudflare-tts-provider.js";
import { createFirebaseRealtimeStore } from "../src/backend/firebase-realtime-store.js";
import { checkRateLimit } from "../src/backend/rate-limit.js";
import { createSharedSpeechProvider } from "../src/backend/shared-speech-provider.js";
import { createSpeechHandler } from "../src/backend/speech-handler.js";
import { createRoomAudioAuthorizer } from "../src/backend/room-audio-authorizer.js";
import { createRoomGuard } from "../src/backend/room-guard.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

const rateLimitStore = createFirebaseRealtimeStore({
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
});

const handler = createSpeechHandler({
  authorizeRoom: createRoomAudioAuthorizer(rateLimitStore),
  guardRoomRequest: createRoomGuard(
    rateLimitStore,
    "776947909599",
    process.env["FIREBASE_APP_ID"] ?? "",
    process.env["FIREBASE_APPCHECK_ENFORCE"] === "true",
    (event) => console.info(JSON.stringify({ event: "room_protection", ...event })),
  ),
  observe: (event) => console.info(JSON.stringify({ event: "speech_request", ...event })),
  identifyClient(request) {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  },
  rateLimiter: {
    // Store compartilhado (Firebase) em vez de Map em memória: o limite vale
    // pra todas as instâncias serverless, não só pra que atendeu a requisição.
    consume(clientId) {
      return checkRateLimit(rateLimitStore, "speech-rate-limit", clientId, 240, 60);
    },
  },
  provider: createSharedSpeechProvider(
    createCloudflareTtsProvider(
      process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
      process.env["CLOUDFLARE_API_TOKEN"] ?? "",
      Number(process.env["TTS_TIMEOUT_MS"] ?? "8000"),
    ),
    rateLimitStore,
    {
      consume(clientId) {
        return checkRateLimit(rateLimitStore, "speech-generation-rate-limit", clientId, 30, 60);
      },
    },
  ),
});

export default createVercelHandler("/api/speech", handler);
