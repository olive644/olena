import { uiText, useLanguage } from "../i18n/runtime";
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
import { playRoomFeedbackSound, prepareRoomFeedbackSound } from "../data/room-feedback-sound";

function BingoIcon({ mode }: { mode: BingoMode }) {
  useLanguage();

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
  starting = false,
}: {
  state: PublicLocalRoomState;
  isHost: boolean;
  starting?: boolean;
  participantId: string;
  onMode: (mode: BingoMode) => void;
  onDraw: () => Promise<void>;
  onAnswer: (index: number, answer: string) => Promise<LocalRoomAnswerFeedback | undefined>;
  onReview?: ((claimId: string, decision: BingoReviewDecision) => Promise<void>) | undefined;
  onPhysical?: ((value: boolean) => void) | undefined;
  onFinalize?: (() => Promise<void>) | undefined;
}) {
  useLanguage();

  const mode = state.settings.bingoMode ?? "line";
  const Machine = isHost ? BingoSaturn : BingoParticipant;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const cardRef = useRef<HTMLElement>(null);
  const [reaction, setReaction] = useState<{
    number: string;
    points: number;
    left: number;
    top: number;
    key: number;
  } | null>(null);
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), 1500);
    return () => window.clearTimeout(timer);
  }, [reaction]);
  // Números já revelados pela animação do globo: só eles podem ser marcados, e a cartela não
  // entrega o número antes de a bolinha aparecer.
  const [revealed, setRevealed] = useState<readonly string[]>(state.drawnIds ?? []);
  // Marcações pedidas e ainda não confirmadas pelo servidor: aparecem na hora.
  const [optimistic, setOptimistic] = useState<readonly string[]>([]);
  const [stamped, setStamped] = useState<string | null>(null);
  const markQueue = useRef<Promise<unknown>>(Promise.resolve());
  const drawRef = useRef(onDraw);
  const startingRef = useRef(starting);
  const indexRef = useRef(state.questionIndex);
  useEffect(() => {
    drawRef.current = onDraw;
    startingRef.current = starting;
    indexRef.current = state.questionIndex;
  });
  const draw = useCallback(async () => {
    if (startingRef.current) return;
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
        <h3>{uiText(747)}</h3>
        <div className="bingo-modes" role="group" aria-label={uiText(747)}>
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
                <picture>
                  <source
                    media="(max-width: 540px)"
                    srcSet={`/room-art/poliana-bingo-${item}.webp`}
                  />
                  <img
                    src={`/room-art/poliana-bingo-${item}.webp`}
                    alt=""
                    width="1200"
                    height="400"
                  />
                </picture>
              </span>
            </button>
          ))}
        </div>
        <label className="bingo-physical-setting secondary-button">
          <img src="/room-icons/bingo-corners.svg" width="32" height="32" alt="" />
          <span>
            <strong>{uiText(748)}</strong>
            <small>{uiText(749)}</small>
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
        setMessage(result ? uiText(750) : uiText(751));
      } else if (result.pointsChange > 0) {
        const card = cardRef.current;
        const cell = card?.querySelector<HTMLButtonElement>(`[data-number="${id}"]`);
        if (card && cell) {
          const bounds = card.getBoundingClientRect();
          const ball = cell.getBoundingClientRect();
          setReaction((last) => ({
            number: id,
            points: result.pointsChange,
            key: (last?.key ?? 0) + 1,
            left: Math.max(
              62,
              Math.min(bounds.width - 62, ball.left - bounds.left + ball.width / 2),
            ),
            top: Math.max(64, ball.top - bounds.top - 28),
          }));
          playRoomFeedbackSound(true, prepareRoomFeedbackSound());
        }
      }
      setOptimistic((current) => current.filter((item) => item !== id));
    });
  }
  async function claim() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      await markQueue.current;
      const result = await onAnswer(indexRef.current, "bingo");
      setMessage(result?.correct ? "" : result ? uiText(752) : uiText(753));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="number-bingo" aria-label={uiText(547)}>
      <Machine
        drawn={drawn}
        isHost={isHost}
        pending={starting || pending || !!state.bingoClaim}
        onDraw={draw}
        onReveal={reveal}
      >
        {!state.settings.bingoPhysical && !!participant?.bingoCard?.length && (
          <section ref={cardRef} className="bingo-solar-card" aria-label={uiText(754)}>
            <header>
              <div>
                <small>{uiText(755)}</small>
                <h3>{uiText(754)}</h3>
              </div>
            </header>
            <svg
              className="bingo-card-blackhole"
              viewBox="0 0 480 580"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <use href="/navigation-icons/paper/bingo-scenery-0.svg#art" />
            </svg>
            <svg
              className="bingo-card-orbits"
              viewBox="0 0 440 520"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <use href="/navigation-icons/paper/bingo-scenery-1.svg#art" />
            </svg>
            <div className="bingo-card-heading" aria-hidden="true">
              {letters.map((letter, i) => (
                <div key={letter}>
                  <BingoPlanet index={i} />
                  <strong>{letter}</strong>
                  <small>
                    {[uiText(1739), uiText(1861), uiText(467), uiText(1738), uiText(1862)][i]}
                  </small>
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
                    data-number={id}
                    aria-label={id === BINGO_FREE ? uiText(1626) : `${letters[i % 5]} ${id}`}
                    aria-description={
                      marked ? uiText(1863) : revealed.includes(id) ? uiText(1864) : uiText(756)
                    }
                    disabled={
                      pending ||
                      state.bingoClaim?.participantId === participantId ||
                      state.bingoClaimQueue?.some(
                        (claim) => claim.participantId === participantId,
                      ) ||
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
                          <use href="/navigation-icons/paper/bingo-scenery-2.svg#art" />
                        </svg>
                        <small>{uiText(757)}</small>
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
            {reaction && (
              <span
                key={reaction.key}
                className="bingo-ball-reaction"
                role="status"
                aria-label={uiText(1865, [reaction.number, reaction.points])}
                style={{ left: reaction.left, top: reaction.top }}
              >
                <RoomConfetti compact />
                <strong>{uiText(758)}</strong>
                <small>
                  +{reaction.points} {uiText(759)}
                </small>
              </span>
            )}
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
              state.bingoClaim?.participantId === participantId ||
              state.bingoClaimQueue?.some((claim) => claim.participantId === participantId) ||
              state.bingoWinnerIds?.includes(participantId)
            }
            onClick={() => void claim()}
          >
            <img src="/room-icons/bingo-claim.svg" alt="" width="32" height="32" />
            {uiText(760)}
          </button>
          <p role="status">
            {state.bingoWinnerIds?.includes(participantId)
              ? uiText(761)
              : state.bingoClaim?.participantId === participantId
                ? uiText(762)
                : state.bingoClaimQueue?.some((claim) => claim.participantId === participantId)
                  ? uiText(763)
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
              setMessage(uiText(764));
            } finally {
              setPending(false);
            }
          }}
        >
          <img src="/room-icons/bingo-finish.svg" width="32" height="32" alt="" />
          {state.bingoWinnerIds.length === 1 ? uiText(1630) : uiText(1629)}
        </button>
      )}
      {isHost && !participant && message && <p role="status">{message}</p>}
      {state.bingoClaim && isHost && (
        <BingoReview state={state} isHost={isHost} onReview={onReview} />
      )}
    </section>
  );
}
