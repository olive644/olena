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
import { studyActivitySummary } from "./study-activity-summary.js";
import { cardActivities } from "./reward-activity-summary.js";
import { resolveBrazilianZone } from "../data/agenda-time-zone.js";
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
  consume: async (uid) =>
    (await checkRateLimit(rateStore, "profile-social-minute", uid, 30, 60)) &&
    (await checkRateLimit(rateStore, "profile-social-global-minute", "all", 3000, 60)),
  async completedActivities(uid) {
    if (
      !(await checkRateLimit(rateStore, "profile-activities-minute", uid, 2, 60)) ||
      !(await checkRateLimit(rateStore, "profile-activities-day", uid, 120, 86400)) ||
      !(await checkRateLimit(rateStore, "profile-activities-global-day", "all", 10000, 86400))
    )
      throw new Error("activity-quota");
    const workspaceKey = `k_${Buffer.from("helenastudy.workspace.v1").toString("base64url")}`;
    const response = await fetch(
      `${config.databaseUrl}/users/${uid}/stateV2/items/${workspaceKey}.json`,
      { signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${await token()}` } },
    );
    if (!response.ok) throw new Error("activity-state");
    const raw: unknown = await response.json();
    const zoneKey = `k_${Buffer.from("helena.agendaTimeZone.v1").toString("base64url")}`;
    const zoneResponse = await fetch(
      `${config.databaseUrl}/users/${uid}/stateV2/items/${zoneKey}.json`,
      { signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${await token()}` } },
    );
    if (!zoneResponse.ok) throw new Error("activity-zone");
    const zone: unknown = await zoneResponse.json();
    const now = Date.now();
    // Uma leitura extra por publicação (mesmas cotas acima), nunca por GET. Se falhar, só as
    // cartas ficam de fora: os resumos de estudo continuam saindo.
    const cards = await (async () => {
      try {
        const rewardsKey = `k_${Buffer.from("helena.mathPlaceRewards.v1").toString("base64url")}`;
        const response = await fetch(
          `${config.databaseUrl}/users/${uid}/stateV2/items/${rewardsKey}.json`,
          {
            signal: AbortSignal.timeout(10000),
            headers: { Authorization: `Bearer ${await token()}` },
          },
        );
        if (!response.ok) return [];
        const value: unknown = await response.json();
        return cardActivities(typeof value === "string" ? value : null, now);
      } catch {
        return [];
      }
    })();
    return [
      ...studyActivitySummary(
        typeof raw === "string" ? raw : null,
        now,
        resolveBrazilianZone(typeof zone === "string" ? zone : null, "America/Sao_Paulo"),
      ),
      ...cards,
    ];
  },
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
