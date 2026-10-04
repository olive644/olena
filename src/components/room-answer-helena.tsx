import { useEffect, useState } from "react";

export function RoomAnswerHelena({ correct }: { correct: boolean }) {
  return (
    <div
      className={`room-answer-helena ${correct ? "is-correct" : "is-wrong"}`}
      role="img"
      aria-label={
        correct ? "Helena segurando o símbolo de correto" : "Helena triste segurando um X"
      }
    >
      <div className="room-answer-helena__frames" />
    </div>
  );
}

export function RoomSpeedNotice({ points }: { points: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return (
    <strong className="room-speed-label">
      {points >= 85
        ? "MUITO RÁPIDO!"
        : points >= 60
          ? "BOM RITMO!"
          : points >= 40
            ? "BOA RESPOSTA!"
            : "MUITO DEVAGAR"}
    </strong>
  );
}
