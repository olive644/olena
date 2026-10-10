import { useEffect, useRef, useState } from "react";
import type { MathChest } from "../data/math-place-rewards";
import { OLIVER_CARDS } from "../data/oliver-cards";
import { PaperCloseIcon } from "./paper-close-icon";
import { OliverCard } from "./oliver-card";

export function OliverCardBooster({
  chest,
  onReveal,
  onClose,
  sound,
}: {
  chest: MathChest;
  onReveal: () => boolean;
  onClose: () => void;
  sound: () => void;
}) {
  const cards = chest.cards!;
  const [index, setIndex] = useState(Math.min(chest.revealed ?? 0, cards.length - 1));
  const [flipped, setFlipped] = useState(false);
  const [saveError, setSaveError] = useState("");
  const lock = useRef(false);
  const start = useRef<number | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const previous = useRef<Element | null>(null);
  useEffect(() => {
    if (flipped)
      surface.current?.querySelector<HTMLButtonElement>(".oliver-booster-actions button")?.focus();
  }, [flipped]);
  useEffect(() => {
    previous.current = document.activeElement;
    surface.current?.querySelector<HTMLButtonElement>(".oliver-flip-button")?.focus();
    return () => {
      if (previous.current instanceof HTMLElement) previous.current.focus();
    };
  }, []);
  useEffect(() => {
    surface.current?.querySelector<HTMLButtonElement>(".oliver-flip-button")?.focus();
  }, [index]);
  function flip() {
    if (lock.current || flipped) return;
    lock.current = true;
    if (!onReveal()) {
      lock.current = false;
      setSaveError("Não foi possível guardar a carta. Toque novamente para tentar.");
      return;
    }
    setSaveError("");
    setFlipped(true);
    sound();
  }
  const remaining = cards.length - index - Number(flipped);
  return (
    <div
      className="oliver-booster-backdrop"
      ref={surface}
      role="dialog"
      aria-modal="true"
      aria-label="Cartas do baú comum"
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") onClose();
        if (event.key === "Tab") {
          const buttons = Array.from(
            surface.current!.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
          );
          const first = buttons[0]!,
            last = buttons.at(-1)!;
          if (!surface.current?.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <button
        className="secondary-button oliver-booster-close"
        aria-label="Fechar cartas"
        onClick={onClose}
      >
        <PaperCloseIcon />
      </button>
      <p className="oliver-reveal-label" role="status">
        {flipped
          ? OLIVER_CARDS.find((card) => card.id === cards[index])!.title
          : "Toque ou arraste para revelar"}
      </p>
      <div className={`oliver-flip-card${flipped ? " is-revealed" : ""}`} key={index}>
        <button
          className="oliver-flip-button"
          aria-label={flipped ? "Carta revelada" : "Revelar carta"}
          disabled={flipped}
          onClick={flip}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            start.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (start.current !== null && Math.abs(event.clientX - start.current) > 35) flip();
            start.current = null;
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
        >
          <div className="oliver-card-turn">
            <div className="oliver-card-side oliver-card-side--back" aria-hidden={flipped}>
              <OliverCard id={cards[index]!} back />
            </div>
            <div className="oliver-card-side oliver-card-side--front" aria-hidden={!flipped}>
              <OliverCard id={cards[index]!} />
            </div>
          </div>
        </button>
        <span
          className="oliver-cards-remaining"
          aria-label={`${remaining} cartas restantes no baú`}
        >
          {remaining}
        </span>
        {flipped && (
          <div className="oliver-reveal-sparks" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} style={{ rotate: `${i * 30}deg` }} />
            ))}
          </div>
        )}
      </div>
      <div className="oliver-booster-actions">
        {saveError && <p role="alert">{saveError}</p>}
        {flipped ? (
          <button
            className="primary-button"
            onClick={() => {
              if (index === cards.length - 1) onClose();
              else {
                lock.current = false;
                setFlipped(false);
                setIndex(index + 1);
              }
            }}
          >
            {index === cards.length - 1 ? "Guardar cartas" : "Próxima carta"}
          </button>
        ) : (
          <span>Uma lembrança do Oliver espera por você.</span>
        )}
      </div>
    </div>
  );
}
