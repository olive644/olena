import { useEffect, useRef } from "react";
import type { PublicLocalRoomState } from "../domain/local-room";
import { RoomConfetti } from "./room-paper-icons";
import { RoomRewardNotice } from "./room-reward-notice";
import { playBingoClaimSound } from "../data/room-feedback-sound";
import "./number-bingo.css";

export function BingoWinners({
  state,
  participantId,
}: {
  state: PublicLocalRoomState;
  participantId: string;
}) {
  const played = useRef(false);
  useEffect(() => {
    if (!played.current) {
      played.current = true;
      playBingoClaimSound();
    }
  }, []);
  const winners = state.participants.filter((p) => state.bingoWinnerIds?.includes(p.id));
  return (
    <section className="bingo-winners" aria-label="Ganhadores do bingo">
      <RoomConfetti />
      <img
        className="bingo-winners-mascot"
        src="/profile-avatars/poliana.webp"
        alt="Poliana celebrando"
        width="96"
        height="96"
      />
      <h2>{winners.length === 1 ? "Bingo tem ganhador!" : "Bingo tem ganhadores!"}</h2>
      <div className="bingo-winners-grid">
        {winners.map((p) => (
          <article key={p.id} className="bingo-winner">
            <img
              src={p.avatarUrl ?? "/profile-avatars/poliana.webp"}
              alt=""
              width="64"
              height="64"
            />
            <h3>{p.displayName}</h3>
            <strong>+{p.reward?.xp ?? 0} XP</strong>
            <img src="/room-icons/bingo-finish.svg" alt="" width="40" height="40" />
          </article>
        ))}
      </div>
      <RoomRewardNotice
        bingo
        reward={state.participants.find((p) => p.id === participantId)?.reward}
      />
    </section>
  );
}
