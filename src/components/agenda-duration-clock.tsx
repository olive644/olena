import { useId, useRef, useState } from "react";
import { AgendaDetailIcon } from "./agenda-detail-icon";
import { AgendaCloseIcon } from "./agenda-close-icon";
import { durationFromDial } from "../domain/agenda-duration";

export function AgendaDurationClock({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (minutes: number) => void;
}) {
  const id = useId(),
    panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; hand: "hours" | "minutes" } | null>(null);
  const [open, setOpen] = useState(false);
  const hours = Math.floor(value / 60),
    minutes = value % 60;
  const change = (next: number) => onChange(Math.max(1, Math.min(max, Math.round(next))));
  const close = () => panel.current?.hidePopover();
  return (
    <div className="field agenda-paper-field">
      <span>Duração</span>
      <button
        type="button"
        className="agenda-field-trigger"
        popoverTarget={id}
        aria-label="Duração em minutos"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span>
          {hours > 0 ? `${hours} h ` : ""}
          {minutes} min
        </span>
        <AgendaDetailIcon name="clock" />
      </button>
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label="Escolher duração"
        className="agenda-field-popover agenda-clock-panel"
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            panel.current?.hidePopover();
          }
        }}
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
      >
        <header>
          <h3>Gire os ponteiros</h3>
          <button type="button" className="icon-button" aria-label="Fechar duração" onClick={close}>
            <AgendaCloseIcon />
          </button>
        </header>
        <svg
          viewBox="0 0 240 240"
          className="agenda-duration-dial"
          onPointerMove={(event) => {
            const active = drag.current;
            if (!active || active.pointer !== event.pointerId) return;
            const box = event.currentTarget.getBoundingClientRect();
            const angle =
              (Math.atan2(
                event.clientX - box.left - box.width / 2,
                -(event.clientY - box.top - box.height / 2),
              ) +
                Math.PI * 2) %
              (Math.PI * 2);
            const cycle = active.hand === "hours" ? 12 : 60;
            change(
              durationFromDial(
                value,
                active.hand,
                Math.round((angle / (Math.PI * 2)) * cycle) % cycle,
                max,
              ),
            );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <path
            d="m120 6 58 17 39 39 17 58-17 58-39 39-58 17-58-17-39-39L6 120l17-58 39-39Z"
            fill="#D8CDB9"
          />
          <circle cx="120" cy="120" r="105" fill="#FFF9EF" />
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index * Math.PI) / 6;
            return (
              <svg
                key={index}
                x={120 + Math.sin(angle) * 88 - (index === 0 || index >= 10 ? 9 : 4.5)}
                y={120 - Math.cos(angle) * 88 - 7}
                width={index === 0 || index >= 10 ? 18 : 9}
                height={14}
                viewBox={`0 0 ${index === 0 || index >= 10 ? 132 : 66} 98`}
                fill="#292432"
                aria-hidden="true"
              >
                {[...String(index || 12)].map((digit, position) => (
                  <svg key={position} x={position * 66} width="66" height="98" viewBox="0 0 66 98">
                    <use href={`/paper-digits.svg#digit-${digit}`} />
                  </svg>
                ))}
              </svg>
            );
          })}
          {(["minutes", "hours"] as const).map((hand) => (
            <g
              key={hand}
              role="slider"
              tabIndex={0}
              aria-label={hand === "hours" ? "Ponteiro das horas" : "Ponteiro dos minutos"}
              aria-valuemin={0}
              aria-valuemax={hand === "hours" ? Math.floor(max / 60) : 59}
              aria-valuenow={hand === "hours" ? hours : minutes}
              style={{
                transform: `rotate(${hand === "hours" ? (hours % 12) * 30 : minutes * 6}deg)`,
                transformOrigin: "120px 120px",
              }}
              className="agenda-clock-hand"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { pointer: event.pointerId, hand };
              }}
              onKeyDown={(event) => {
                const step = ["ArrowRight", "ArrowUp"].includes(event.key)
                  ? 1
                  : ["ArrowLeft", "ArrowDown"].includes(event.key)
                    ? -1
                    : 0;
                if (step) {
                  event.preventDefault();
                  change(value + step * (hand === "hours" ? 60 : 1));
                }
              }}
            >
              <path
                d={`M110 120 116 ${hand === "hours" ? 63 : 37}h8l6 ${hand === "hours" ? 57 : 83}Z`}
                fill={hand === "hours" ? "#292432" : "#7C3AED"}
              />
              <path
                d={`M116 ${hand === "hours" ? 63 : 37}h4v83l-10-0Z`}
                fill={hand === "hours" ? "#51465D" : "#A779EF"}
              />
              <path d={`M106 130V${hand === "hours" ? 55 : 28}h28v102Z`} fill="transparent" />
            </g>
          ))}
          <circle cx="120" cy="120" r="9" fill="#FACC15" pointerEvents="none" />
        </svg>
        <div className="field-row">
          <label className="field">
            Horas
            <input
              type="number"
              min={0}
              max={Math.floor(max / 60)}
              value={hours}
              onChange={(event) => change(Number(event.target.value) * 60 + minutes)}
            />
          </label>
          <label className="field">
            Minutos
            <input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(event) => change(hours * 60 + Number(event.target.value))}
            />
          </label>
        </div>
        <button type="button" className="primary-button" onClick={close}>
          Concluir
        </button>
      </div>
    </div>
  );
}
