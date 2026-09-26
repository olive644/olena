import { getGoogleAccessToken, type GoogleServiceAccount } from "./google-service-account.js";
import type { KvStore } from "./kv-store.js";

const SCOPES = [
  "https://www.googleapis.com/auth/firebase.database",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type FirebaseRealtimeConfig = {
  databaseUrl: string;
  serviceAccount: GoogleServiceAccount;
};

type StoredEnvelope = { value: string; expiresAt: number };

// Guarda um envelope { value, expiresAt } porque o Realtime Database não tem
// expiração nativa de chave (ao contrário do Redis EX): a expiração é
// conferida na leitura, e a chave é apagada se já venceu.
export function createFirebaseRealtimeStore(
  config: FirebaseRealtimeConfig,
  fetchImpl: typeof fetch = fetch,
  now: () => number = () => Date.now(),
): KvStore {
  async function authorizedFetch(path: string, init: RequestInit): Promise<Response> {
    const token = await getGoogleAccessToken(config.serviceAccount, SCOPES, fetchImpl, now());
    return fetchImpl(`${config.databaseUrl}/${path}.json`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  }

  return {
    async readVersion(key) {
      const response = await authorizedFetch(key, {
        method: "GET",
        headers: { "X-Firebase-ETag": "true" },
      });
      if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}`);
      const version = response.headers.get("etag");
      if (!version) throw new Error("Firebase não devolveu a versão do registro.");
      const payload = (await response.json()) as StoredEnvelope | null;
      return { value: payload && payload.expiresAt > now() ? payload.value : undefined, version };
    },
    async compareAndSet(key, value, ttlSeconds, version) {
      const response = await authorizedFetch(key, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "if-match": version },
        body: JSON.stringify({ value, expiresAt: now() + ttlSeconds * 1000 }),
      });
      if (response.status === 412) return false;
      if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}`);
      return true;
    },
    async get(key) {
      const response = await authorizedFetch(key, { method: "GET" });
      if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}`);
      const payload = (await response.json()) as StoredEnvelope | null;
      if (!payload) return undefined;
      if (payload.expiresAt < now()) {
        await authorizedFetch(key, { method: "DELETE" });
        return undefined;
      }
      return payload.value;
    },
    async set(key, value, ttlSeconds) {
      const envelope: StoredEnvelope = { value, expiresAt: now() + ttlSeconds * 1000 };
      const response = await authorizedFetch(key, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
      if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}`);
    },
    async del(key) {
      const response = await authorizedFetch(key, { method: "DELETE" });
      if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}`);
    },
  };
}

// Publica a projeção pública da sala num caminho separado e legível sem
// autenticação (regras do Realtime Database liberam ".read" só em
// "/rooms/$code"), para que o navegador escute atualizações via
// EventSource nativo, sem SDK e sem polling.
export function createFirebasePublicRoomPublisher(
  config: FirebaseRealtimeConfig,
  fetchImpl: typeof fetch = fetch,
  now: () => number = () => Date.now(),
) {
  return async function publish(code: string, publicState: unknown): Promise<void> {
    const token = await getGoogleAccessToken(config.serviceAccount, SCOPES, fetchImpl, now());
    const url = `${config.databaseUrl}/rooms/${code}.json`;
    for (let attempt = 0; attempt < 40; attempt++) {
      const snapshot = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, "X-Firebase-ETag": "true" },
      });
      if (!snapshot.ok) throw new Error(`Firebase respondeu HTTP ${snapshot.status}`);
      const current = (await snapshot.json()) as {
        revision?: number;
        generation?: string;
        cursors?: unknown;
      } | null;
      const next = publicState as { revision?: number; generation?: string };
      if (Number(current?.generation ?? 0) > Number(next.generation ?? 0)) return;
      if (
        current?.generation === next.generation &&
        (current?.revision ?? -1) >= (next.revision ?? 0)
      )
        return;
      const version = snapshot.headers.get("etag");
      if (!version) throw new Error("Firebase não devolveu a versão pública.");
      const response = await fetchImpl(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "if-match": version,
        },
        // Regravar a folha não pode apagar os cursores, que são escritos por outro canal.
        body: JSON.stringify(
          current?.cursors ? { ...(publicState as object), cursors: current.cursors } : publicState,
        ),
      });
      if (response.status === 412) continue;
      if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}`);
      return;
    }
    throw new Error("A sala mudou durante a publicação. Reconecte para sincronizar.");
  };
}

// Escreve (ou apaga) só o cursor de um participante em rooms/{codigo}/cursors/{id}. É uma
// gravação pequena e sem condição de versão: a última posição vence, e uma posição perdida
// é substituída pela próxima em fração de segundo.
export function createFirebaseCursorPublisher(
  config: FirebaseRealtimeConfig,
  fetchImpl: typeof fetch = fetch,
  now: () => number = () => Date.now(),
) {
  return async function publishCursor(
    code: string,
    participantId: string,
    cursor: { x: number; y: number; at: number } | null,
  ): Promise<void> {
    const token = await getGoogleAccessToken(config.serviceAccount, SCOPES, fetchImpl, now());
    const response = await fetchImpl(
      `${config.databaseUrl}/rooms/${code}/cursors/${participantId}.json`,
      {
        method: cursor ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        ...(cursor ? { body: JSON.stringify(cursor) } : {}),
      },
    );
    if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}`);
  };
}

export function firebasePublicStreamUrl(config: FirebaseRealtimeConfig, code: string): string {
  return `${config.databaseUrl}/rooms/${code}.json`;
}
