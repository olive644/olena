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
          <svg viewBox="0 0 440 360" aria-hidden="true">
            <path fill="#51259B" d="m78 280 287 0 22 25-20 12H74l-21-12Z" />
            <path fill="#A779EF" d="m78 280 287 0-15 12H91Z" />
            <path fill="#7C3AED" d="m75 170 22-6 35 125h-25ZM326 103l26 4-26 181h-30Z" />
            <path fill="#A779EF" d="m75 170 11-3 33 122h-12ZM341 105l11 2-26 181h-12Z" />
            <path fill="#C69A06" d="M30 188c-12-44 332-159 365-101l-21 15C323 65 62 156 49 187Z" />
            <g key={number} className="bingo-saturn-cage">
              <path
                fill="#51259B"
                d="m173 28 72 0 66 40 34 67-7 66-44 58-73 24-70-23-46-51-15-71 27-67Z"
              />
              <path
                fill="#FFF9EF"
                d="m174 35 70 0 61 38 33 62-7 62-41 55-69 23-66-22-44-48-14-65 26-66Z"
              />
              <path
                fill="#EDE1FF"
                d="m174 35 70 0-83 113-64-8 26-66ZM305 73l33 62-7 62-41 55-69 23 41-147Z"
              />
              <path
                fill="none"
                stroke="#A779EF"
                strokeWidth="2"
                d="M123 74q180 4 182 0M105 115q118 33 225 0M99 172q117 35 237 0M112 211q107 40 211 0M153 47q-32 150 9 214M210 35v239M267 47q38 128 5 211"
              />
              {Array.from({ length: 16 }, (_, i) => (
                <g
                  key={i}
                  transform={`translate(${133 + (i % 5) * 34} ${185 + Math.floor(i / 5) * 18})`}
                >
                  <path
                    fill={["#FACC15", "#50BDC4", "#A779EF", "#FF8E77"][i % 4]}
                    d="m-9-6 10-4 8 7-2 9-10 4-8-8Z"
                  />
                  <path fill="#FFF9EF" d="m-4-4 6-1 3 5-3 5-6-2Z" />
                </g>
              ))}
            </g>
            <path fill="#FACC15" d="M30 185C67 217 351 139 395 88l-5 25C322 174 70 246 30 201Z" />
            <path fill="#FFE88D" d="M30 185C67 217 351 139 395 88l-3 10C320 163 69 235 30 193Z" />
            <path fill="#51259B" d="m202 260 30 0v21l98 22v13l-125-34Z" />
            <path fill="#FFF9EF" d="m208 268 21 1 102 27-1 7-108-26Z" />
            <path fill="#A779EF" d="m208 268 14 9 108 26-9 6-116-27Z" />
            <path fill="#FACC15" d="M208 259h19v15h-19Z" />
          </svg>
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
