import { createHash } from "node:crypto";
import {
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
} from "./firebase-realtime-store.js";
import { identifyProfileAccount, profileAllowedOrigins } from "./profile-handle-runtime.js";
import { checkRateLimit } from "./rate-limit.js";
import { createProfileCompletionHandler } from "./profile-completion-handler.js";

const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};
const token = createFirebaseAccessTokenProvider(config);
const rateStore = createFirebaseRealtimeStore(config);
export const handleProfileCompletion = createProfileCompletionHandler({
  allowedOrigins: profileAllowedOrigins,
  identify: identifyProfileAccount,
  consume: (uid) => checkRateLimit(rateStore, "profile-completion-minute", uid, 30, 60),
  async read(uid) {
    const headers = { Authorization: `Bearer ${await token()}` };
    const key = `k_${Buffer.from("helena.profile.v1").toString("base64url")}`;
    const accountKey = createHash("sha256").update(uid).digest("hex");
    const read = async (path: string): Promise<unknown> => {
      const response = await fetch(`${config.databaseUrl}/${path}.json`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("profile-read");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("profile-body");
      const decoder = new TextDecoder();
      let bytes = 0;
      let text = "";
      try {
        for (;;) {
          const packet = await reader.read();
          if (packet.done) break;
          bytes += packet.value.byteLength;
          if (bytes > 16384) {
            await reader.cancel();
            throw new Error("profile-size");
          }
          text += decoder.decode(packet.value, { stream: true });
        }
        return JSON.parse(text + decoder.decode()) as unknown;
      } finally {
        reader.releaseLock();
      }
    };
    const [raw, handle] = await Promise.all([
      read(`users/${encodeURIComponent(uid)}/stateV2/items/${key}`),
      read(`privateProfileHandles/${accountKey}/username`),
    ]);
    // Somente o item moderno do próprio perfil, sem baixar cadernos ou estudos.
    const profile: unknown = typeof raw === "string" && raw.length <= 16384 ? JSON.parse(raw) : {};
    return { profile, username: handle };
  },
});
