import { useEffect, useRef, useState } from "react";
import { TOMATO_BITES, tomatoStage } from "../domain/pomodoro-tomato";

/** Depois da última mordida, o tomate comido fica à mostra antes de brotar de novo. */
const FINAL_HOLD_MS = 2600;

/**
 * Etapa que a tela mostra: a do tempo, e, quando o foco acaba e a pausa começa, a última mordida
 * por um instante antes de o tomate brotar de novo (o relógio já virou para a pausa nesse ponto).
 */
export function useDisplayedTomatoStage(
  phase: "focus" | "shortBreak" | "longBreak",
  remaining: number,
) {
  const live = phase === "focus" ? tomatoStage(remaining) : 0;
  const lastFocus = useRef({ phase, stage: live });
  const [finishing, setFinishing] = useState(false);
  useEffect(() => {
    const before = lastFocus.current;
    lastFocus.current = { phase, stage: phase === "focus" ? live : before.stage };
    if (before.phase === "focus" && phase !== "focus" && before.stage >= TOMATO_BITES - 1) {
      setFinishing(true);
      const timer = setTimeout(() => setFinishing(false), FINAL_HOLD_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, live]);
  return finishing ? TOMATO_BITES : live;
}
