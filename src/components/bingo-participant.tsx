import { useEffect, useRef, useState, type ReactNode } from "react";
import { PaperBallSkin } from "./bingo-paper-ball";
import { createSaturnSound } from "./bingo-saturn-sound";
import { EXIT_JOURNEY_MS } from "./bingo-saturn-engine";
import { paperBallStyle } from "./bingo-ball-palette";
import { BingoLatest } from "./bingo-latest";
import { isMotionReduced, useAccessibility } from "../data/accessibility-preferences";

export function BingoParticipant({
  drawn,
  onReveal,
  children,
}: {
  drawn: readonly string[];
  onReveal?: ((ids: readonly string[]) => void) | undefined;
  children?: ReactNode;
  isHost: boolean;
  pending: boolean;
  onDraw: () => Promise<void>;
  questionStartedAt?: number;
}) {
  const { reduceMotion } = useAccessibility();
  const previous = useRef(drawn.join(","));
  const reveal = useRef(onReveal);
  const sound = useRef<ReturnType<typeof createSaturnSound> | null>(null);
  const [visible, setVisible] = useState([...drawn]);
  const [phase, setPhase] = useState<"idle" | "mix" | "leaving" | "reveal">("idle");
  const key = drawn.join(",");
  useEffect(() => {
    reveal.current = onReveal;
  });
  useEffect(() => {
    const audio = createSaturnSound();
    sound.current = audio;
    const unlock = () => {
      void audio.unlock();
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    if (navigator.userActivation?.hasBeenActive) unlock();
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      audio.dispose();
      sound.current = null;
    };
  }, []);
  useEffect(() => {
    const ids = key ? key.split(",") : [],
      old = previous.current ? previous.current.split(",") : [];
    previous.current = key;
    const timers: number[] = [];
    const after = (ms: number, callback: () => void) =>
      timers.push(window.setTimeout(callback, ms));
    if (
      ids.length !== old.length + 1 ||
      !old.every((id, i) => ids[i] === id) ||
      isMotionReduced()
    ) {
      after(0, () => {
        setVisible(ids);
        setPhase("idle");
        reveal.current?.(ids);
      });
    } else {
      after(0, () => {
        setVisible(old);
        setPhase("mix");
        sound.current?.mix();
      });
      const revealAt = 1400 + 320 + EXIT_JOURNEY_MS + 900;
      after(1720, () => {
        sound.current?.stop();
        sound.current?.exit();
      });
      after(revealAt - 220, () => setPhase("leaving"));
      after(revealAt, () => {
        setPhase("reveal");
        sound.current?.reveal();
        reveal.current?.(ids);
      });
      after(revealAt + 2300, () => {
        setPhase("idle");
        setVisible(ids);
        sound.current?.land();
      });
    }
    return () => {
      timers.forEach(window.clearTimeout);
      sound.current?.stop();
    };
  }, [key, reduceMotion]);
  return (
    <div className="bingo-participant-stage">
      {(phase === "mix" || phase === "leaving") && (
        <div
          className={
            "bingo-spin-banner" + (phase === "leaving" ? " bingo-spin-banner--leaving" : "")
          }
          role="status"
        >
          <svg className="bingo-mini-saturn" viewBox="0 0 100 80" aria-hidden="true">
            <g className="bingo-mini-core">
              <path fill="#50bdc4" d="m50 7 23 10 10 22-11 23-25 8-23-12-7-23 13-22Z" />
              <path fill="#a4e8eb" d="m50 7 23 10-26 11-30 7 13-22Z" />
              <path fill="#147b83" d="m83 39-11 23-25 8 12-30 14-23Z" />
              <path fill="#fff9ef" d="m25 42 48-13 4 8-48 14Z" />
              <circle cx="38" cy="27" r="5" fill="#ff8e77" />
              <circle cx="56" cy="54" r="5" fill="#ffe88d" />
            </g>
            <path
              fill="#facc15"
              fillRule="evenodd"
              d="M2 55Q45 19 97 19L98 28Q49 70 2 65ZM10 56Q46 62 89 29Q43 29 10 56Z"
            />
            <path fill="#ffe88d" d="M2 55Q46 62 98 19L98 25Q50 72 2 60Z" />
          </svg>
          <strong>GLOBO RODANDO</strong>
          <span className="bingo-spin-stars" aria-hidden="true">
            ✦ ✦ ✦
          </span>
        </div>
      )}
      {phase === "reveal" && (
        <div
          className="bingo-participant-reveal"
          style={paperBallStyle(drawn.at(-1) ?? "1")}
          role="status"
          aria-label={"Saiu " + drawn.at(-1)}
        >
          <PaperBallSkin number={drawn.at(-1) ?? ""} />
        </div>
      )}
      <section className="bingo-history" aria-label="Histórico do bingo">
        <div className="bingo-history-heading">
          <h3>
            Números sorteados <small>{visible.length}/75</small>
          </h3>
          <BingoLatest number={visible.at(-1)} />
        </div>
        <div role="list" aria-label="Números sorteados">
          {visible.map((id) => (
            <span
              role="listitem"
              data-bingo-number={id}
              key={id}
              className={"bingo-participant-ball" + (id === visible.at(-1) ? " latest" : "")}
              aria-label={`${id}${id === visible.at(-1) ? ", última bola" : ""}`}
              style={paperBallStyle(id)}
            >
              <PaperBallSkin number={id} />
            </span>
          ))}
        </div>
      </section>
      {children && <div className="bingo-card-column">{children}</div>}
    </div>
  );
}
