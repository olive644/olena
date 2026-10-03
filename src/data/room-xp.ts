import type { RoomXpReward } from "../domain/local-room";
export const ROOM_XP_KEY = "helena.room-xp.v1";
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
    throw new Error("Histórico de XP inválido.");
  const ledger: Ledger = valid
    ? { total: valid.total!, receipts: valid.receipts! }
    : { total: 0, receipts: [] };
  if (ledger.receipts.includes(reward.id)) return { added: false, total: ledger.total };
  if (
    !reward.id ||
    !Number.isSafeInteger(reward.xp) ||
    reward.xp < 0 ||
    reward.xp > 100 ||
    !Number.isSafeInteger(reward.place) ||
    reward.place < 1
  )
    throw new Error("Recompensa inválida.");
  const total = ledger.total + reward.xp;
  if (!Number.isSafeInteger(total)) throw new Error("Total de XP inválido.");
  storage.setItem(
    ROOM_XP_KEY,
    JSON.stringify({ total, receipts: [...ledger.receipts, reward.id] }),
  );
  return { added: true, total };
}
