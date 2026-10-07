import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PaperDigits } from "./paper-digits";

export function RoomStepSlider({
  label,
  value,
  steps,
  suffix = "",
  onCommit,
}: {
  label: string;
  value: number | "all";
  steps: readonly number[];
  suffix?: string;
  onCommit(value: number): void;
}) {
  const current = steps.indexOf(value as number);
  const inputId =
    label === "Quantidade de palavras"
      ? "room-slider-words"
      : label === "Perguntas"
        ? "room-slider-questions"
        : "room-slider-seconds";
  const [index, setIndex] = useState(current < 0 ? steps.length - 1 : current);
  const indexRef = useRef(index);
  const [touched, setTouched] = useState(false);
  const committed = useRef(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = steps.indexOf(value as number);
      if (next >= 0) {
        indexRef.current = next;
        setIndex(next);
      }
      setTouched(false);
      committed.current = value;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value, steps]);
  function commit() {
    const next = steps[indexRef.current]!;
    if (next !== committed.current) {
      committed.current = next;
      onCommit(next);
    }
  }
  const shown = current < 0 && !touched ? value : steps[index];
  return (
    <div className="local-room-step-slider">
      <div className="local-room-step-slider__heading">
        <label htmlFor={inputId}>{label}</label>
        <strong>{shown === "all" ? "Todas" : `${shown}${suffix}`}</strong>
      </div>
      <input
        id={inputId}
        type="range"
        min="0"
        max={steps.length - 1}
        step="1"
        value={index}
        style={
          { "--room-slider-progress": `${(index / (steps.length - 1)) * 100}%` } as CSSProperties
        }
        aria-valuetext={shown === "all" ? "Todas" : `${shown}${suffix}`}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (next !== index) navigator.vibrate?.(8);
          indexRef.current = next;
          setIndex(next);
          setTouched(true);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <div className="local-room-step-slider__ticks" aria-hidden="true">
        {steps.map((step) => (
          <span key={step}>
            {step}
            {suffix}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CountdownOverlay({ value }: { value: number }) {
  return (
    <div className="local-room-countdown" role="status" aria-live="assertive">
      <span key={value} className="local-room-countdown__value">
        {value > 0 ? <PaperDigits value={String(value)} /> : "Vai!"}
      </span>
    </div>
  );
}

// Um portal direto pro <body>, não pro elemento pai mais próximo, porque
// qualquer ancestral com transform (como o hover de .module-panel) vira um
// "containing block" e faz position:fixed grudar nele em vez da tela toda.
export function LocalRoomFullscreen({
  children,
  embedded = false,
}: {
  children: ReactNode;
  embedded?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (embedded) return;
    const previous = document.activeElement;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    const wasRoomActive = document.body.classList.contains("local-room-active");
    document.body.classList.add("local-room-active");
    if (root) root.inert = true;
    ref.current?.focus();
    return () => {
      if (root) root.inert = wasInert;
      if (!wasRoomActive) document.body.classList.remove("local-room-active");
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [embedded]);
  if (embedded) return <div className="local-room-preparation">{children}</div>;
  return createPortal(
    <div
      ref={ref}
      className="local-room-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Sala"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
