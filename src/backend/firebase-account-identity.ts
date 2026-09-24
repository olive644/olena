import { decodeProtectedHeader, importX509, jwtVerify } from "jose";

const CERTIFICATES_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
type PublicKey = Awaited<ReturnType<typeof importX509>>;
let cached: { expiresAt: number; keys: Map<string, PublicKey> } | undefined;

async function publicKeys(): Promise<Map<string, PublicKey>> {
  if (cached && cached.expiresAt > Date.now()) return cached.keys;
  const response = await fetch(CERTIFICATES_URL);
  if (!response.ok) throw new Error("Firebase certificates unavailable");
  const certificates = (await response.json()) as Record<string, string>;
  const keys = new Map<string, PublicKey>();
  for (const [kid, certificate] of Object.entries(certificates)) {
    keys.set(kid, await importX509(certificate, "RS256"));
  }
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 300);
  cached = { keys, expiresAt: Date.now() + Math.max(60, maxAge) * 1000 };
  return keys;
}

export function createFirebaseAccountIdentity(projectId: string) {
  return async (request: Request): Promise<{ uid: string; name: string } | undefined> => {
    const authorization = request.headers.get("authorization");
    if (!projectId || !authorization?.startsWith("Bearer ")) return undefined;
    const token = authorization.slice(7);
    try {
      const kid = decodeProtectedHeader(token).kid;
      const key = kid ? (await publicKeys()).get(kid) : undefined;
      if (!key) return undefined;
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["RS256"],
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        requiredClaims: ["exp", "iat", "iss", "aud", "sub", "auth_time"],
      });
      if (
        !payload.sub ||
        typeof payload["auth_time"] !== "number" ||
        payload["auth_time"] > Date.now() / 1000
      )
        return undefined;
      const name =
        typeof payload["name"] === "string"
          ? payload["name"]
          : typeof payload["email"] === "string"
            ? payload["email"]
            : "";
      return name ? { uid: payload.sub, name } : undefined;
    } catch {
      return undefined;
    }
  };
}
