import { useCallback, useEffect, useRef, useState } from "react";
import {
  BINGO_MODES,
  BINGO_MODE_LABELS,
  BINGO_MODE_RULES,
  BINGO_FREE,
  type BingoMode,
} from "../domain/number-bingo";
import type { LocalRoomAnswerFeedback, PublicLocalRoomState } from "../domain/local-room";
import { PaperDigits } from "./paper-digits";
import { BingoSaturn } from "./bingo-saturn";
import "./number-bingo.css";

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
}: {
  state: PublicLocalRoomState;
  isHost: boolean;
  participantId: string;
  onMode: (mode: BingoMode) => void;
  onDraw: () => Promise<void>;
  onAnswer: (index: number, answer: string) => Promise<LocalRoomAnswerFeedback | undefined>;
}) {
  const mode = state.settings.bingoMode ?? "line";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
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
              <span>
                <strong>{BINGO_MODE_LABELS[item]}</strong>
                <small>{BINGO_MODE_RULES[item]}</small>
              </span>
              <span className="bingo-mode-art" aria-hidden="true">
                <BingoIcon mode={item} />
              </span>
            </button>
          ))}
        </div>
        <p>
          75 números, cartelas individuais 5 × 5 e um Sol livre no centro. O criador controla os
          sorteios.
        </p>
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
          ? "Bingo confirmado!"
          : result
            ? "Ainda não completou o objetivo. Confira sua cartela."
            : "Não foi possível conferir. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="number-bingo" aria-label="Bingo de números">
      <BingoSaturn
        drawn={drawn}
        isHost={isHost}
        pending={pending}
        onDraw={draw}
        onReveal={reveal}
      />
      {participant?.bingoCard && (
        <div className="bingo-card-layout">
          <section className="bingo-solar-card" aria-label="Minha cartela">
            <header>
              <h3>Minha cartela</h3>
              <small>Sistema solar</small>
            </header>
            <div className="bingo-card-heading" aria-hidden="true">
              {letters.map((letter, i) => (
                <div key={letter}>
                  <svg viewBox="0 0 40 40">
                    <path
                      fill={["#50BDC4", "#A779EF", "#FF8E77", "#FACC15", "#7C3AED"][i]}
                      d="m13 4 14 1 9 11-3 14-13 7L7 29 3 16Z"
                    />
                    <path fill="#292432" opacity=".2" d="m27 5 9 11-3 14-13 7L7 29l18-7Z" />
                    {i === 4 && <path fill="#FACC15" d="m1 26 36-16 2 5L4 32Z" />}
                  </svg>
                  <strong>{letter}</strong>
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
                    aria-label={id === BINGO_FREE ? "Sol, centro livre" : `${letters[i % 5]} ${id}`}
                    disabled={id === BINGO_FREE || marked || !revealed.includes(id)}
                    onClick={() => mark(id)}
                  >
                    {id === BINGO_FREE ? (
                      <>
                        <BingoIcon mode="full" />
                        <small>Livre</small>
                      </>
                    ) : (
                      <PaperDigits value={id} />
                    )}
                  </button>
                );
              })}
            </div>
            <p>O Sol já conta como marcado.</p>
          </section>
          <div className="bingo-claim">
            <button
              type="button"
              className="primary-button"
              disabled={pending}
              onClick={() => void claim()}
            >
              Bingo!
            </button>
            <p role="status">{message}</p>
          </div>
        </div>
      )}
    </section>
  );
}
