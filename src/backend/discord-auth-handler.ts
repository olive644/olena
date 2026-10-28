import { createHash, randomBytes } from "node:crypto";
import type { KvStore } from "./kv-store.js";
import { clientAddress } from "./client-address.js";
import { checkRateLimit } from "./rate-limit.js";

export type DiscordIdentity = { id: string; name: string };
type AuthRecord = { binding: string; uid?: string; linked?: boolean; verifier?: string };
type Dependencies = {
  clientId: string;
  clientSecret: string;
  origin: string;
  allowedOrigins: readonly string[];
  store: KvStore;
  fetchImpl?: typeof fetch;
  identify: (request: Request) => Promise<{ uid: string; authTime?: number } | undefined>;
  now?: () => number;
  resolve: (profile: DiscordIdentity, linkUid?: string) => Promise<string>;
  mint: (uid: string) => Promise<string>;
};
const COOKIE = "__Host-olena_discord_oauth";
// Vincular um método dá acesso permanente à conta, então exige o mesmo login recente da desvinculação.
const RECENT_LOGIN_SECONDS = 240;
const nonce = () => randomBytes(32).toString("base64url");
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const isNonce = (value: string | null): value is string =>
  !!value && /^[A-Za-z0-9_-]{43}$/.test(value);

export function createDiscordAuthHandler(deps: Dependencies) {
  const fetcher = deps.fetchImpl ?? fetch;
  const clock = deps.now ?? Date.now;
  const configured = !!deps.clientId && !!deps.clientSecret && /^https:\/\//.test(deps.origin);
  const callback = `${deps.origin}/api/olena?action=account-auth&step=callback`;
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, "Content-Type": "application/json", ...extra },
    });
  const cookie = (value: string, maxAge = 600) =>
    `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  async function consume(key: string, binding: string): Promise<AuthRecord | undefined> {
    const entry = await deps.store.readVersion!(key);
    if (!entry.value || entry.value === "used") return undefined;
    const record: AuthRecord = JSON.parse(entry.value);
    if (record.binding !== binding) return undefined;
    return (await deps.store.compareAndSet!(key, "used", 600, entry.version)) ? record : undefined;
  }
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const step = url.searchParams.get("step");
    if (request.method === "GET" && step === "status") return json(200, { discord: configured });
    if (!configured) return json(503, { error: "provider-unavailable" });
    if (request.method !== (step === "callback" ? "GET" : "POST"))
      return json(405, { error: "method" });
    if (step !== "callback" && !deps.allowedOrigins.includes(request.headers.get("origin") ?? ""))
      return json(403, { error: "origin" });
    const cookieValue =
      request.headers
        .get("cookie")
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${COOKIE}=`))
        ?.slice(COOKIE.length + 1) ?? "";
    try {
      // O limite por endereço conta só o início de cada login: o retorno e a troca dependem de um
      // estado aleatório de uso único criado ali. Contar os três passos fazia uma turma inteira
      // atrás do mesmo IP esgotar o limite depois de poucos logins. O teto global vale para todos.
      const address = clientAddress(request);
      if (
        (step === "start" &&
          address !== undefined &&
          !(await checkRateLimit(deps.store, "room-limits", `account-auth:${address}`, 60, 600))) ||
        !(await checkRateLimit(deps.store, "room-limits", "account-auth:global", 2000, 86400))
      )
        return json(429, { error: "rate-limit" });
      if (step === "start") {
        if (url.origin !== deps.origin) return json(503, { error: "canonical-origin-required" });
        const identity = request.headers.has("authorization")
          ? await deps.identify(request)
          : undefined;
        if (request.headers.has("authorization") && !identity)
          return json(401, { error: "identity" });
        if (
          identity &&
          !(
            typeof identity.authTime === "number" &&
            identity.authTime <= clock() / 1000 &&
            clock() / 1000 - identity.authTime < RECENT_LOGIN_SECONDS
          )
        )
          return json(401, { error: "recent-login" });
        const state = nonce();
        const secret = nonce();
        const verifier = nonce();
        await deps.store.set(
          `room-limits/oauth-state-${digest(state)}`,
          JSON.stringify({
            binding: digest(secret),
            verifier,
            ...(identity ? { uid: identity.uid } : {}),
          }),
          600,
        );
        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.search = new URLSearchParams({
          client_id: deps.clientId,
          response_type: "code",
          scope: "identify",
          redirect_uri: callback,
          state,
          prompt: "consent",
          code_challenge: createHash("sha256").update(verifier).digest("base64url"),
          code_challenge_method: "S256",
        }).toString();
        return json(200, { url: authorize.toString() }, { "Set-Cookie": cookie(secret) });
      }
      if (!isNonce(cookieValue)) return json(403, { error: "session" });
      if (step === "callback") {
        const state = url.searchParams.get("state");
        if (!isNonce(state)) return json(403, { error: "state" });
        const record = await consume(
          `room-limits/oauth-state-${digest(state)}`,
          digest(cookieValue),
        );
        if (!record) return json(403, { error: "state" });
        const failure = () =>
          new Response(null, {
            status: 303,
            headers: {
              ...headers,
              Location: `${deps.origin}/?login=1&authError=discord`,
              "Set-Cookie": cookie("", 0),
            },
          });
        if (url.searchParams.has("error")) return failure();
        const code = url.searchParams.get("code");
        if (
          !code ||
          code.length > 2048 ||
          !isNonce(record.verifier ?? null) ||
          url.searchParams.get("iss") !== "https://discord.com"
        )
          return failure();
        const response = await fetcher("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: deps.clientId,
            client_secret: deps.clientSecret,
            code_verifier: record.verifier!,
            grant_type: "authorization_code",
            code,
            redirect_uri: callback,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return failure();
        const token: unknown = await response.json();
        if (
          !token ||
          typeof token !== "object" ||
          !("access_token" in token) ||
          typeof token.access_token !== "string" ||
          !("token_type" in token) ||
          String(token.token_type).toLowerCase() !== "bearer"
        )
          return failure();
        const profileResponse = await fetcher("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${token.access_token}` },
          signal: AbortSignal.timeout(10000),
        });
        if (!profileResponse.ok) return failure();
        const profile: unknown = await profileResponse.json();
        if (
          !profile ||
          typeof profile !== "object" ||
          !("id" in profile) ||
          typeof profile.id !== "string" ||
          !/^\d{17,20}$/.test(profile.id) ||
          !("username" in profile) ||
          typeof profile.username !== "string"
        )
          return failure();
        const uid = await deps.resolve(
          { id: profile.id, name: profile.username.slice(0, 80) },
          record.uid,
        );
        const exchange = nonce();
        await deps.store.set(
          `room-limits/oauth-exchange-${digest(exchange)}`,
          JSON.stringify({ binding: record.binding, uid, linked: !!record.uid }),
          60,
        );
        return new Response(null, {
          status: 303,
          headers: { ...headers, Location: `${deps.origin}/?login=1&discord=${exchange}` },
        });
      }
      if (step === "exchange") {
        // A requisição só transporta o código descartável, nunca o token do Discord.
        const code = url.searchParams.get("code");
        if (!isNonce(code)) return json(400, { error: "code" });
        const record = await consume(
          `room-limits/oauth-exchange-${digest(code)}`,
          digest(cookieValue),
        );
        if (!record?.uid) return json(403, { error: "code" });
        return json(
          200,
          { token: await deps.mint(record.uid), linked: record.linked === true },
          { "Set-Cookie": cookie("", 0) },
        );
      }
      return json(400, { error: "step" });
    } catch {
      return json(503, { error: "authentication-unavailable" });
    }
  };
}
