import { useEffect, useRef } from "react";
import type { PublicLocalRoomState } from "../domain/local-room";
import { RoomConfetti } from "./room-paper-icons";
import { RoomRewardNotice } from "./room-reward-notice";
import { playBingoClaimSound } from "../data/room-feedback-sound";
import "./number-bingo.css";
import { Podium } from "./local-room-projector";

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
  const winners = (state.bingoWinnerIds ?? [])
    .slice(0, 3)
    .flatMap((id) => state.participants.filter((p) => p.id === id));
  return (
    <section className="bingo-winners" aria-label="Ganhadores do bingo">
      <RoomConfetti />
      <h2>{winners.length === 1 ? "Bingo tem ganhador!" : "Bingo tem ganhadores!"}</h2>
      <Podium participants={winners} solar />
      <RoomRewardNotice
        bingo
        reward={state.participants.find((p) => p.id === participantId)?.reward}
      />
    </section>
  );
}
