import { useEffect, useRef, useState } from "react";
import { oliverCollection } from "../data/math-place-rewards";
import { OLIVER_CARDS, type OliverCardId } from "../data/oliver-cards";
import { OLIVER_TAROT, type OliverArtworkId } from "../data/oliver-tarot";
import { OliverCard } from "./oliver-card";
import { OliverCardInspection } from "./oliver-card-inspection";
import { PaperCloseIcon } from "./paper-close-icon";

export function OliverCardCollection({
  onClose,
  incoming = [],
}: {
  onClose: () => void;
  incoming?: OliverCardId[] | undefined;
}) {
  const owned = oliverCollection();
  const [selected, setSelected] = useState<OliverArtworkId | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [selected]);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <div
      className="oliver-collection-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Coleção do Oliver"
      ref={panel}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          if (selected) setSelected(null);
          else onClose();
        }
        if (event.key === "Tab") {
          const buttons = Array.from(
            panel.current!.querySelectorAll<HTMLElement>(
              'button:not([disabled]), summary, [tabindex="0"]',
            ),
          );
          const first = buttons[0]!,
            last = buttons.at(-1)!;
          if (!panel.current?.contains(document.activeElement)) {
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
      <section className="oliver-collection-panel">
        <button
          className="secondary-button oliver-booster-close"
          aria-label={selected ? "Voltar à coleção" : "Fechar coleção"}
          onClick={() => {
            if (selected) setSelected(null);
            else onClose();
          }}
        >
          <PaperCloseIcon />
        </button>
        <h1>{selected === OLIVER_TAROT.id ? "O arcano do Oliver" : "As lembranças do Oliver"}</h1>
        {!selected && <p>{Object.keys(owned).length}/10 descobertas · Todas comuns</p>}
        {selected ? (
          <div className="oliver-collection-detail">
            <OliverCardInspection id={selected} />
          </div>
        ) : (
          <>
            <div className="oliver-collection-grid">
              {OLIVER_CARDS.map((card) => (
                <button
                  className={`oliver-collection-item${owned[card.id] ? " is-owned" : ""}${incoming.includes(card.id) ? " is-arriving" : ""}`}
                  key={card.id}
                  disabled={!owned[card.id]}
                  onClick={() => setSelected(card.id)}
                  aria-label={`${card.title}, ${owned[card.id] ?? 0} cópias`}
                >
                  {incoming.includes(card.id) && (
                    <div className="oliver-arrival-back">
                      <OliverCard id={card.id} back />
                    </div>
                  )}
                  {owned[card.id] ? (
                    <img
                      src={`/oliver-cards/${card.id}-small.webp`}
                      alt=""
                      width="480"
                      height="720"
                      loading="lazy"
                    />
                  ) : (
                    <OliverCard id={card.id} back />
                  )}
                  <strong>{card.title}</strong>
                  <span>{owned[card.id] ? `×${owned[card.id]}` : "Por descobrir"}</span>
                </button>
              ))}
            </div>
            <button
              className="oliver-tarot-showcase"
              onClick={() => setSelected(OLIVER_TAROT.id)}
              aria-label="Ver tarot do Oliver, A Estrela"
            >
              <img
                src="/oliver-cards/oliver-star-tarot-small.webp"
                alt=""
                width="480"
                height="720"
                loading="lazy"
              />
              <span>
                <strong>XVII · A Estrela</strong>
                <small>Arte especial do Oliver. Fora dos baús comuns.</small>
              </span>
            </button>
            <details className="oliver-card-chances">
              <summary>Chances dos baús comuns</summary>
              <p>
                80% de chance de 1 carta; 20% de 2 cartas. Cada carta é sorteada independentemente.
                Repetidas contam como cópias.
              </p>
              <ul>
                {OLIVER_CARDS.map((card) => (
                  <li key={card.id}>
                    {card.title} <strong>{card.chance}%</strong>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </section>
    </div>
  );
}
