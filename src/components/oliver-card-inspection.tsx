import { useRef, useState } from "react";
import type { OliverCardId } from "../data/oliver-cards";
import { OliverCard } from "./oliver-card";

export function OliverCardInspection({ id }: { id: OliverCardId }) {
  const [angle, setAngle] = useState({ x: 0, y: 0 });
  const gesture = useRef<{ x: number; y: number; angle: typeof angle } | null>(null);
  const front = Math.cos((angle.y * Math.PI) / 180) >= 0;
  return (
    <div className="oliver-inspection">
      <div
        className="oliver-inspection-stage"
        role="button"
        tabIndex={0}
        aria-label="Inspecionar carta em 360 graus. Arraste ou use as setas."
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key))
            return;
          event.preventDefault();
          event.stopPropagation();
          setAngle((value) =>
            event.key === "Home"
              ? { x: 0, y: 0 }
              : {
                  x: Math.max(
                    -40,
                    Math.min(
                      40,
                      value.x +
                        (event.key === "ArrowUp" ? 10 : event.key === "ArrowDown" ? -10 : 0),
                    ),
                  ),
                  y:
                    value.y +
                    (event.key === "ArrowRight" ? 25 : event.key === "ArrowLeft" ? -25 : 0),
                },
          );
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          gesture.current = { x: event.clientX, y: event.clientY, angle };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start) return;
          setAngle({
            x: Math.max(-40, Math.min(40, start.angle.x - (event.clientY - start.y) * 0.25)),
            y: start.angle.y + (event.clientX - start.x) * 0.9,
          });
        }}
        onPointerUp={() => {
          gesture.current = null;
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        <div
          className="oliver-inspection-turn"
          style={{ transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)` }}
        >
          <div className="oliver-inspection-front" aria-hidden={!front}>
            <OliverCard id={id} />
          </div>
          <div className="oliver-inspection-back" aria-hidden={front}>
            <OliverCard id={id} back />
          </div>
        </div>
      </div>
      <button className="secondary-button" onClick={() => setAngle({ x: 0, y: 0 })}>
        Recentralizar carta
      </button>
    </div>
  );
}
