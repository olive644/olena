import { useEffect, useRef, useState, type CSSProperties } from "react";
import { chestCards, type MathChest } from "../data/math-place-rewards";
import type { OliverArtworkId } from "../data/oliver-tarot";
import { COSMIC_RARITIES, oliverRarity } from "../data/oliver-rarity";
import { isMotionReduced } from "../data/accessibility-preferences";
import { PaperCloseIcon } from "./paper-close-icon";
import { OliverCard } from "./oliver-card";
import { OliverCardInspection } from "./oliver-card-inspection";
import { CosmicDustArt } from "./cosmic-dust-art";
import { PaperDigits } from "./paper-digits";

export function OliverCardBooster({
  chest,
  onReveal,
  onClose,
  sound,
  onStore,
  pulse,
}: {
  chest: MathChest;
  onReveal: () => boolean;
  onClose: () => void;
  sound: () => void;
  onStore?: ((cards: OliverArtworkId[]) => void) | undefined;
  pulse?: (() => void) | undefined;
}) {
  const cards = chestCards(chest);
  const rank = Math.max(...cards.map(oliverRarity));
  const [taps, setTaps] = useState(0);
  const [dustDone, setDustDone] = useState((chest.revealed ?? 0) > 0);
  const [index, setIndex] = useState(Math.min(chest.revealed ?? 0, cards.length - 1));
  const [flipped, setFlipped] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [closing, setClosing] = useState<"store" | "close" | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const locked = useRef(false);
  const closeLock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const rarity =
    COSMIC_RARITIES[
      dustDone && flipped
        ? oliverRarity(cards[index]!)
        : dustDone || taps === 4
          ? rank
          : Math.min(rank, Math.max(0, taps - 1))
    ]!;
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  useEffect(() => {
    surface.current
      ?.querySelector<HTMLElement>(
        dustDone
          ? flipped
            ? ".oliver-inspection-stage"
            : ".oliver-flip-button"
          : ".cosmic-dust-tap",
      )
      ?.focus();
  }, [dustDone, flipped, index, taps]);
  function close(store: boolean) {
    if (closeLock.current) return;
    closeLock.current = true;
    if (timer.current) clearTimeout(timer.current);
    setClosing(store ? "store" : "close");
    sound();
    timer.current = setTimeout(
      () => (store && onStore ? onStore(cards) : onClose()),
      isMotionReduced() ? 0 : 850,
    );
  }
  function flip() {
    if (locked.current || closing) return;
    locked.current = true;
    if (!onReveal()) {
      locked.current = false;
      setSaveError("Não foi possível guardar a carta. Toque novamente para tentar.");
      return;
    }
    setSaveError("");
    setFlipped(true);
    sound();
  }
  return (
    <div
      ref={surface}
      className={`oliver-booster-backdrop cosmic-reveal${closing ? " is-departing" : ""}`}
      data-rarity={rarity.name}
      data-dust-taps={taps}
      style={
        {
          "--dust-color": rarity.color,
          "--dust-shade": rarity.shade,
          "--dust-light": rarity.light,
        } as CSSProperties
      }
      role="dialog"
      aria-modal="true"
      aria-label="Poeira cósmica"
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") close(false);
        if (event.key === "Tab") {
          const buttons = Array.from(
            surface.current!.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [tabindex="0"]',
            ),
          );
          const first = buttons[0]!,
            last = buttons.at(-1)!;
          if (
            !surface.current?.contains(document.activeElement) ||
            (event.shiftKey && document.activeElement === first)
          ) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="cosmic-reveal-sky" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ "--ray": i } as CSSProperties} />
        ))}
      </div>
      <button
        className="secondary-button oliver-booster-close"
        aria-label="Fechar cartas"
        disabled={!!closing}
        onClick={() => close(false)}
      >
        <PaperCloseIcon />
      </button>
      {!dustDone ? (
        <>
          <h1 className="cosmic-reveal-title">Poeira cósmica</h1>
          <p className="oliver-reveal-label" role="status">
            {taps === 4 ? rarity.name : "Toque para revelar a raridade"}
          </p>
          <button
            className="cosmic-dust-tap"
            key={taps}
            aria-label={`Revelar raridade, toque ${Math.min(4, taps + 1)} de 4`}
            disabled={taps === 4 || !!closing}
            onClick={() => {
              if (taps >= 4) return;
              setTaps(taps + 1);
              if (taps === 3) sound();
              else (pulse ?? sound)();
              if (taps === 3)
                timer.current = setTimeout(() => setDustDone(true), isMotionReduced() ? 0 : 850);
            }}
          >
            <CosmicDustArt />
          </button>
          <div className="cosmic-tap-pieces" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <i className={i < taps ? "is-lit" : ""} key={i} />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="oliver-reveal-label" role="status">
            {flipped
              ? `${COSMIC_RARITIES[oliverRarity(cards[index]!)]!.name} · Lembrança descoberta`
              : "Toque ou arraste para revelar"}
          </p>
          <div
            className={`oliver-flip-card${flipped ? " is-revealed" : ""}${closing ? " is-storing" : ""}`}
            key={index}
          >
            {flipped ? (
              <OliverCardInspection id={cards[index]!} compact />
            ) : (
              <button
                className="oliver-flip-button"
                aria-label="Revelar carta"
                disabled={!!closing}
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
                  gesture.current = { x: event.clientX, y: event.clientY };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (gesture.current)
                    setDrag({
                      x: event.clientX - gesture.current.x,
                      y: event.clientY - gesture.current.y,
                    });
                }}
                onPointerUp={() => {
                  if (gesture.current) flip();
                  gesture.current = null;
                  setDrag({ x: 0, y: 0 });
                }}
                onPointerCancel={() => {
                  gesture.current = null;
                  setDrag({ x: 0, y: 0 });
                }}
              >
                <div className="oliver-card-turn">
                  <OliverCard id={cards[index]!} back />
                </div>
              </button>
            )}
            <span
              className="oliver-cards-remaining"
              aria-label={`${cards.length - index - Number(flipped)} cartas restantes na Poeira cósmica`}
            >
              <PaperDigits value={String(cards.length - index - Number(flipped))} />
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
                disabled={!!closing}
                onClick={() => {
                  if (index === cards.length - 1) close(true);
                  else {
                    locked.current = false;
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
        </>
      )}
      {closing === "store" && (
        <div className="oliver-store-flight" aria-hidden="true">
          {cards.map((id, i) => (
            <div key={i} style={{ "--flight-delay": `${i * 120}ms` } as CSSProperties}>
              <OliverCard id={id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
