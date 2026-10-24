import { uiText, useLanguage } from "../i18n/runtime";
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
  useLanguage();

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
              <use href="/navigation-icons/paper/bingo-mini-saturn.svg#core" />
            </g>
            <use href="/navigation-icons/paper/bingo-mini-saturn.svg#ring" />
          </svg>
          <strong>{uiText(128)}</strong>
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
          aria-label={uiText(2287) + drawn.at(-1)}
        >
          <PaperBallSkin number={drawn.at(-1) ?? ""} />
        </div>
      )}
      <section className="bingo-history" aria-label={uiText(129)}>
        <div className="bingo-history-heading">
          <h3>
            {uiText(130)} <small>{visible.length}/75</small>
          </h3>
          <BingoLatest number={visible.at(-1)} />
        </div>
        <div role="list" aria-label={uiText(130)}>
          {visible.map((id) => (
            <span
              role="listitem"
              data-bingo-number={id}
              key={id}
              className={"bingo-participant-ball" + (id === visible.at(-1) ? " latest" : "")}
              aria-label={`${id}${id === visible.at(-1) ? uiText(131) : ""}`}
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
