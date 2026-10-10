import { useEffect, useRef, useState, type CSSProperties } from "react";
import { chestCards, type MathChest } from "../data/math-place-rewards";
import type { OliverArtworkId } from "../data/oliver-tarot";
import { isMotionReduced } from "../data/accessibility-preferences";
import { PaperCloseIcon } from "./paper-close-icon";
import { OliverCard } from "./oliver-card";
import { OliverCardInspection } from "./oliver-card-inspection";
import { PaperDigits } from "./paper-digits";

export function OliverCardBooster({
  chest,
  onReveal,
  onClose,
  sound,
  onStore,
}: {
  chest: MathChest;
  onReveal: () => boolean;
  onClose: () => void;
  sound: () => void;
  onStore?: ((cards: OliverArtworkId[]) => void) | undefined;
}) {
  const cards = chestCards(chest);
  const [index, setIndex] = useState(Math.min(chest.revealed ?? 0, cards.length - 1));
  const [flipped, setFlipped] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const lock = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [storing, setStoring] = useState(false);
  const storeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (storeTimer.current) clearTimeout(storeTimer.current);
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
      className={`oliver-booster-backdrop${chest.kind === "arcane" ? " is-arcane" : ""}`}
      ref={surface}
      role="dialog"
      aria-modal="true"
      aria-label={chest.kind === "arcane" ? "Carta do baú arcano" : "Cartas do baú comum"}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          if (inspecting) setInspecting(false);
          else onClose();
        }
        if (event.key === "Tab") {
          const buttons = Array.from(
            surface.current!.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [tabindex="0"]',
            ),
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
        {flipped ? "Lembrança descoberta" : "Toque ou arraste para revelar"}
      </p>
      {inspecting ? (
        <OliverCardInspection id={cards[index]!} />
      ) : (
        <div
          className={`oliver-flip-card${flipped ? " is-revealed" : ""}${storing ? " is-storing" : ""}`}
          key={index}
        >
          <button
            className="oliver-flip-button"
            aria-label={flipped ? "Carta revelada" : "Revelar carta"}
            disabled={storing}
            style={
              {
                translate: `${drag.x}px ${drag.y}px`,
                rotate: `${drag.x / 18}deg`,
                "--reveal-turn": `${Math.min(70, Math.hypot(drag.x, drag.y))}deg`,
              } as CSSProperties
            }
            onClick={flip}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              start.current = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!start.current) return;
              setDrag({ x: event.clientX - start.current.x, y: event.clientY - start.current.y });
            }}
            onPointerUp={() => {
              if (start.current !== null) flip();
              start.current = null;
              setDrag({ x: 0, y: 0 });
            }}
            onPointerCancel={() => {
              start.current = null;
              setDrag({ x: 0, y: 0 });
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
            <PaperDigits value={String(remaining)} />
          </span>
          {flipped && (
            <div className="oliver-reveal-sparks" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} style={{ rotate: `${i * 30}deg` }} />
              ))}
            </div>
          )}
        </div>
      )}
      {storing && (
        <div className="oliver-store-flight" aria-hidden="true">
          {cards.map((id, position) => (
            <div
              key={position}
              style={{ "--flight-delay": `${position * 120}ms` } as CSSProperties}
            >
              <OliverCard id={id} />
            </div>
          ))}
        </div>
      )}
      <div className="oliver-booster-actions">
        {flipped && (
          <button
            className="secondary-button"
            disabled={storing}
            onClick={() => setInspecting(!inspecting)}
          >
            {inspecting ? "Voltar à carta" : "Inspecionar carta em 3D"}
          </button>
        )}
        {saveError && <p role="alert">{saveError}</p>}
        {flipped ? (
          <button
            className="primary-button"
            disabled={storing}
            onClick={() => {
              if (index === cards.length - 1) {
                if (!onStore) {
                  onClose();
                  return;
                }
                setStoring(true);
                sound();
                storeTimer.current = setTimeout(() => onStore(cards), isMotionReduced() ? 0 : 900);
              } else {
                lock.current = false;
                setFlipped(false);
                setInspecting(false);
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
