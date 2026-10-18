import {
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
} from "./firebase-realtime-store.js";
import { identifyProfileAccount, profileAllowedOrigins } from "./profile-handle-runtime.js";
import { createProfileSocialHandler, type SocialState } from "./profile-social-handler.js";
import type { HandleRegistry } from "./profile-handle-handler.js";
import { checkRateLimit } from "./rate-limit.js";
import { createFirebaseSocialWatcher } from "./firebase-social-events.js";
import { createProfileSocialEvents } from "./profile-social-events.js";
const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};
const token = createFirebaseAccessTokenProvider(config);
const rateStore = createFirebaseRealtimeStore(config);
const url = `${config.databaseUrl}/privateProfileSocial.json`;
const handleFeed = createProfileSocialHandler({
  allowedOrigins: profileAllowedOrigins,
  identify: identifyProfileAccount,
  consume: (uid) => checkRateLimit(rateStore, "profile-social-minute", uid, 30, 60),
  async handles() {
    const response = await fetch(`${config.databaseUrl}/privateProfileHandles.json`, {
      headers: { Authorization: `Bearer ${await token()}` },
    });
    if (!response.ok) throw new Error("handles");
    return ((await response.json()) as HandleRegistry) ?? {};
  },
  store: {
    async read() {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${await token()}`, "X-Firebase-ETag": "true" },
      });
      if (!response.ok) throw new Error("read-social");
      const version = response.headers.get("etag");
      if (!version) throw new Error("version");
      return { value: ((await response.json()) as SocialState) ?? { accounts: {} }, version };
    },
    async write(value, version) {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${await token()}`,
          "Content-Type": "application/json",
          "if-match": version,
        },
        body: JSON.stringify(value),
      });
      if (response.status === 412) return false;
      if (!response.ok) throw new Error("write-social");
      return true;
    },
  },
});

const handleEvents = createProfileSocialEvents({
  allowedOrigins: profileAllowedOrigins,
  identify: identifyProfileAccount,
  consume: async (uid) =>
    (await checkRateLimit(rateStore, "profile-social-stream-minute", uid, 6, 60)) &&
    (await checkRateLimit(rateStore, "profile-social-stream-global", "all", 300, 60)),
  watch: createFirebaseSocialWatcher({ databaseUrl: config.databaseUrl, token }),
});

export function handleProfileSocial(request: Request) {
  return new URL(request.url).searchParams.has("stream")
    ? handleEvents(request)
    : handleFeed(request);
}
