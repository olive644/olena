import {
  useEffect,
  useEffectEvent,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { isMotionReduced } from "../data/accessibility-preferences";
import { MathNumber, MathUserAvatar, MathIcon } from "./math-paper-art";
import { RoomPointsIcon } from "./room-paper-icons";
import { CommonMathChest } from "./math-place-treasure";
export function ArcadeResults({
  points,
  topic,
  message,
  dust,
  blockedDust,
  pending = false,
  onRetry,
  onCollectDust,
  onScoreComplete,
  children,
}: {
  points: number;
  topic: string;
  message?: ReactNode;
  dust: boolean;
  blockedDust: boolean;
  pending?: boolean;
  onRetry: () => void;
  onCollectDust: (event: MouseEvent<HTMLButtonElement>) => void;
  onScoreComplete: () => void;
  children?: ReactNode;
}) {
  useLanguage();
  const [displayed, setDisplayed] = useState(0);
  const complete = useEffectEvent(onScoreComplete);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const animate = () => {
      const ratio = isMotionReduced() ? 1 : Math.min(1, (performance.now() - start) / 1200);
      setDisplayed(Math.round(points * (1 - (1 - ratio) ** 3)));
      if (ratio < 1) frame = requestAnimationFrame(animate);
      else if (points > 0) complete();
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [points]);
  return (
    <div className="math-results" aria-live="polite">
      <div className="math-result-burst" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <i key={index} style={{ "--spark-index": index } as CSSProperties} />
        ))}
      </div>
      <MathUserAvatar mood="finished" />
      <h1 className="visually-hidden" tabIndex={-1}>
        {points + uiText(2292)}
      </h1>
      <div className="math-result-score" aria-hidden="true">
        <RoomPointsIcon />
        <MathNumber value={displayed} />
      </div>
      <p>{message ?? (points > 0 ? uiText(605) : uiText(606))}</p>
      <span className="math-result-topic">{topic}</span>
      {children}
      {dust && (
        <button
          type="button"
          className="math-earned-chest"
          aria-label={uiText(608)}
          onClick={onCollectDust}
        >
          <CommonMathChest />
          <span>{uiText(609)}</span>
        </button>
      )}
      {!dust && blockedDust && <p className="math-result-topic">{uiText(610)}</p>}
      <button
        className="primary-button math-start-button"
        type="button"
        disabled={pending}
        onClick={onRetry}
      >
        <MathIcon name="retry" /> {uiText(611)}
      </button>
    </div>
  );
}
