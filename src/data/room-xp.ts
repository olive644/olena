import { uiText } from "../i18n/runtime.js";
import type { RoomXpReward } from "../domain/local-room";
export const ROOM_XP_KEY = "helena.room-xp.v1";
export const ROOM_XP_CHANGED = "helena:room-xp-change";

export function readRoomXp(): number {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(ROOM_XP_KEY) ?? "null");
    if (
      value &&
      typeof value === "object" &&
      "total" in value &&
      typeof value.total === "number" &&
      Number.isSafeInteger(value.total) &&
      value.total >= 0
    )
      return value.total;
  } catch {
    /* Cache inválido não concede XP. */
  }
  return 0;
}
type Ledger = { total: number; receipts: string[] };
export function recordRoomXp(
  reward: RoomXpReward,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): { added: boolean; total: number } {
  const saved: unknown = JSON.parse(storage.getItem(ROOM_XP_KEY) ?? "null");
  const valid = saved as Partial<Ledger> | null;
  if (
    saved !== null &&
    (!valid ||
      typeof valid.total !== "number" ||
      !Number.isSafeInteger(valid.total) ||
      valid.total < 0 ||
      !Array.isArray(valid.receipts) ||
      !valid.receipts.every((id) => typeof id === "string"))
  )
    throw new Error(uiText("Histórico de XP inválido."));
  const ledger: Ledger = valid
    ? { total: valid.total!, receipts: valid.receipts! }
    : { total: 0, receipts: [] };
  if (ledger.receipts.includes(reward.id)) return { added: false, total: ledger.total };
  if (
    !reward.id ||
    !Number.isSafeInteger(reward.xp) ||
    reward.xp < 0 ||
    reward.xp > 10000 ||
    !Number.isSafeInteger(reward.place) ||
    reward.place < 1
  )
    throw new Error(uiText("Recompensa inválida."));
  const total = ledger.total + reward.xp;
  if (!Number.isSafeInteger(total)) throw new Error(uiText("Total de XP inválido."));
  storage.setItem(
    ROOM_XP_KEY,
    JSON.stringify({ total, receipts: [...ledger.receipts, reward.id] }),
  );
  if (typeof window !== "undefined" && storage === window.localStorage)
    window.dispatchEvent(new Event(ROOM_XP_CHANGED));
  return { added: true, total };
}
