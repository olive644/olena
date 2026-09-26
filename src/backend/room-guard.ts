import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { KvStore } from "./kv-store.js";

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
    const requestedAction = new URL(request.url).searchParams.get("action");
    const action = [
      "create",
      "join",
      "resume",
      "heartbeat",
      "leave",
      "settings",
      "start",
      "answer",
      "next",
      "end",
      "update",
      "cursor",
      "view-create",
      "view-read",
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
        : action === "join" || action === "view-read"
          ? 90
          : 600;
    const bucket = Math.floor(Date.now() / 60000);
    const key = `room-limits/${createHash("sha256").update(`${address}:${action}`).digest("hex")}`;
    for (let attempt = 0; attempt < 40; attempt++) {
      const entry = await store.readVersion!(key);
      const saved = entry.value
        ? (JSON.parse(entry.value) as { bucket: number; count: number })
        : undefined;
      const count = saved?.bucket === bucket ? saved.count : 0;
      if (count >= limit) {
        log("rate_limited", 429);
        return reject(429, "Muitas tentativas. Aguarde um minuto e tente novamente.");
      }
      if (
        await store.compareAndSet!(
          key,
          JSON.stringify({ bucket, count: count + 1 }),
          120,
          entry.version,
        )
      )
        return undefined;
    }
    log("rate_limit_contention", 429);
    return reject(429, "Muitas tentativas simultâneas. Aguarde um minuto.");
  };
}
