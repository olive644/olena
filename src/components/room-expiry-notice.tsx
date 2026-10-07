import { useEffect, useState } from "react";
import { roomExpiryWarningMinutes } from "../domain/local-room";

// Avisa quando a sala está perto de acabar. A sala dura 4 horas e se encerra sozinha, e antes
// disso a pessoa só via "Esta sala expirou ou foi encerrada." no meio da atividade.
export function RoomExpiryNotice({
  expiresAt,
  now,
  isHost = false,
}: {
  expiresAt: number | undefined;
  now: () => number;
  isHost?: boolean;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = roomExpiryWarningMinutes(expiresAt, now());
  if (minutes === undefined) return null;
  return (
    <p className="local-room-reveal-warning" role="status" aria-live="polite">
      Esta sala se encerra em menos de {minutes} {minutes === 1 ? "minuto" : "minutos"}.
      {isHost ? " Para continuar depois, crie uma nova sala." : ""}
    </p>
  );
}
