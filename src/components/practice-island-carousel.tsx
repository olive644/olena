import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { PracticeUserPortrait } from "./practice-user-portrait";
import type { StoredProfile } from "../hooks/use-stored-profile";

export function PracticeIslandCarousel({
  index,
  onVisit,
  profile,
}: {
  index: number;
  onVisit: (index: number) => void;
  profile: StoredProfile;
}) {
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState(0);

  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    gesture.current = null;
    setDrag(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3)
      onVisit(index + (dx < 0 ? 1 : -1));
  }

  return (
    <section
      className="practice-carousel"
      aria-label="Ilhas de estudo"
      aria-roledescription="carrossel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        onVisit(index + (event.key === "ArrowRight" ? 1 : -1));
      }}
    >
      <div
        className={`solo-islands practice-carousel-stage${drag !== 0 ? " is-dragging" : ""}`}
        style={{ "--drag-x": `${drag}px` } as CSSProperties}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          if (event.target instanceof Element && event.target.closest("button")) return;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > Math.abs(dy)) setDrag(Math.max(-140, Math.min(140, dx)));
        }}
        onPointerUp={(event) => finish(event)}
        onPointerCancel={(event) => finish(event, true)}
        onLostPointerCapture={() => {
          gesture.current = null;
          setDrag(0);
        }}
      >
        {PRACTICE_ISLANDS.map((island, position) => {
          const offset = position - index;
          const active = offset === 0;
          return (
            <div
              key={island.number}
              className={`practice-carousel-island${active ? " is-current" : " is-preview"}`}
              aria-hidden={!active}
              style={
                {
                  "--island-offset": offset,
                  "--island-rise": active ? "0px" : "var(--preview-rise)",
                  "--island-scale": active ? 1 : 0.65,
                  opacity: active ? 1 : Math.abs(offset) === 1 ? 0.38 : 0,
                } as CSSProperties
              }
            >
              {Math.abs(offset) <= 1 && (
                <img
                  className="solo-island-art"
                  src={island.art}
                  srcSet={`${island.art.replace(".webp", "-small.webp")} 480w, ${island.art} 800w`}
                  sizes={
                    active ? "(max-width: 600px) 66vw, 440px" : "(max-width: 600px) 32vw, 240px"
                  }
                  alt={active ? `Mundo ${island.number}: ${island.subject}` : ""}
                  width="800"
                  height="800"
                  draggable={false}
                  decoding="async"
                  fetchPriority={active ? "high" : "low"}
                />
              )}
              {active && (
                <div
                  className="practice-island-avatar"
                  style={{
                    left: `${island.traveler.left}%`,
                    top: `${island.traveler.top}%`,
                  }}
                >
                  <PracticeUserPortrait profile={profile} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="focus-mode-arrow practice-carousel-arrow practice-carousel-arrow--previous"
        type="button"
        disabled={index === 0}
        aria-label="Mundo anterior"
        onClick={() => onVisit(index - 1)}
      >
        <FocusPaperArrow />
      </button>
      <button
        className="focus-mode-arrow focus-mode-arrow--next practice-carousel-arrow practice-carousel-arrow--next"
        type="button"
        disabled={index === PRACTICE_ISLANDS.length - 1}
        aria-label="Próximo mundo"
        onClick={() => onVisit(index + 1)}
      >
        <FocusPaperArrow />
      </button>
    </section>
  );
}
