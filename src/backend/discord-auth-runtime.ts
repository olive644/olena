import { createHash, randomUUID } from "node:crypto";
import { decodeJwt, importPKCS8, SignJWT } from "jose";
import { createDiscordAuthHandler } from "./discord-auth-handler.js";
import {
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
} from "./firebase-realtime-store.js";
import { createGoogleAccessTokenProvider } from "./google-service-account.js";
import { identifyProfileAccount, profileAllowedOrigins } from "./profile-handle-runtime.js";
import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import { checkRateLimit } from "./rate-limit.js";

const project = process.env["VITE_FIREBASE_PROJECT_ID"] ?? "";
const apiKey = process.env["VITE_FIREBASE_API_KEY"] ?? "";
const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};
const dbToken = createFirebaseAccessTokenProvider(config);
const adminToken = createGoogleAccessTokenProvider(config.serviceAccount, [
  "https://www.googleapis.com/auth/cloud-platform",
]);
const rateStore = createFirebaseRealtimeStore(config, fetch, () => Date.now(), dbToken);
const ownerPath = (uid: string) =>
  `${config.databaseUrl}/privateAuthDiscordOwners/${createHash("sha256").update(uid).digest("hex")}.json`;
async function rememberOwner(uid: string, id: string, name: string) {
  const url = ownerPath(uid);
  const headers = { Authorization: `Bearer ${await dbToken()}` };
  const response = await fetch(url, {
    headers: { ...headers, "X-Firebase-ETag": "true" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("owner-read");
  const saved = (await response.json()) as { id?: string; name?: string } | null;
  if (saved?.id && saved.id !== id) throw new Error("discord-already-linked");
  if (saved?.id === id && saved.name === name) return;
  const version = response.headers.get("etag");
  if (!version) throw new Error("owner-version");
  const write = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "if-match": version, "Content-Type": "application/json" },
    body: JSON.stringify({ id, name }),
    signal: AbortSignal.timeout(10000),
  });
  if (write.status === 412) {
    const current = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (current.ok && ((await current.json()) as { id?: string } | null)?.id === id) return;
  }
  if (!write.ok) throw new Error("owner-write");
}
async function forgetOwner(uid: string, id: string) {
  const headers = { Authorization: `Bearer ${await dbToken()}` };
  const response = await fetch(ownerPath(uid), {
    headers: { ...headers, "X-Firebase-ETag": "true" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("owner-read");
  const record = (await response.json()) as { id?: string } | null;
  if (record?.id !== id) return;
  const version = response.headers.get("etag");
  if (!version) throw new Error("owner-version");
  const removed = await fetch(ownerPath(uid), {
    method: "DELETE",
    headers: { ...headers, "if-match": version },
    signal: AbortSignal.timeout(10000),
  });
  if (!removed.ok && removed.status !== 412) throw new Error("owner-delete");
}
type Account = {
  disabled?: boolean;
  passwordHash?: string;
  providerUserInfo?: { providerId?: string }[];
};
const hasPassword = (value: Account) =>
  !!value.passwordHash || value.providerUserInfo?.some((p) => p.providerId === "password") === true;
async function account(uid: string, idToken?: string): Promise<Account | undefined> {
  const response = await fetch(
    idToken
      ? `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`
      : `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        ...(idToken ? {} : { Authorization: `Bearer ${await adminToken()}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(idToken ? { idToken } : { localId: [uid] }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("account-lookup");
  const body = (await response.json()) as { users?: (Account & { localId?: string })[] };
  const current = body.users?.[0];
  if (idToken && current?.localId !== uid) throw new Error("account-mismatch");
  return current;
}
const oauthHandler = createDiscordAuthHandler({
  clientId:
    project &&
    apiKey &&
    config.databaseUrl &&
    config.serviceAccount.privateKey &&
    config.serviceAccount.clientEmail
      ? (process.env["DISCORD_CLIENT_ID"] ?? process.env["DISCORD_APPLICATION_ID"] ?? "")
      : "",
  clientSecret: process.env["DISCORD_CLIENT_SECRET"] ?? "",
  origin: process.env["AUTH_PUBLIC_ORIGIN"] ?? "https://olenastudy.vercel.app",
  allowedOrigins: profileAllowedOrigins,
  store: rateStore,
  identify: identifyProfileAccount,
  async resolve(profile, linkUid) {
    // O ID estável vem de /users/@me, nunca de um e-mail ou ID enviado pelo cliente.
    const path = `${config.databaseUrl}/privateAuthDiscord/${profile.id}.json`;
    for (let attempt = 0; attempt < 8; attempt++) {
      const headers = { Authorization: `Bearer ${await dbToken()}` };
      const response = await fetch(path, {
        headers: { ...headers, "X-Firebase-ETag": "true" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("identity-read");
      const saved = (await response.json()) as { uid?: string; ready?: boolean } | null;
      if (saved?.uid && linkUid && saved.uid !== linkUid) {
        await forgetOwner(linkUid, profile.id);
        throw new Error("identity-already-linked");
      }
      const existing = saved?.uid ? await account(saved.uid) : undefined;
      if (existing?.disabled) throw new Error("disabled");
      if (saved?.uid && saved.ready && !existing) {
        // Uma conta removida não recupera o UID antigo quando autoriza Discord novamente.
        const stale = await fetch(ownerPath(saved.uid), {
          method: "DELETE",
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (!stale.ok) throw new Error("stale-owner-delete");
      }
      if (existing && saved?.uid) {
        if (!saved.ready) {
          const ready = await fetch(path, {
            method: "PUT",
            headers: {
              ...headers,
              "if-match": response.headers.get("etag") ?? "invalid",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uid: saved.uid, ready: true }),
            signal: AbortSignal.timeout(10000),
          });
          if (ready.status === 412) continue;
          if (!ready.ok) throw new Error("identity-commit");
        }
        await rememberOwner(saved.uid, profile.id, profile.name);
        return saved.uid;
      }
      if (saved?.uid && !saved.ready) {
        // Pedidos concorrentes completam a mesma reserva, sem trocar seu UID.
        const created = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${await adminToken()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              localId: saved.uid,
              displayName: profile.name,
              targetProjectId: project,
            }),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!created.ok && !(await account(saved.uid))) throw new Error("account-create");
        const committed = await fetch(path, {
          method: "PUT",
          headers: {
            ...headers,
            "if-match": response.headers.get("etag") ?? "invalid",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uid: saved.uid, ready: true }),
          signal: AbortSignal.timeout(10000),
        });
        if (committed.status === 412) continue;
        if (!committed.ok) throw new Error("identity-commit");
        await rememberOwner(saved.uid, profile.id, profile.name);
        return saved.uid;
      }
      const uid = linkUid ?? `discord-${randomUUID()}`;
      if (linkUid) {
        const target = await account(linkUid);
        if (!target || target.disabled) throw new Error("missing-account");
        await rememberOwner(linkUid, profile.id, profile.name);
      }
      const version = response.headers.get("etag");
      if (!version) throw new Error("version");
      const write = await fetch(path, {
        method: "PUT",
        headers: { ...headers, "if-match": version, "Content-Type": "application/json" },
        body: JSON.stringify({ uid, ready: !!linkUid }),
        signal: AbortSignal.timeout(10000),
      });
      if (write.status === 412) continue;
      if (!write.ok) throw new Error("identity-write");
      if (linkUid) return uid;
    }
    throw new Error("identity-contention");
  },
  async mint(uid) {
    const current = await account(uid);
    if (!current || current.disabled) throw new Error("invalid-account");
    const key = await importPKCS8(config.serviceAccount.privateKey, "RS256");
    const issuedAt = Math.floor(Date.now() / 1000);
    return new SignJWT({ uid })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(config.serviceAccount.clientEmail)
      .setSubject(config.serviceAccount.clientEmail)
      .setAudience(
        "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      )
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + 300)
      .sign(key);
  },
});

const verifyDeletedOwner = createFirebaseAccountIdentity(project);
export async function handleDiscordAuth(request: Request): Promise<Response> {
  const step = new URL(request.url).searchParams.get("step");
  if (
    step !== "cleanup" &&
    step !== "recent" &&
    step !== "methods" &&
    step !== "unlink-google" &&
    step !== "unlink-discord"
  )
    return oauthHandler(request);
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
  if (
    request.method !== "POST" ||
    !profileAllowedOrigins.includes(request.headers.get("origin") ?? "")
  )
    return new Response("{}", { status: 403, headers });
  try {
    // O token assinado comprova a antiga propriedade; a conta precisa já estar removida.
    const owner = await verifyDeletedOwner(request);
    if (!owner || owner.anonymous) return new Response("{}", { status: 403, headers });
    if (step === "unlink-google" || step === "unlink-discord") {
      const claims = decodeJwt(request.headers.get("authorization")!.slice(7));
      const age = Date.now() / 1000 - Number(claims["auth_time"]);
      if (!Number.isFinite(age) || age < 0 || age >= 240)
        return new Response("{}", { status: 401, headers });
      if (
        !(await checkRateLimit(rateStore, "room-limits", `auth-unlink:${owner.uid}`, 10, 3600)) ||
        !(await checkRateLimit(rateStore, "room-limits", "auth-unlink:global", 1000, 86400))
      )
        return new Response("{}", { status: 429, headers });
      // Ambas remoções usam a mesma exclusão mútua, inclusive em abas/instâncias distintas.
      const lockPath = `room-limits/auth-unlink-lock-${createHash("sha256").update(owner.uid).digest("hex")}`;
      const began = Date.now();
      const lease = randomUUID();
      const snapshot = await rateStore.readVersion!(lockPath);
      if (
        snapshot.value ||
        !(await rateStore.compareAndSet!(lockPath, lease, 120, snapshot.version))
      )
        return new Response("{}", { status: 409, headers });
      try {
        const current = await account(owner.uid, request.headers.get("authorization")!.slice(7));
        if (!current || current.disabled) return new Response("{}", { status: 403, headers });
        const dbHeaders = { Authorization: `Bearer ${await dbToken()}` };
        const index = await fetch(ownerPath(owner.uid), {
          headers: dbHeaders,
          signal: AbortSignal.timeout(10000),
        });
        if (!index.ok) throw new Error("owner-read");
        const entry = (await index.json()) as { id?: string } | null;
        const path =
          entry?.id && /^\d{17,20}$/.test(entry.id)
            ? `${config.databaseUrl}/privateAuthDiscord/${entry.id}.json`
            : undefined;
        const binding = path
          ? await fetch(path, {
              headers: { ...dbHeaders, "X-Firebase-ETag": "true" },
              signal: AbortSignal.timeout(10000),
            })
          : undefined;
        if (binding && !binding.ok) throw new Error("identity-read");
        const saved = binding
          ? ((await binding.json()) as { uid?: string; ready?: boolean } | null)
          : undefined;
        const discord = saved?.uid === owner.uid && saved.ready === true;
        const providers = current.providerUserInfo ?? [];
        const google = providers.some((p) => p.providerId === "google.com");
        if (
          !(step === "unlink-google"
            ? hasPassword(current) || discord
            : hasPassword(current) || google)
        )
          return new Response(JSON.stringify({ error: "last-method" }), { status: 409, headers });
        if (Date.now() - began > 60000) throw new Error("lease-expired");
        if (step === "unlink-google" && google) {
          const removed = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                idToken: request.headers.get("authorization")!.slice(7),
                deleteProvider: ["google.com"],
              }),
              signal: AbortSignal.timeout(10000),
            },
          );
          if (!removed.ok) throw new Error("provider-unlink");
        } else if (step === "unlink-discord" && discord && path && entry?.id) {
          const version = binding!.headers.get("etag");
          if (!version) throw new Error("identity-version");
          const removed = await fetch(path, {
            method: "DELETE",
            headers: { ...dbHeaders, "if-match": version },
            signal: AbortSignal.timeout(10000),
          });
          if (!removed.ok) throw new Error("identity-delete");
          await forgetOwner(owner.uid, entry.id);
        }
        return new Response("{}", { status: 200, headers });
      } finally {
        // Não liberar uma concessão que já poderia pertencer a outro pedido.
        const held = await rateStore.readVersion!(lockPath);
        if (held.value === lease)
          await rateStore.compareAndSet!(lockPath, "released", 0, held.version);
      }
    }
    if (step === "methods") {
      if (
        !(await checkRateLimit(rateStore, "room-limits", `auth-methods:${owner.uid}`, 30, 3600)) ||
        !(await checkRateLimit(rateStore, "room-limits", "auth-methods:global", 2000, 86400))
      )
        return new Response("{}", { status: 429, headers });
      const dbHeaders = { Authorization: `Bearer ${await dbToken()}` };
      const [current, index] = await Promise.all([
        account(owner.uid, request.headers.get("authorization")!.slice(7)),
        fetch(ownerPath(owner.uid), { headers: dbHeaders, signal: AbortSignal.timeout(10000) }),
      ]);
      if (!current || current.disabled) return new Response("{}", { status: 403, headers });
      if (!index.ok) throw new Error("owner-read");
      const entry = (await index.json()) as { id?: string; name?: string } | null;
      let linked = false;
      if (entry?.id && /^\d{17,20}$/.test(entry.id)) {
        const response = await fetch(`${config.databaseUrl}/privateAuthDiscord/${entry.id}.json`, {
          headers: dbHeaders,
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("identity-read");
        const saved = (await response.json()) as { uid?: string; ready?: boolean } | null;
        linked = saved?.uid === owner.uid && saved.ready === true;
      }
      return new Response(
        JSON.stringify({
          password: hasPassword(current),
          google: current.providerUserInfo?.some((p) => p.providerId === "google.com") === true,
          discord: {
            linked,
            ...(linked && typeof entry?.name === "string" ? { name: entry.name.slice(0, 80) } : {}),
          },
        }),
        { status: 200, headers },
      );
    }
    if (step === "recent") {
      if (
        !(await checkRateLimit(rateStore, "room-limits", `auth-recent:${owner.uid}`, 10, 3600)) ||
        !(await checkRateLimit(rateStore, "room-limits", "auth-recent:global", 2000, 86400))
      )
        return new Response("{}", { status: 429, headers });
      const current = await account(owner.uid);
      const claims = decodeJwt(request.headers.get("authorization")!.slice(7));
      const authenticatedAt = claims["auth_time"];
      const now = Date.now() / 1000;
      return new Response(
        JSON.stringify({
          recent:
            !!current &&
            !current.disabled &&
            typeof authenticatedAt === "number" &&
            authenticatedAt <= now &&
            now - authenticatedAt < 240,
        }),
        { status: 200, headers },
      );
    }
    if (
      !(await checkRateLimit(rateStore, "room-limits", `auth-cleanup:${owner.uid}`, 5, 3600)) ||
      !(await checkRateLimit(rateStore, "room-limits", "auth-cleanup:global", 1000, 86400))
    )
      return new Response("{}", { status: 429, headers });
    if (await account(owner.uid)) return new Response("{}", { status: 403, headers });
    const dbHeaders = { Authorization: `Bearer ${await dbToken()}` };
    const index = await fetch(ownerPath(owner.uid), {
      headers: dbHeaders,
      signal: AbortSignal.timeout(10000),
    });
    if (!index.ok) throw new Error("owner-read");
    const entry = (await index.json()) as { id?: string } | null;
    if (entry?.id && /^\d{17,20}$/.test(entry.id)) {
      const path = `${config.databaseUrl}/privateAuthDiscord/${entry.id}.json`;
      const response = await fetch(path, {
        headers: { ...dbHeaders, "X-Firebase-ETag": "true" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("identity-read");
      const saved = (await response.json()) as { uid?: string } | null;
      if (saved?.uid === owner.uid) {
        const version = response.headers.get("etag");
        if (!version) throw new Error("identity-version");
        const removed = await fetch(path, {
          method: "DELETE",
          headers: { ...dbHeaders, "if-match": version },
          signal: AbortSignal.timeout(10000),
        });
        if (!removed.ok) throw new Error("identity-delete");
      }
    }
    const removed = await fetch(ownerPath(owner.uid), {
      method: "DELETE",
      headers: dbHeaders,
      signal: AbortSignal.timeout(10000),
    });
    if (!removed.ok) throw new Error("owner-delete");
    return new Response("{}", { status: 200, headers });
  } catch {
    return new Response("{}", { status: 503, headers });
  }
}
