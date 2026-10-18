import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useState } from "react";

export function RoomAnswerHelena({ correct }: { correct: boolean }) {
  useLanguage();

  return (
    <div
      className={`room-answer-helena ${correct ? "is-correct" : "is-wrong"}`}
      role="img"
      aria-label={correct ? uiText(959) : uiText(1929)}
    >
      <div className="room-answer-helena__frames" />
    </div>
  );
}

export function RoomSpeedNotice({ points }: { points: number }) {
  useLanguage();

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return (
    <strong className="room-speed-label">
      {points >= 85
        ? uiText(960)
        : points >= 60
          ? uiText(1930)
          : points >= 40
            ? uiText(1931)
            : uiText(1932)}
    </strong>
  );
}
