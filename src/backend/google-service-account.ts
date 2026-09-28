import { createSign } from "node:crypto";

export type GoogleServiceAccount = { clientEmail: string; privateKey: string };

type TokenResponse = { access_token?: string; expires_in?: number; error?: string };

type GoogleAccessToken = { token: string; expiresAt: number };

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

// Troca reimplementada do fluxo JWT Bearer do Google (o mesmo que o SDK
// Admin do Firebase faz por baixo dos panos), evitando adicionar a
// dependência pesada `firebase-admin` só para autenticar chamadas REST
// server-to-server. Roda inteiramente no backend; nunca chega ao bundle do
// navegador.
async function requestGoogleAccessToken(
  account: GoogleServiceAccount,
  scopes: readonly string[],
  fetchImpl: typeof fetch = fetch,
  now: number,
): Promise<GoogleAccessToken> {
  const issuedAt = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(account.privateKey, "base64url");
  const assertion = `${signingInput}.${signature}`;

  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Falha ao autenticar a conta de serviço do Google: ${payload.error ?? response.status}`,
    );
  }
  return {
    token: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 3600) * 1000,
  };
}

export async function getGoogleAccessToken(
  account: GoogleServiceAccount,
  scopes: readonly string[],
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<string> {
  return (await requestGoogleAccessToken(account, scopes, fetchImpl, now)).token;
}

/** Reuses a service-account token across Firebase REST calls in one warm function instance. */
export function createGoogleAccessTokenProvider(
  account: GoogleServiceAccount,
  scopes: readonly string[],
  fetchImpl: typeof fetch = fetch,
  now: () => number = () => Date.now(),
): () => Promise<string> {
  let cached: GoogleAccessToken | undefined;
  let pending: Promise<string> | undefined;

  return async () => {
    const time = now();
    if (cached && time < cached.expiresAt - 60_000) return cached.token;
    if (pending) return pending;

    pending = requestGoogleAccessToken(account, scopes, fetchImpl, time)
      .then(({ token, expiresAt }) => {
        cached = { token, expiresAt };
        return token;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}
