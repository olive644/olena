import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useState } from "react";
import { recordRoomXp } from "../data/room-xp";
import type { RoomXpReward } from "../domain/local-room";
import { RoomPointsIcon } from "./room-paper-icons";
import { PaperCloseIcon } from "./paper-close-icon";
import { useNotificationPreferences } from "../data/notification-preferences";
export function RoomRewardNotice({
  reward,
  bingo = false,
  activity,
  delayMs = 0,
}: {
  reward: RoomXpReward | undefined;
  bingo?: boolean;
  activity?: "mathematics";
  delayMs?: number;
}) {
  useLanguage();

  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(false);
  const notificationPreferences = useNotificationPreferences();
  const id = reward?.id,
    place = reward?.place,
    xp = reward?.xp,
    completedAt = reward?.completedAt;
  useEffect(() => {
    if (!id || place === undefined || xp === undefined || completedAt === undefined) return;
    let displayTimer: number | undefined;
    const timer = window.setTimeout(() => {
      try {
        const result = recordRoomXp({ id, place, xp, completedAt });
        if (result.added) {
          const message =
            activity === "mathematics"
              ? xp > 0
                ? uiText(1941, [xp])
                : "+0 XP desta vez. Vamos tentar de novo!"
              : xp > 0
                ? bingo
                  ? uiText(1942, [xp])
                  : `+${xp} XP pelo ${place}º lugar!`
                : uiText(983);
          if (delayMs > 0) displayTimer = window.setTimeout(() => setNotice(message), delayMs);
          else setNotice(message);
        }
      } catch {
        setSaveError(true);
        setNotice(uiText(984));
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(displayTimer);
    };
  }, [id, place, xp, completedAt, bingo, activity, delayMs]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return notice && (notificationPreferences.rewards || saveError) ? (
    <aside className="room-reward-notice" role="status">
      <RoomPointsIcon xp />
      <p>{notice}</p>
      <button
        type="button"
        className="secondary-button"
        aria-label={uiText(985)}
        onClick={() => setNotice("")}
      >
        <PaperCloseIcon />
      </button>
      <span className="room-reward-notice__countdown" aria-hidden="true" />
    </aside>
  ) : null;
}
