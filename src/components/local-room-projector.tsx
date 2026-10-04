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
import {
  RoomPointsIcon,
  RoomTrophyFrame,
  RoomClockIcon,
  RoomConfetti,
  RoomEclipseBanner,
  RoomSecondsUnit,
} from "./room-paper-icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { playRoomVictorySound } from "../data/room-feedback-sound";
import { PaperDigits } from "./paper-digits";
import { ROOM_TEAM_LABELS, type RoomTeam } from "../domain/local-room";
import "./room-stage.css";

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function Scoreboard({
  participants,
  offset = 0,
  questionIndex,
}: {
  participants: readonly LocalRoomParticipant[];
  offset?: number;
  questionIndex?: number;
}) {
  const ranked = rankLocalRoomParticipants(participants);
  const list = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    for (const row of list.current?.querySelectorAll<HTMLElement>("[data-player]") ?? []) {
      const id = row.dataset["player"]!;
      const top = row.offsetTop;
      const before = positions.current.get(id);
      next.set(id, top);
      if (
        before !== undefined &&
        before !== top &&
        !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        row.animate?.(
          [{ transform: `translateY(${before - top}px)` }, { transform: "translateY(0)" }],
          { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
      }
    }
    positions.current = next;
  });
  return (
    <ol ref={list} className="local-room-scoreboard">
      {ranked.map((participant, index) => (
        <li
          key={participant.id}
          data-player={participant.id}
          className={
            questionIndex !== undefined && participant.lastAnswer?.questionIndex === questionIndex
              ? participant.lastAnswer.correct
                ? "is-correct"
                : "is-wrong"
              : ""
          }
        >
          {questionIndex !== undefined &&
            participant.lastAnswer?.questionIndex === questionIndex && (
              <span className="room-answer-mark">
                {participant.lastAnswer.correct ? "Acertou" : "Errou"}
                {participant.lastAnswer.correct && <RoomConfetti compact />}
              </span>
            )}
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

function PodiumPlace({ participant, place }: { participant: LocalRoomParticipant; place: number }) {
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const target = participant.score;
  useEffect(() => {
    let frame = 0;
    let start: number | undefined;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    function tick(time: number) {
      start ??= time;
      const progress = reduced ? 1 : Math.min(1, Math.max(0, time - start - 120 * place) / 1800);
      setScore(Math.floor(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        setComplete(true);
        if (place === 1 && !reduced) playRoomVictorySound();
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, place]);
  return (
    <li className={`local-room-podium__place local-room-podium__place--${place}`}>
      <div className="room-podium-medallion">
        <RoomAvatar participant={participant} />
        <RoomTrophyFrame place={place} />
      </div>
      <div className="room-podium-standard" data-complete={complete}>
        <RoomEclipseBanner place={place} />
        <div className="room-podium-inscription">
          <small className="room-eclipse-name">
            {place === 1 ? "Eclipse Solar" : place === 2 ? "Eclipse Lunar" : "Lua Sangrenta"}
          </small>
          <span className="room-podium-rank">
            <PaperDigits value={String(participant.reward?.place ?? place)} />
          </span>
          <span className="room-podium-name" title={participant.displayName}>
            {participant.displayName}
          </span>
          <strong className="room-podium-score" aria-label={`${target} pontos`}>
            <span aria-hidden="true">
              <PaperDigits value={String(score)} />
            </span>
            <RoomPointsIcon />
          </strong>
        </div>
        {place === 1 && complete && <RoomConfetti />}
      </div>
    </li>
  );
}

export function Podium({ participants }: { participants: readonly LocalRoomParticipant[] }) {
  const ranked = rankLocalRoomParticipants(participants);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  return (
    <div className="room-results-layout">
      <ol className="local-room-podium">
        {top3.map((participant, index) => (
          <PodiumPlace key={participant.id} participant={participant} place={index + 1} />
        ))}
      </ol>
      <section className="room-results-ranking" aria-label="Classificação final">
        <h3>Classificação</h3>
        <Scoreboard participants={ranked} />
        {rest.length > 0 && (
          <span className="visually-hidden">Inclui participantes abaixo do top 3</span>
        )}
      </section>
    </div>
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
              <RoomClockIcon /> <PaperDigits value={String(secondsLeft)} />
              <RoomSecondsUnit />
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
          <Scoreboard participants={state.participants} questionIndex={state.questionIndex} />
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
