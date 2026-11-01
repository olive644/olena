import { createAccountInactivity } from "./account-inactivity.js";
import { isCronAuthorized } from "./cron-auth.js";
import { DiscordAccountLogError } from "./discord-account-error.js";
import { createAccountLogHandler } from "./discord-account-log.js";
import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import {
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
} from "./firebase-realtime-store.js";
import { profileAllowedOrigins } from "./profile-handle-runtime.js";
import { checkRateLimit } from "./rate-limit.js";
import { clientAddress } from "./client-address.js";

const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};
const store = createFirebaseRealtimeStore(
  config,
  fetch,
  Date.now,
  createFirebaseAccessTokenProvider(config),
);
const verify = createFirebaseAccountIdentity(process.env["VITE_FIREBASE_PROJECT_ID"] ?? "");
const token = process.env["DISCORD_BOT_TOKEN"] ?? "";
const guild = "1562664412530085908";
const category = "1562664695339417672";
const channel = "1562664759017340959";
const enabled = process.env["DISCORD_ACCOUNT_LOG_ENABLED"] === "true";

async function discord(path: string, init?: RequestInit) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok)
    throw new DiscordAccountLogError(
      response.status === 401
        ? "discord-token-invalid"
        : response.status === 429
          ? "discord-rate-limit"
          : response.status === 403 || response.status === 404
            ? init?.method === "POST"
              ? "discord-send-denied"
              : "discord-channel-access"
            : "discord-unavailable",
      path === `/channels/${category}`
        ? "category"
        : path.startsWith(`/channels/${channel}`)
          ? "channel"
          : undefined,
    );
  return response;
}
// Não envia antes de conferir o destino privado. Nenhuma resposta externa vai para logs.
export async function assertPrivateDiscordLogDestination() {
  const me = (await (await discord("/users/@me")).json()) as { id: string };
  let administration: { owner: string; roles: Set<string> } | undefined;
  const members = new Map<string, boolean>();
  async function isAdministrator(rule: { id: string; type: number }) {
    if (!administration) {
      const server = (await (await discord(`/guilds/${guild}`)).json()) as { owner_id: string };
      const roles = (await (await discord(`/guilds/${guild}/roles`)).json()) as {
        id: string;
        permissions: string;
      }[];
      if (!server.owner_id || !Array.isArray(roles)) throw new Error("discord-guild-invalid");
      administration = {
        owner: server.owner_id,
        roles: new Set(
          roles.filter((role) => (BigInt(role.permissions) & 8n) !== 0n).map((role) => role.id),
        ),
      };
    }
    if (rule.type === 0) return administration.roles.has(rule.id);
    if (rule.type !== 1) return false;
    if (rule.id === administration.owner) return true;
    if (!members.has(rule.id)) {
      const member = (await (await discord(`/guilds/${guild}/members/${rule.id}`)).json()) as {
        roles: string[];
      };
      if (!Array.isArray(member.roles)) throw new Error("discord-member-invalid");
      members.set(
        rule.id,
        member.roles.some((role) => administration!.roles.has(role)),
      );
    }
    return members.get(rule.id) === true;
  }
  for (const id of [category, channel]) {
    const target = (await (await discord(`/channels/${id}`)).json()) as {
      guild_id?: string;
      parent_id?: string;
      type?: number;
      permission_overwrites?: { id: string; type: number; allow: string; deny: string }[];
    };
    const rules = target.permission_overwrites ?? [];
    if (
      target.guild_id !== guild ||
      (id === category ? target.type !== 4 : target.type !== 0 || target.parent_id !== category)
    )
      throw new DiscordAccountLogError(
        "discord-log-destination",
        id === category ? "category" : "channel",
      );
    if (!rules.some((r) => r.id === guild && r.type === 0 && (BigInt(r.deny) & 1024n) !== 0n))
      throw new DiscordAccountLogError(
        "discord-log-public",
        id === category ? "category" : "channel",
      );
    for (const rule of rules) {
      if (
        rule.id !== me.id &&
        (BigInt(rule.allow) & 1024n) !== 0n &&
        !(await isAdministrator(rule))
      )
        throw new DiscordAccountLogError(
          "discord-log-extra-viewer",
          id === category ? "category" : "channel",
        );
    }
    if (!rules.some((r) => r.id === me.id && r.type === 1 && (BigInt(r.allow) & 3072n) === 3072n))
      throw new DiscordAccountLogError(
        "discord-log-bot-access",
        id === category ? "category" : "channel",
      );
  }
}
const inactivity = createAccountInactivity(
  config.databaseUrl,
  createFirebaseAccessTokenProvider(config),
);

export const handleAccountLog = createAccountLogHandler({
  store,
  secret: enabled ? token : "",
  allowedOrigins: profileAllowedOrigins,
  consume: async (request, uid) =>
    uid
      ? (await checkRateLimit(store, "account-log-user", uid, 30, 86400)) &&
        (await checkRateLimit(store, "account-log-global", "all", 2000, 86400))
      : (await checkRateLimit(
          store,
          "account-log-origin",
          clientAddress(request) ?? "unknown",
          30,
          60,
        )) && (await checkRateLimit(store, "account-log-requests", "all", 10000, 86400)),
  observe: inactivity.observe,
  async identify(request, deleted) {
    const identity = await verify(request);
    if (!identity || identity.anonymous) return undefined;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(process.env["VITE_FIREBASE_API_KEY"] ?? "")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: request.headers.get("authorization")!.slice(7) }),
        signal: AbortSignal.timeout(4000),
      },
    );
    const result = (await response.json()) as {
      users?: { localId?: string; createdAt?: string; displayName?: string; disabled?: boolean }[];
      error?: { message?: string };
    };
    const current = result.users?.[0];
    if (
      deleted
        ? response.status !== 400 || result.error?.message !== "USER_NOT_FOUND"
        : !response.ok || current?.localId !== identity.uid || current.disabled
    )
      return undefined;
    return {
      uid: identity.uid,
      authTime: identity.authTime,
      provider: identity.signInProvider ?? "",
      deleted,
      name: current?.displayName || (identity.name !== identity.email ? identity.name : ""),
      ...(current?.createdAt ? { createdAt: Number(current.createdAt) } : {}),
    };
  },
  send: sendAccountEvent,
});

async function sendAccountEvent(event: {
  title: string;
  color: number;
  name: string;
  method: string;
  reference: string;
  nonce: string;
  timestamp: string;
}) {
  await assertPrivateDiscordLogDestination();
  await discord(`/channels/${channel}/messages`, {
    method: "POST",
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      nonce: event.nonce,
      enforce_nonce: true,
      embeds: [
        {
          title: event.title,
          color: event.color,
          fields: [
            { name: "Usuário", value: event.name, inline: false },
            { name: "Método de acesso da sessão", value: event.method, inline: true },
            { name: "Referência privada", value: event.reference, inline: true },
          ],
          timestamp: event.timestamp,
          footer: { text: "OlenaStudy • ACCOUNT" },
        },
      ],
    }),
  });
}

export async function handleAccountInactivity(request: Request) {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  if (!isCronAuthorized(request, process.env["CRON_SECRET"]))
    return new Response(null, { status: 401 });
  if (!enabled || !token) return new Response(null, { status: 503 });
  if (!(await checkRateLimit(store, "account-inactivity-run", "all", 1, 3600)))
    return new Response(null, { status: 429 });
  try {
    return Response.json(
      await inactivity.sweep(async (event) => {
        if (!(await checkRateLimit(store, "account-log-global", "all", 2000, 86400)))
          throw new Error("account-log-quota");
        await sendAccountEvent(event);
      }),
    );
  } catch {
    return new Response(null, { status: 503 });
  }
}
