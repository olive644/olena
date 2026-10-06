import { useState } from "react";
import {
  BINGO_MODES,
  BINGO_MODE_LABELS,
  BINGO_MODE_RULES,
  BINGO_FREE,
  type BingoMode,
} from "../domain/number-bingo";
import type { LocalRoomAnswerFeedback, PublicLocalRoomState } from "../domain/local-room";
import { PaperDigits } from "./paper-digits";
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
  const number = state.currentQuestion?.id ?? drawn.at(-1) ?? "";
  const letters = ["B", "I", "N", "G", "O"];
  async function answer(id: string) {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await onAnswer(state.questionIndex, id);
      if (id === "bingo")
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
      <div className="bingo-rule">
        <BingoIcon mode={mode} />
        <div>
          <h3>{BINGO_MODE_LABELS[mode]}</h3>
          <p>{BINGO_MODE_RULES[mode]}</p>
        </div>
      </div>
      <div className="bingo-saturn-panel">
        <div className="bingo-saturn">
          <img key={number} src="/room-icons/bingo-saturn.svg" alt="" width="440" height="360" />
          <div className="bingo-current" role="status" aria-live="polite">
            <small>Bolinha sorteada</small>
            <span>{letters[Math.floor((Number(number) - 1) / 15)]}</span>
            <PaperDigits value={number} />
          </div>
        </div>
        <div className="bingo-history">
          <h3>
            Números sorteados <small>{drawn.length}/75</small>
          </h3>
          <div role="list" aria-label="Números sorteados">
            {drawn.map((id) => (
              <span role="listitem" key={id} className={id === number ? "latest" : ""}>
                {id}
              </span>
            ))}
          </div>
          {isHost ? (
            <button
              className="primary-button"
              type="button"
              disabled={pending || drawn.length >= 75}
              onClick={async () => {
                setPending(true);
                try {
                  await onDraw();
                } finally {
                  setPending(false);
                }
              }}
            >
              Sortear próxima bolinha
            </button>
          ) : (
            <p>O criador controla o sorteio.</p>
          )}
        </div>
      </div>
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
              {participant.bingoCard.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  className="secondary-button"
                  aria-pressed={id === BINGO_FREE || participant.bingoMarks?.includes(id) || false}
                  aria-label={id === BINGO_FREE ? "Sol, centro livre" : `${letters[i % 5]} ${id}`}
                  disabled={
                    pending ||
                    id === BINGO_FREE ||
                    !drawn.includes(id) ||
                    participant.bingoMarks?.includes(id)
                  }
                  onClick={() => void answer(id)}
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
              ))}
            </div>
            <p>O Sol já conta como marcado.</p>
          </section>
          <div className="bingo-claim">
            <h3>Complete sua constelação</h3>
            <p>
              Marque os números sorteados. Quando completar o objetivo, aperte Bingo para conferir.
            </p>
            <button
              type="button"
              className="primary-button"
              disabled={pending}
              onClick={() => void answer("bingo")}
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
