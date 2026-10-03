import { useEffect, useState } from "react";
import { recordRoomXp } from "../data/room-xp";
import type { RoomXpReward } from "../domain/local-room";
import { RoomPointsIcon } from "./room-paper-icons";
export function RoomRewardNotice({ reward }: { reward: RoomXpReward | undefined }) {
  const [notice, setNotice] = useState("");
  const id = reward?.id,
    place = reward?.place,
    xp = reward?.xp,
    completedAt = reward?.completedAt;
  useEffect(() => {
    if (!id || place === undefined || xp === undefined || completedAt === undefined) return;
    const timer = window.setTimeout(() => {
      try {
        const result = recordRoomXp({ id, place, xp, completedAt });
        if (result.added)
          setNotice(
            xp > 0
              ? `+${xp} XP pelo ${place}º lugar!`
              : "Participe das respostas na próxima atividade para conquistar XP.",
          );
      } catch {
        setNotice(
          "Não foi possível salvar seu XP neste dispositivo. Reabra o resultado para tentar novamente.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, place, xp, completedAt]);
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
        ×
      </button>
      <span className="room-reward-notice__countdown" aria-hidden="true" />
    </aside>
  ) : null;
}
