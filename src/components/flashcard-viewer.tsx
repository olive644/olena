import { useState } from "react";
import { uiText } from "../i18n/runtime";
import { LibraryDialog } from "./library-dialog";
import { PaperArrow } from "./paper-arrow";
import "./flashcard-viewer.css";

type ViewerCard = { id: string; front: string; back: string };

/** Visualizador de um baralho: um cartão por vez, toque para virar, setas para passar. */
export function FlashcardViewer({
  title,
  cards,
  onClose,
}: {
  title: string;
  cards: readonly ViewerCard[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  const go = (step: number) => {
    setIndex((value) => Math.min(cards.length - 1, Math.max(0, value + step)));
    setFlipped(false);
  };
  if (!card) return null;
  return (
    <LibraryDialog title={title} onClose={onClose} className="shelf-wood-dialog flashcard-viewer">
      <div
        className="flashcard-viewer__progress"
        role="progressbar"
        aria-label={uiText("Progresso do baralho")}
        aria-valuemin={1}
        aria-valuemax={cards.length}
        aria-valuenow={index + 1}
      >
        <span style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
      </div>
      <div className="flashcard-viewer__stage">
        <button
          type="button"
          className="flashcard-viewer__step"
          aria-label={uiText("Cartão anterior")}
          disabled={index === 0}
          onClick={() => go(-1)}
        >
          <PaperArrow back />
        </button>
        <button
          type="button"
          className="flashcard-viewer__card"
          data-side={flipped ? "back" : "front"}
          aria-label={uiText("Virar cartão")}
          onClick={() => setFlipped((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") go(1);
            if (event.key === "ArrowLeft") go(-1);
          }}
        >
          <small>{flipped ? uiText("Resposta") : uiText("Pergunta")}</small>
          <strong aria-live="polite">{flipped ? card.back : card.front}</strong>
          <span>
            {index + 1} {uiText("de")} {cards.length}
          </span>
        </button>
        <button
          type="button"
          className="flashcard-viewer__step"
          aria-label={uiText("Ir para o próximo cartão")}
          disabled={index === cards.length - 1}
          onClick={() => go(1)}
        >
          <PaperArrow />
        </button>
      </div>
      <p className="flashcard-viewer__hint">{uiText("Toque no cartão para virar")}</p>
    </LibraryDialog>
  );
}
