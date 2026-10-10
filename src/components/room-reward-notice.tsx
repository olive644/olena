import { useEffect, useState } from "react";
import { recordRoomXp } from "../data/room-xp";
import type { RoomXpReward } from "../domain/local-room";
import { RoomPointsIcon } from "./room-paper-icons";
import { PaperCloseIcon } from "./paper-close-icon";
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
  const [notice, setNotice] = useState("");
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
                ? `+${xp} XP pela prática de Matemática!`
                : "+0 XP desta vez. Vamos tentar de novo!"
              : xp > 0
                ? bingo
                  ? `+${xp} XP pela vitória no Bingo!`
                  : `+${xp} XP pelo ${place}º lugar!`
                : "Participe das respostas na próxima atividade para conquistar XP.";
          if (delayMs > 0) displayTimer = window.setTimeout(() => setNotice(message), delayMs);
          else setNotice(message);
        }
      } catch {
        setNotice(
          "Não foi possível salvar seu XP neste dispositivo. Reabra o resultado para tentar novamente.",
        );
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
  return notice ? (
    <aside className="room-reward-notice" role="status">
      <RoomPointsIcon xp />
      <p>{notice}</p>
      <button
        type="button"
        className="secondary-button"
        aria-label="Fechar notificação de XP"
        onClick={() => setNotice("")}
      >
        <PaperCloseIcon />
      </button>
      <span className="room-reward-notice__countdown" aria-hidden="true" />
    </aside>
  ) : null;
}
