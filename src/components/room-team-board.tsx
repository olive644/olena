import { useState, type PointerEvent } from "react";
import "./room-team-board.css";
import {
  ROOM_TEAMS,
  ROOM_TEAM_LABELS,
  sanitizeRoomAvatar,
  type LocalRoomParticipant,
  type RoomTeam,
} from "../domain/local-room";
import { PaperMoonMark } from "./paper-moon-mark";
import { PaperDigits } from "./paper-digits";

export function RoomTeamBoard({
  participants,
  isHost,
  participantId,
  onAssign,
}: {
  participants: readonly LocalRoomParticipant[];
  isHost: boolean;
  participantId: string;
  onAssign(id: string, team: RoomTeam): Promise<boolean>;
}) {
  const [moving, setMoving] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<RoomTeam | null>(null);
  const [status, setStatus] = useState("");
  async function move(id: string, team: RoomTeam) {
    if (moving) return;
    setMoving(id);
    try {
      if (await onAssign(id, team))
        setStatus(
          `${participants.find((p) => p.id === id)?.displayName ?? "Participante"} no ${ROOM_TEAM_LABELS[team]}.`,
        );
    } finally {
      setMoving(null);
    }
  }
  function teamAt(event: PointerEvent): RoomTeam | null {
    const value = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-room-team]")?.dataset["roomTeam"];
    return ROOM_TEAMS.find((team) => team === value) ?? null;
  }
  return (
    <section className="room-team-board" aria-label="Organizar equipes">
      <h3>{isHost ? "Organize as equipes" : "Escolha sua equipe"}</h3>
      <p>
        {isHost
          ? "Arraste pelo puxador ou use os botões para mudar uma pessoa de lado."
          : "Você pode mudar de lado antes de a atividade começar."}
      </p>
      <div className="room-team-board__sides">
        {ROOM_TEAMS.map((team) => (
          <section
            key={team}
            data-room-team={team}
            className={`room-team-board__side room-team-board__side--${team === "Roxo" ? "purple" : "yellow"}${target === team ? " is-target" : ""}`}
            aria-label={ROOM_TEAM_LABELS[team]}
          >
            <h4>
              <PaperMoonMark
                compact
                motif={team === "Roxo" ? "moon" : "sun"}
                className="room-side-icon"
              />
              {ROOM_TEAM_LABELS[team]}{" "}
              <span>
                <PaperDigits value={String(participants.filter((p) => p.team === team).length)} />
              </span>
            </h4>
            {!isHost && (
              <button
                type="button"
                className="secondary-button"
                disabled={
                  moving !== null || participants.find((p) => p.id === participantId)?.team === team
                }
                onClick={() => void move(participantId, team)}
              >
                Entrar no {ROOM_TEAM_LABELS[team]}
              </button>
            )}
            <ul>
              {participants
                .filter((p) => p.team === team)
                .map((participant) => (
                  <li
                    key={participant.id}
                    className={dragging === participant.id ? "is-dragging" : ""}
                  >
                    <img
                      src={
                        sanitizeRoomAvatar(participant.avatarUrl) ?? "/profile-avatars/helena.webp"
                      }
                      alt=""
                      width="32"
                      height="32"
                    />
                    <strong>
                      {participant.displayName}
                      {participant.id === participantId ? " (você)" : ""}
                    </strong>
                    {isHost && (
                      <>
                        <button
                          type="button"
                          className="secondary-button room-team-board__grip"
                          disabled={moving !== null}
                          aria-label={`Arrastar ${participant.displayName}`}
                          onPointerDown={(event) => {
                            if (event.button !== 0) return;
                            event.currentTarget.setPointerCapture(event.pointerId);
                            setDragging(participant.id);
                          }}
                          onPointerMove={(event) => {
                            if (dragging === participant.id) setTarget(teamAt(event));
                          }}
                          onPointerUp={(event) => {
                            if (dragging !== participant.id) return;
                            const nextTeam = teamAt(event);
                            setDragging(null);
                            setTarget(null);
                            if (nextTeam && nextTeam !== team) void move(participant.id, nextTeam);
                          }}
                          onPointerCancel={() => {
                            setDragging(null);
                            setTarget(null);
                          }}
                        >
                          <span aria-hidden="true">⠿</span>
                        </button>
                        <button
                          type="button"
                          className="secondary-button room-team-board__move"
                          disabled={moving !== null}
                          aria-label={`Mover ${participant.displayName} para ${ROOM_TEAM_LABELS[team === "Roxo" ? "Amarelo" : "Roxo"]}`}
                          onClick={() =>
                            void move(participant.id, team === "Roxo" ? "Amarelo" : "Roxo")
                          }
                        >
                          Mudar de lado
                        </button>
                      </>
                    )}
                  </li>
                ))}
            </ul>
            {participants.every((p) => p.team !== team) && <p>Aguardando participantes</p>}
          </section>
        ))}
      </div>
      <p role="status" className="room-team-board__status">
        {status}
      </p>
    </section>
  );
}
