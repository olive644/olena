import { uiText } from "../i18n/runtime.js";
import type { RoomXpReward } from "../domain/local-room";
import { mergeXpLedgers, parseXpLedger, XP_LEDGER_KEY, type XpLedger } from "../domain/xp-ledger";
import { ACCOUNT_PROFILE_KEY, profileRecord } from "../domain/profile-progress";
import { SYNCED_STORAGE_EVENT } from "./synced-storage";
export const ROOM_XP_KEY = XP_LEDGER_KEY;
export const ROOM_XP_CHANGED = "helena:room-xp-change";

export function readRoomXp(): number {
  try {
    return (
      parseXpLedger(
        mergeXpLedgers(
          localStorage.getItem(ROOM_XP_KEY),
          JSON.stringify(profileRecord(localStorage.getItem(ACCOUNT_PROFILE_KEY))["xpLedger"]),
        ),
      )?.total ?? 0
    );
  } catch {
    /* Cache inválido não concede XP. */
  }
  return 0;
}
export function recordRoomXp(
  reward: RoomXpReward,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): { added: boolean; total: number } {
  const raw = storage.getItem(ROOM_XP_KEY);
  const profileXp =
    typeof window !== "undefined" && storage === window.localStorage
      ? JSON.stringify(profileRecord(localStorage.getItem(ACCOUNT_PROFILE_KEY))["xpLedger"])
      : undefined;
  const valid = parseXpLedger(mergeXpLedgers(raw, profileXp) ?? raw);
  if (raw !== null && !valid) throw new Error(uiText("Histórico de XP inválido."));
  const ledger: XpLedger = valid ?? {
    total: 0,
    receipts: [],
    legacy: 0,
    legacyReceipts: [],
    rewards: {},
  };
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
    JSON.stringify({
      ...ledger,
      total,
      receipts: [...ledger.receipts, reward.id],
      rewards: { ...ledger.rewards, [reward.id]: reward.xp },
    }),
  );
  if (typeof window !== "undefined" && storage === window.localStorage) {
    window.dispatchEvent(new Event(ROOM_XP_CHANGED));
    window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
  }
  return { added: true, total };
}
