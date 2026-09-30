import {
  isValidLocalRoomCode,
  localRoomStorageKey,
  normalizeLocalRoomCode,
} from "../domain/local-room.js";
import type { LocalRoomState } from "../domain/local-room.js";
import type { KvStore } from "./kv-store.js";
import { safeEqual } from "./secure-compare.js";

export function createRoomAudioAuthorizer(store: Pick<KvStore, "get">, now = Date.now) {
  return async (code: string, credential: string, text: string): Promise<boolean> => {
    const normalizedCode = normalizeLocalRoomCode(code);
    if (!isValidLocalRoomCode(normalizedCode) || !credential) return false;
    const raw = await store.get(localRoomStorageKey(normalizedCode));
    if (!raw) return false;
    let room: LocalRoomState;
    try {
      room = JSON.parse(raw) as LocalRoomState;
    } catch {
      return false;
    }
    if (
      room.code !== normalizedCode ||
      room.phase !== "playing" ||
      room.deck[room.questionIndex]?.front !== text.trim() ||
      (room.expiresAt !== undefined && room.expiresAt <= now())
    )
      return false;
    return (
      safeEqual(room.hostToken, credential) ||
      room.participants.some((participant) => safeEqual(participant.token, credential))
    );
  };
}
