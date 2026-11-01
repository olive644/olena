import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { reducedMotion, watchReducedMotion } from "../data/reduced-motion";
import "./paper-speech.css";

type PaperSpeechProps = {
  text: string;
  immediate?: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
  onWord?: (event: { index: number; word: string; durationMs: number }) => void;
  skipLabel: string;
  className?: string;
};

function wordDuration(word: string): number {
  const pause = /[.!?…]["'”’»)\]]*$/u.test(word) ? 360 : /[,;:]["'”’»)\]]*$/u.test(word) ? 180 : 0;
  return 240 + Math.min(300, Array.from(word).length * 24) + pause;
}

/** Sequência visual sem áudio. Os callbacks do consumidor devem ser estáveis. */
export function PaperSpeech(props: PaperSpeechProps) {
  const quiet = useSyncExternalStore(watchReducedMotion, reducedMotion, () => true);
  return <SpeechSequence key={props.text} {...props} quiet={quiet} />;
}

function SpeechSequence({
  text,
  immediate = false,
  quiet,
  onSpeakingChange,
  onWord,
  skipLabel,
  className,
}: PaperSpeechProps & { quiet: boolean }) {
  const { parts, words } = useMemo(() => {
    let index = 0;
    const parts = (text.match(/\s+|\S+/gu) ?? []).map((value) => ({
      value,
      index: /\S/u.test(value) ? index++ : -1,
    }));
    return { parts, words: parts.filter((part) => part.index >= 0) };
  }, [text]);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(immediate || quiet || words.length === 0);
  const [paused, setPaused] = useState(document.hidden);
  const speaking = useRef<boolean | undefined>(undefined);
  // Uma solicitação de mostrar tudo termina esta sequência, mesmo se for retirada.
  if ((immediate || quiet) && !done) setDone(true);

  useEffect(() => {
    const notify = (value: boolean) => {
      if (speaking.current === value) return;
      speaking.current = value;
      onSpeakingChange?.(value);
    };
    if (done) {
      notify(false);
      return;
    }
    let timer: number | undefined;
    let next = 0;
    let remaining = 0;
    let deadline = 0;
    const clear = () => {
      window.clearTimeout(timer);
      timer = undefined;
    };
    const pause = () => {
      if (timer !== undefined) remaining = Math.max(0, deadline - performance.now());
      clear();
      notify(false);
    };
    const schedule = () => {
      deadline = performance.now() + remaining;
      timer = window.setTimeout(tick, remaining);
    };
    const tick = () => {
      if (document.hidden) {
        pause();
        return;
      }
      timer = undefined;
      const current = words[next];
      if (!current) {
        notify(false);
        setDone(true);
        return;
      }
      const durationMs = wordDuration(current.value);
      next++;
      setCount(next);
      onWord?.({ index: current.index, word: current.value, durationMs });
      remaining = durationMs;
      schedule();
    };
    const visibility = () => {
      setPaused(document.hidden);
      if (document.hidden) pause();
      else if (timer === undefined) {
        notify(true);
        schedule();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    if (!document.hidden) {
      notify(true);
      schedule();
    } else notify(false);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", visibility);
      notify(false);
    };
  }, [done, words, onSpeakingChange, onWord]);

  return (
    <div
      className={["paper-speech", className].filter(Boolean).join(" ")}
      data-complete={done}
      data-paused={paused}
    >
      <span className="paper-speech__accessible">{text}</span>
      <div className="paper-speech__text" aria-hidden="true">
        {parts.map((part, index) =>
          part.index < 0 ? (
            part.value
          ) : (
            <span
              key={index}
              className="paper-speech__word"
              data-visible={done || part.index < count}
            >
              {part.value}
            </span>
          ),
        )}
      </div>
      <button
        type="button"
        className="paper-speech__skip"
        onClick={() => setDone(true)}
        disabled={done}
        aria-hidden={done || undefined}
      >
        {skipLabel}
      </button>
    </div>
  );
}
