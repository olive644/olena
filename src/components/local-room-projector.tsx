import {
  buildLocalRoomJoinUrl,
  rankLocalRoomParticipants,
  type LocalRoomParticipant,
  type PublicLocalRoomState,
} from "../domain/local-room";
import { NavigationIcon } from "./navigation-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import { RoomQrCode } from "./room-qr-code";
import { RoomAvatar } from "./room-avatar";
import { RoomPointsIcon, RoomTrophyFrame } from "./room-paper-icons";
import { PaperDigits } from "./paper-digits";
import { ROOM_TEAM_LABELS, type RoomTeam } from "../domain/local-room";
import "./room-stage.css";

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function Scoreboard({
  participants,
  offset = 0,
}: {
  participants: readonly LocalRoomParticipant[];
  offset?: number;
}) {
  const ranked = rankLocalRoomParticipants(participants);
  return (
    <ol className="local-room-scoreboard">
      {ranked.map((participant, index) => (
        <li key={participant.id}>
          <span className="local-room-scoreboard__rank">
            <PaperDigits value={String(participant.reward?.place ?? index + 1 + offset)} />
          </span>
          <RoomAvatar participant={participant} />
          <span>
            {participant.displayName}
            {participant.team
              ? ` · ${ROOM_TEAM_LABELS[participant.team as RoomTeam] ?? participant.team}`
              : ""}
            {participant.online === false ? " · ausente" : ""}
          </span>
          <strong>
            <PaperDigits value={String(participant.score)} /> <RoomPointsIcon />
            <span className="visually-hidden"> pontos</span>
          </strong>
        </li>
      ))}
    </ol>
  );
}

export function Podium({ participants }: { participants: readonly LocalRoomParticipant[] }) {
  const ranked = rankLocalRoomParticipants(participants);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  return (
    <>
      <ol className="local-room-podium">
        {top3.map((participant, index) => (
          <li
            className={`local-room-podium__place local-room-podium__place--${index + 1}`}
            key={participant.id}
          >
            <div className="room-podium-medallion">
              <RoomAvatar participant={participant} />
              <RoomTrophyFrame place={index + 1} />
            </div>
            <span className="room-podium-rank">
              <PaperDigits value={String(participant.reward?.place ?? index + 1)} />
            </span>
            <span>{participant.displayName}</span>
            <strong>
              <PaperDigits value={String(participant.score)} /> <RoomPointsIcon />
              <span className="visually-hidden"> pontos</span>
            </strong>
          </li>
        ))}
      </ol>
      {rest.length > 0 && <Scoreboard participants={rest} offset={3} />}
    </>
  );
}

export function ProjectorRoom({
  state,
  secondsLeft,
}: {
  state: PublicLocalRoomState;
  secondsLeft: number;
}) {
  const connected = state.participants.filter((participant) => participant.online !== false);
  const joinUrl = buildLocalRoomJoinUrl(window.location.origin, state.code);

  return (
    <div className="local-room-projector">
      <header className="local-room-projector__header">
        <p className="local-room-projector__participants">
          <PaperEditorIcon name="team" />
          {countLabel(connected.length, "participante", "participantes")}
        </p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void document.documentElement.requestFullscreen?.()}
        >
          <PaperEditorIcon name="expand" /> Tela cheia
        </button>
      </header>

      {state.phase === "lobby" ? (
        <main className="local-room-projector__lobby">
          <div>
            <span>Entre na sala</span>
            <strong>{state.code}</strong>
            <p>Aponte a câmera para o QR code.</p>
          </div>
          <RoomQrCode value={joinUrl} />
        </main>
      ) : state.phase === "playing" ? (
        <main className="local-room-projector__round">
          <div className="local-room-round__progress">
            <span>
              Pergunta {state.questionIndex + 1} de {state.totalQuestions}
            </span>
            <span className="local-room-round__timer">
              <NavigationIcon name="timer" /> <PaperDigits value={String(secondsLeft)} />s
            </span>
          </div>
          <div className="local-room-projector__prompt">
            <NavigationIcon
              name={state.settings.activity === "bingo" ? "activity-bank" : "focus"}
            />
            <h1>
              {state.settings.activity === "bingo" ? "Marque sua cartela" : "Ouça com atenção"}
            </h1>
            <p>
              {state.answeredParticipantIds.length} de {connected.length} respostas recebidas
            </p>
          </div>
          <Scoreboard participants={state.participants} />
        </main>
      ) : (
        <main className="local-room-projector__results">
          <NavigationIcon name="medal-first" />
          <h1>{state.phase === "finished" ? "Sala encerrada" : "Resultado da turma"}</h1>
          <Podium participants={state.participants} />
        </main>
      )}
    </div>
  );
}
