import { createRemoteJWKSet, jwtVerify } from "jose";
import type { KvStore } from "./kv-store.js";
import { checkRateLimit } from "./rate-limit.js";

const keys = createRemoteJWKSet(new URL("https://firebaseappcheck.googleapis.com/v1/jwks"));
export function createRoomGuard(
  store: KvStore,
  projectNumber: string,
  appId: string,
  enforce: boolean,
  observe: (event: {
    action: string;
    enforced: boolean;
    result: string;
    status: number;
  }) => void = () => {},
) {
  return async (request: Request): Promise<Response | undefined> => {
    const url = new URL(request.url);
    const requestedAction =
      url.pathname === "/api/speech" ? "speech" : url.searchParams.get("action");
    const action = [
      "create",
      "join",
      "resume",
      "heartbeat",
      "leave",
      "settings",
      "team",
      "host-player",
      "start",
      "answer",
      "next",
      "bingo-review",
      "bingo-finalize",
      "end",
      "kick",
      "lock",
      "repeat",
      "lobby",
      "update",
      "cursor",
      "view-create",
      "view-read",
      "speech",
      "upload",
      "play",
    ].includes(requestedAction ?? "")
      ? requestedAction!
      : "unknown";
    const log = (result: string, status: number) =>
      observe({ action, enforced: enforce, result, status });
    const reject = (status: number, error: string) =>
      new Response(JSON.stringify({ error }), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...(status === 429 ? { "Retry-After": "60" } : {}),
        },
      });
    let verification = "valid";
    const token = request.headers.get("X-Firebase-AppCheck");
    if (!projectNumber || !appId) verification = "misconfigured";
    else if (!token) verification = "missing";
    else {
      try {
        await jwtVerify(token, keys, {
          algorithms: ["RS256"],
          issuer: `https://firebaseappcheck.googleapis.com/${projectNumber}`,
          audience: `projects/${projectNumber}`,
          subject: appId,
          requiredClaims: ["exp", "iat", "iss", "aud", "sub"],
        });
      } catch {
        verification = "invalid";
      }
    }
    const blockedStatus = verification === "misconfigured" ? 503 : 403;
    log(verification, enforce && verification !== "valid" ? blockedStatus : 200);
    if (enforce && verification !== "valid") {
      return reject(
        blockedStatus,
        verification === "misconfigured"
          ? "A proteção da sala está sendo configurada."
          : "Reabra o aplicativo para verificar este dispositivo.",
      );
    }
    // Vercel supplies this header. Never use a caller-controlled id as the only abuse boundary.
    const address =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limit =
      action === "create" || action === "view-create"
        ? 6
        : action === "upload"
          ? 30
          : action === "join" || action === "view-read"
            ? 90
            : action === "heartbeat"
              ? 2400
              : 600;
    const allowed = await checkRateLimit(store, "room-limits", `${address}:${action}`, limit, 60);
    if (!allowed) {
      log("rate_limited", 429);
      return reject(429, "Muitas tentativas. Aguarde um minuto e tente novamente.");
    }
    if (action === "heartbeat") {
      const payload: unknown = await request
        .clone()
        .json()
        .catch(() => undefined);
      if (
        payload &&
        typeof payload === "object" &&
        "credential" in payload &&
        typeof payload.credential === "string"
      ) {
        // A chave é hash pelo rate limiter. Não grava a credencial em claro.
        const perDevice = await checkRateLimit(
          store,
          "room-limits",
          `heartbeat-device:${address}:${payload.credential}`,
          90,
          60,
        );
        if (!perDevice) {
          log("rate_limited", 429);
          return reject(429, "Muitas tentativas. Aguarde um minuto e tente novamente.");
        }
      }
    }
    return undefined;
  };
}
