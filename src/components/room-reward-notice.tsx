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
              ? `Você ganhou ${xp} XP pelo ${place}º lugar! Acumulado neste dispositivo: ${result.total} XP.`
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
  return notice ? (
    <aside className="room-reward-notice" role="status">
      <RoomPointsIcon />
      <p>{notice}</p>
      <button
        type="button"
        className="secondary-button"
        aria-label="Fechar notificação de XP"
        onClick={() => setNotice("")}
      >
        Fechar
      </button>
    </aside>
  ) : null;
}
