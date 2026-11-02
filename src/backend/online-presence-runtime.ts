import { createHash } from "node:crypto";
import {
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
} from "./firebase-realtime-store.js";
import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import { profileAllowedOrigins } from "./profile-handle-runtime.js";
import { checkRateLimit } from "./rate-limit.js";
import { clientAddress } from "./client-address.js";
import { isCronAuthorized } from "./cron-auth.js";
import { createOnlineChannel } from "./online-channel.js";
import { PRIVACY_POLICY_VERSION } from "../domain/privacy-policy.js";
const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};
const token = createFirebaseAccessTokenProvider(config);
const store = createFirebaseRealtimeStore(config, fetch, Date.now, token);
const verify = createFirebaseAccountIdentity(process.env["VITE_FIREBASE_PROJECT_ID"] ?? "");
const channel = "1566649923099689070";
const guild = "1562664412530085908";
async function database(path: string, init?: RequestInit) {
  const response = await fetch(config.databaseUrl + "/privateOnlinePresence" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + (await token()),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok && response.status !== 412) throw new Error("presence-store");
  return response;
}
const tracker = createOnlineChannel({
  store,
  async observe(key, now) {
    await database("/" + key + ".json", { method: "PUT", body: JSON.stringify(now) });
  },
  async count(since) {
    const expired = (await (
      await database(".json?orderBy=%22%24value%22&endAt=" + (since - 1) + "&limitToFirst=20")
    ).json()) as Record<string, unknown> | null;
    await Promise.all(
      Object.keys(expired ?? {})
        .filter((key) => /^[a-f0-9]{64}$/.test(key))
        .map(async (key) => {
          const path = "/" + key + ".json";
          const current = await database(path, { headers: { "X-Firebase-ETag": "true" } });
          const version = current.headers.get("etag");
          const value: unknown = await current.json();
          if (version && typeof value === "number" && value < since)
            await database(path, { method: "DELETE", headers: { "if-match": version } });
        }),
    );
    const response = await database(
      ".json?orderBy=%22%24value%22&startAt=" + since + "&limitToFirst=2001",
    );
    const values: unknown = await response.json();
    if (values === null) return 0;
    if (typeof values !== "object" || Array.isArray(values)) throw new Error("presence-values");
    const times = Object.values(values);
    if (times.length > 2000) throw new Error("presence-capacity");
    return times.filter(
      (value) => typeof value === "number" && value >= since && value <= Date.now(),
    ).length;
  },
  async publish(count) {
    const headers = {
      Authorization: "Bot " + (process.env["DISCORD_BOT_TOKEN"] ?? ""),
      "Content-Type": "application/json",
    };
    const response = await fetch("https://discord.com/api/v10/channels/" + channel, {
      headers,
      signal: AbortSignal.timeout(4000),
    });
    if (response.status === 429) return retryDelay(response);
    if (!response.ok) throw new Error("presence-channel");
    const destination = (await response.json()) as { guild_id?: string; type?: number };
    if (destination.guild_id !== guild || destination.type !== 2)
      throw new Error("presence-destination");
    const updated = await fetch("https://discord.com/api/v10/channels/" + channel, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "Online no Olena: " + count }),
      signal: AbortSignal.timeout(4000),
    });
    if (updated.status === 429) return retryDelay(updated);
    if (!updated.ok) throw new Error("presence-discord");
    return undefined;
  },
});
async function retryDelay(response: Response) {
  const data = (await response.json()) as { retry_after?: number };
  return Math.min(86400000, Math.max(300000, Number(data.retry_after ?? 300) * 1000));
}
export async function handleOnlinePresence(request: Request) {
  const reply = (status: number) =>
    new Response(null, {
      status,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  if (process.env["DISCORD_ONLINE_COUNT_ENABLED"] !== "true")
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store", "X-Olena-Presence": "disabled" },
    });
  try {
    if (request.method === "GET") {
      if (!isCronAuthorized(request, process.env["CRON_SECRET"])) return reply(401);
      if (!(await checkRateLimit(store, "online-count-cron", "all", 1, 300))) return reply(429);
      await tracker.update();
      return reply(204);
    }
    if (request.method !== "POST") return reply(405);
    if (!profileAllowedOrigins.includes(request.headers.get("origin") ?? "")) return reply(403);
    if (Number(request.headers.get("content-length") ?? 0) > 64) return reply(413);
    if (
      !(await checkRateLimit(
        store,
        "online-count-ip",
        clientAddress(request) ?? "unknown",
        120,
        60,
      ))
    )
      return reply(429);
    if (!(await checkRateLimit(store, "online-count-global", "all", 60000, 86400)))
      return reply(429);
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    let body = "";
    let bytes = 0;
    try {
      for (;;) {
        const packet = await reader.read();
        if (packet.done) break;
        bytes += packet.value.byteLength;
        if (bytes > 64) {
          await reader.cancel();
          return reply(413);
        }
        body += new TextDecoder().decode(packet.value);
        if (body.length > 64) {
          await reader.cancel();
          return reply(413);
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (body !== PRIVACY_POLICY_VERSION) return reply(400);
    const account = await verify(request);
    if (!account || account.anonymous) return reply(401);
    if (!(await checkRateLimit(store, "online-count-user", account.uid, 2, 60))) return reply(429);
    const key = createHash("sha256").update(account.uid).digest("hex");
    await tracker.heartbeat(key);
    return reply(204);
  } catch {
    return reply(503);
  }
}
