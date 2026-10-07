import { useCallback, useEffect, useRef, useState } from "react";
import {
  BINGO_MODES,
  BINGO_MODE_LABELS,
  BINGO_MODE_RULES,
  BINGO_FREE,
  type BingoMode,
} from "../domain/number-bingo";
import type { LocalRoomAnswerFeedback, PublicLocalRoomState } from "../domain/local-room";
import { BingoSaturn } from "./bingo-saturn";
import { BingoPlanet } from "./bingo-planet";
import { BingoReview } from "./bingo-review";
import { BingoParticipant } from "./bingo-participant";
import type { BingoReviewDecision } from "../domain/local-room";
import "./number-bingo.css";
import { RoomConfetti } from "./room-paper-icons";
import { PaperDigits } from "./paper-digits";
import { playRoomFeedbackSound, prepareRoomFeedbackSound } from "../data/room-feedback-sound";

function BingoIcon({ mode }: { mode: BingoMode }) {
  return (
    <img
      className="bingo-mode-icon"
      src={"/room-icons/bingo-" + mode + ".svg"}
      alt=""
      width="44"
      height="44"
    />
  );
}

export default function NumberBingo({
  state,
  isHost,
  participantId,
  onMode,
  onDraw,
  onAnswer,
  onReview,
  onPhysical,
  onFinalize,
}: {
  state: PublicLocalRoomState;
  isHost: boolean;
  participantId: string;
  onMode: (mode: BingoMode) => void;
  onDraw: () => Promise<void>;
  onAnswer: (index: number, answer: string) => Promise<LocalRoomAnswerFeedback | undefined>;
  onReview?: ((claimId: string, decision: BingoReviewDecision) => Promise<void>) | undefined;
  onPhysical?: ((value: boolean) => void) | undefined;
  onFinalize?: (() => Promise<void>) | undefined;
}) {
  const mode = state.settings.bingoMode ?? "line";
  const Machine = isHost ? BingoSaturn : BingoParticipant;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const ownScore = state.participants.find((p) => p.id === participantId)?.score ?? 0;
  const previousScore = useRef(ownScore);
  const [pointsBurst, setPointsBurst] = useState({ points: 0, key: 0 });
  useEffect(() => {
    const gained = ownScore - previousScore.current;
    previousScore.current = ownScore;
    if (gained <= 0) return;
    setPointsBurst((last) => ({ points: gained, key: last.key + 1 }));
    playRoomFeedbackSound(true, prepareRoomFeedbackSound());
    const timer = window.setTimeout(() => setPointsBurst((last) => ({ ...last, points: 0 })), 1600);
    return () => window.clearTimeout(timer);
  }, [ownScore]);
  // Números já revelados pela animação do globo: só eles podem ser marcados, e a cartela não
  // entrega o número antes de a bolinha aparecer.
  const [revealed, setRevealed] = useState<readonly string[]>(state.drawnIds ?? []);
  // Marcações pedidas e ainda não confirmadas pelo servidor: aparecem na hora.
  const [optimistic, setOptimistic] = useState<readonly string[]>([]);
  const [stamped, setStamped] = useState<string | null>(null);
  const markQueue = useRef<Promise<unknown>>(Promise.resolve());
  const drawRef = useRef(onDraw);
  const indexRef = useRef(state.questionIndex);
  useEffect(() => {
    drawRef.current = onDraw;
    indexRef.current = state.questionIndex;
  });
  const draw = useCallback(async () => {
    setPending(true);
    try {
      await drawRef.current();
    } finally {
      setPending(false);
    }
  }, []);
  const reveal = useCallback((ids: readonly string[]) => setRevealed(ids), []);
  useEffect(() => {
    if (!stamped) return;
    const timer = window.setTimeout(() => setStamped(null), 650);
    return () => window.clearTimeout(timer);
  }, [stamped]);
  if (state.phase === "lobby")
    return (
      <section className="bingo-settings">
        <h3>Modo de partida</h3>
        <div className="bingo-modes" role="group" aria-label="Modo de partida">
          {BINGO_MODES.map((item) => (
            <button
              key={item}
              type="button"
              className="secondary-button bingo-mode"
              aria-pressed={mode === item}
              onClick={() => onMode(item)}
            >
              <BingoIcon mode={item} />
              <span className="bingo-mode-copy">
                <strong>{BINGO_MODE_LABELS[item]}</strong>
                <small>{BINGO_MODE_RULES[item]}</small>
              </span>
              <span className="bingo-mode-art" aria-hidden="true">
                <img src={`/room-art/poliana-bingo-${item}.webp`} alt="" width="384" height="384" />
              </span>
            </button>
          ))}
        </div>
        <label className="bingo-physical-setting secondary-button">
          <img src="/room-icons/bingo-corners.svg" width="32" height="32" alt="" />
          <span>
            <strong>Bingo presencial</strong>
            <small>Usar cartelas de papel, sem cartela digital.</small>
          </span>
          <input
            type="checkbox"
            checked={state.settings.bingoPhysical === true}
            onChange={(e) => onPhysical?.(e.target.checked)}
          />
        </label>
      </section>
    );
  const participant = state.participants.find((item) => item.id === participantId);
  const drawn = state.drawnIds ?? [];
  const letters = ["B", "I", "N", "G", "O"];
  // A casa marca na hora; o servidor confirma em seguida. Se ele recusar ou falhar, a marca
  // volta atrás e a pessoa é avisada. Os pedidos seguem em fila para não competirem entre si.
  function mark(id: string) {
    if (optimistic.includes(id) || participant?.bingoMarks?.includes(id)) return;
    setOptimistic((current) => [...current, id]);
    setStamped(id);
    setMessage("");
    markQueue.current = markQueue.current.then(async () => {
      // O índice é lido só na hora de enviar: se saiu outra bolinha enquanto a fila andava, o
      // pedido leva o sorteio atual em vez de ser recusado por um índice velho.
      const result = await onAnswer(indexRef.current, id).catch(() => undefined);
      if (!result?.correct) {
        setMessage(
          result
            ? "Esse número ainda não pode ser marcado."
            : "Não foi possível marcar. Tente de novo.",
        );
      }
      setOptimistic((current) => current.filter((item) => item !== id));
    });
  }
  async function claim() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await onAnswer(state.questionIndex, "bingo");
      setMessage(
        result?.correct
          ? ""
          : result
            ? "Ainda não completou o objetivo. Confira sua cartela."
            : "Não foi possível conferir. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  const pointsPanel = (
    <div className="bingo-points-meter" aria-label={`${ownScore} pontos`}>
      <BingoPlanet index={2} />
      <PaperDigits value={String(ownScore)} />
      <small>pontos</small>
      {pointsBurst.points > 0 && (
        <span key={pointsBurst.key} className="bingo-points-burst" role="status">
          <RoomConfetti compact />+{pointsBurst.points} pontos
        </span>
      )}
    </div>
  );
  return (
    <section className="number-bingo" aria-label="Bingo de números">
      {state.settings.bingoPhysical && participant && pointsPanel}
      <Machine
        drawn={drawn}
        isHost={isHost}
        pending={pending || !!state.bingoClaim}
        onDraw={draw}
        onReveal={reveal}
      >
        {!state.settings.bingoPhysical && !!participant?.bingoCard?.length && (
          <section className="bingo-solar-card" aria-label="Minha cartela">
            <header>
              <div>
                <small>Sistema solar</small>
                <h3>Minha cartela</h3>
              </div>
              {pointsPanel}
            </header>
            <svg
              className="bingo-card-blackhole"
              viewBox="0 0 480 580"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <path
                d="m-45 420 95-214 158-56 162 15 146 143-36 182-180 109-194-39Z"
                fill="#312663"
              />
              <path d="m-45 420 95-214 158-56 162 15-159 53-114 119Z" fill="#7661ae" />
              <path d="m-43 423 121-85 190-89 217-14 38 40-232 27-201 103Z" fill="#a779ef" />
              <path d="m-43 423 133-18 201-103 232-27-10 39-214 24-178 94Z" fill="#e7bc88" />
              <path d="m119 380 44-151 157-29 117 109-60 159-157 49Z" fill="#241c4d" />
              <path d="m119 380 44-151 157-29-108 73-53 110Z" fill="#403579" />
              <path d="m-7 466 123 37 190-13 191-94-26 71-170 76-190-3Z" fill="#7661ae" />
            </svg>
            <svg
              className="bingo-card-orbits"
              viewBox="0 0 440 520"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M-70 390Q220-80 510 390M-60 440Q220-20 500 440M-60 490Q220 40 500 490"
                fill="none"
                stroke="#a779ef"
                strokeWidth="2"
              />
              <path
                d="m26 120 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1ZM403 245l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z"
                fill="#ffe88d"
              />
            </svg>
            <div className="bingo-card-heading" aria-hidden="true">
              {letters.map((letter, i) => (
                <div key={letter}>
                  <BingoPlanet index={i} />
                  <strong>{letter}</strong>
                  <small>{["Terra", "Marte", "Júpiter", "Saturno", "Netuno"][i]}</small>
                </div>
              ))}
            </div>
            <div className="bingo-card-grid">
              {participant.bingoCard.map((id, i) => {
                const marked =
                  id === BINGO_FREE ||
                  participant.bingoMarks?.includes(id) ||
                  optimistic.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={
                      "secondary-button" +
                      (stamped === id ? " bingo-stamp" : "") +
                      (id !== BINGO_FREE && !marked && revealed.includes(id)
                        ? " bingo-callable"
                        : "")
                    }
                    aria-pressed={marked}
                    data-orbit={i % 5}
                    aria-label={id === BINGO_FREE ? "Sol, centro livre" : `${letters[i % 5]} ${id}`}
                    disabled={
                      !!state.bingoClaim ||
                      state.bingoWinnerIds?.includes(participantId) ||
                      id === BINGO_FREE ||
                      marked ||
                      !revealed.includes(id)
                    }
                    onClick={() => mark(id)}
                  >
                    {id === BINGO_FREE ? (
                      <>
                        <svg className="bingo-card-sun" viewBox="0 0 64 64" aria-hidden="true">
                          <path
                            d="m32 0 6 14 14-7-3 16 15 9-15 8 3 17-14-7-6 14-6-14-14 7 3-17L0 32l15-9-3-16 14 7Z"
                            fill="#c99a00"
                          />
                          <path d="m22 14 21 2 10 17-11 18-22-2L11 31Z" fill="#fff0c7" />
                          <path d="m22 14 21 2-14 12-18 3Z" fill="#fff9ef" />
                          <path d="m53 33-11 18-22-2 20-10 3-23Z" fill="#ffe88d" />
                        </svg>
                        <small>Livre</small>
                      </>
                    ) : (
                      <>
                        <BingoPlanet index={i % 5} number={id} />
                        <span className="bingo-cell-star" aria-hidden="true" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </Machine>
      {participant && (
        <div className="bingo-claim">
          <button
            type="button"
            className="primary-button"
            disabled={
              !drawn.length ||
              pending ||
              !!state.bingoClaim ||
              state.bingoWinnerIds?.includes(participantId)
            }
            onClick={() => void claim()}
          >
            <img src="/room-icons/bingo-claim.svg" alt="" width="32" height="32" />
            Bingo!
          </button>
          <p role="status">
            {state.bingoWinnerIds?.includes(participantId)
              ? "Seu Bingo foi confirmado. A partida continua!"
              : message}
          </p>
        </div>
      )}
      {isHost && !!state.bingoWinnerIds?.length && !state.bingoClaim && (
        <button
          type="button"
          className="secondary-button bingo-finalize"
          disabled={pending || !onFinalize}
          onClick={async () => {
            setPending(true);
            try {
              await onFinalize?.();
            } catch {
              setMessage("Não foi possível definir os ganhadores. Tente novamente.");
            } finally {
              setPending(false);
            }
          }}
        >
          <img src="/room-icons/bingo-finish.svg" width="32" height="32" alt="" />
          {state.bingoWinnerIds.length === 1 ? "Definir ganhador" : "Definir ganhadores"}
        </button>
      )}
      {isHost && !participant && message && <p role="status">{message}</p>}
      {state.bingoClaim && <BingoReview state={state} isHost={isHost} onReview={onReview} />}
    </section>
  );
}
