import { randomUUID } from "node:crypto";
import {
  isValidLocalRoomCode,
  localRoomStorageKey,
  normalizeLocalRoomCode,
} from "../domain/local-room.js";
import type { LocalRoomState } from "../domain/local-room.js";
import type { KvStore } from "./kv-store.js";
import { safeEqual } from "./secure-compare.js";

const MAX_AUDIO_BYTES = 256_000;
const MAX_RECORDINGS = 60;
const MAX_REQUEST_BYTES = 360_000;
const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]);

type StoredRecording = { contentType: string; audio: string };

type Dependencies = {
  store: KvStore;
  guard?(request: Request): Promise<Response | undefined>;
  now?(): number;
  randomId?(): string;
};

function json(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function recordingKey(code: string, id: string): string {
  return `room-recordings/${code}-${id}`;
}

function matchesAudioType(bytes: Buffer, type: string): boolean {
  if (type === "audio/webm") return bytes.subarray(0, 4).toString("hex") === "1a45dfa3";
  if (type === "audio/ogg") return bytes.subarray(0, 4).toString() === "OggS";
  if (type === "audio/mp4") return bytes.subarray(4, 8).toString() === "ftyp";
  if (type === "audio/wav")
    return (
      bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WAVE"
    );
  return (
    bytes.subarray(0, 3).toString() === "ID3" || (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0)
  );
}

export function createRoomRecordingHandler({
  store,
  guard,
  now = Date.now,
  randomId = randomUUID,
}: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return json(405, "Método inválido.");
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      return json(403, "Origem não permitida.");
    if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES)
      return json(413, "A gravação é grande demais.");
    const blocked = await guard?.(request);
    if (blocked) return blocked;
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_BYTES) return json(413, "A gravação é grande demais.");
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return json(400, "Pedido inválido.");
      body = parsed as Record<string, unknown>;
    } catch {
      return json(400, "Pedido inválido.");
    }
    const code = typeof body["code"] === "string" ? normalizeLocalRoomCode(body["code"]) : "";
    const credential = typeof body["credential"] === "string" ? body["credential"] : "";
    if (!isValidLocalRoomCode(code) || !credential)
      return json(400, "Sala ou credencial inválida.");
    const roomRaw = await store.get(localRoomStorageKey(code));
    if (!roomRaw) return json(404, "Sala não encontrada.");
    const room = JSON.parse(roomRaw) as LocalRoomState;
    if (room.expiresAt !== undefined && room.expiresAt <= now())
      return json(404, "Sala não encontrada.");
    const isHost = safeEqual(room.hostToken, credential);
    const isParticipant = room.participants.some((person) => safeEqual(person.token, credential));
    if (!isHost && !isParticipant) return json(403, "Não autorizado.");

    const action = new URL(request.url).searchParams.get("action");
    if (action === "upload") {
      if (!isHost) return json(403, "Só o professor pode guardar gravações.");
      if (room.phase !== "lobby") return json(409, "Gravações só podem mudar antes da rodada.");
      const type = body["contentType"];
      const base64 = body["audio"];
      if (
        typeof type !== "string" ||
        !AUDIO_TYPES.has(type) ||
        typeof base64 !== "string" ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
      )
        return json(400, "Formato de áudio inválido.");
      const bytes = Buffer.from(base64, "base64");
      if (!bytes.length || bytes.length > MAX_AUDIO_BYTES)
        return json(413, "Use uma gravação de até 256 KB.");
      if (!matchesAudioType(bytes, type))
        return json(400, "O arquivo não corresponde ao formato informado.");
      if ((room.recordingIds?.length ?? 0) >= MAX_RECORDINGS)
        return json(409, "Esta sala atingiu o limite de gravações.");
      if (!store.readVersion || !store.compareAndSet) return json(503, "Gravações indisponíveis.");
      const id = randomId();
      if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) return json(503, "Não foi possível criar a gravação.");
      const ttl = Math.max(1, Math.ceil(((room.expiresAt ?? now()) - now()) / 1000));
      await store.set(
        recordingKey(code, id),
        JSON.stringify({ contentType: type, audio: base64 } satisfies StoredRecording),
        ttl,
      );
      for (let attempt = 0; attempt < 8; attempt++) {
        const snapshot = await store.readVersion(localRoomStorageKey(code));
        if (!snapshot.value) break;
        const current = JSON.parse(snapshot.value) as LocalRoomState;
        if (current.phase !== "lobby" || (current.recordingIds?.length ?? 0) >= MAX_RECORDINGS)
          break;
        const updated = { ...current, recordingIds: [...(current.recordingIds ?? []), id] };
        if (
          await store.compareAndSet(
            localRoomStorageKey(code),
            JSON.stringify(updated),
            ttl,
            snapshot.version,
          )
        )
          return new Response(JSON.stringify({ audioId: id }), {
            status: 201,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
      }
      await store.del(recordingKey(code, id));
      return json(409, "A sala mudou. Tente guardar novamente.");
    }

    if (action === "play") {
      const questionIndex = body["questionIndex"];
      if (
        !Number.isInteger(questionIndex) ||
        typeof questionIndex !== "number" ||
        questionIndex < 0
      )
        return json(400, "Pergunta inválida.");
      if (room.phase !== "playing" && room.phase !== "results")
        return json(409, "A rodada ainda não começou.");
      if (room.phase === "playing" && room.questionStartedAt > now())
        return json(409, "A pergunta ainda não começou.");
      if (questionIndex !== room.questionIndex) return json(409, "Esta pergunta não está ativa.");
      const id = room.deck[questionIndex]?.audioId;
      if (!id || !room.recordingIds?.includes(id))
        return json(404, "Esta pergunta não tem gravação.");
      const stored = await store.get(recordingKey(code, id));
      if (!stored) return json(404, "Gravação indisponível.");
      const recording = JSON.parse(stored) as StoredRecording;
      return new Response(Buffer.from(recording.audio, "base64"), {
        headers: {
          "Content-Type": recording.contentType,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return json(404, "Ação desconhecida.");
  };
}
