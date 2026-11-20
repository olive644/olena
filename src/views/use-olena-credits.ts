import { useEffect, useRef, useState } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { playCreditSpendSound } from "../data/credit-sound";
import { prepareRoomFeedbackSound } from "../data/room-feedback-sound";
import { fetchHelenaUsage, type HelenaUsage } from "../data/helena-client";
import { reducedMotion } from "../data/reduced-motion";
import { creditsSpent } from "../domain/olena-credits";

const nowMs = () => Date.now();
/** O servidor acerta o gasto real só quando o pedido termina; espera um instante antes de ler. */
const SETTLE_DELAY_MS = 700;

export type CreditSpend = {
  id: number;
  amount: number;
  from: number;
  to: number;
  /** Movimento reduzido: o número muda de uma vez, sem animação. */
  instant: boolean;
};

/** Saldo de créditos da Olena: lido ao abrir, depois de cada geração e quando o dia renova. */
export function useOlenaCredits() {
  const [usage, setUsage] = useState<HelenaUsage>();
  const [resetAt, setResetAt] = useState(0);
  const [spend, setSpend] = useState<CreditSpend>();
  const [tick, setTick] = useState(0);
  const lastUsed = useRef<number | undefined>(undefined);
  const spendId = useRef(0);
  const sound = useRef<AudioContext | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const services = await getFirebaseAccountServices();
        const user = services.auth.currentUser;
        if (!user || user.isAnonymous) return;
        const next = await fetchHelenaUsage({
          token: await user.getIdToken(),
          signal: controller.signal,
        });
        if (!next || controller.signal.aborted) return;
        const amount = creditsSpent(lastUsed.current, next.usedCredits);
        lastUsed.current = next.usedCredits;
        setUsage(next);
        setResetAt(nowMs() + next.resetInSeconds * 1000);
        if (amount > 0) {
          spendId.current += 1;
          setSpend({
            id: spendId.current,
            amount,
            from: next.remainingCredits + amount,
            to: next.remainingCredits,
            instant: reducedMotion(),
          });
          playCreditSpendSound(sound.current, amount);
        }
      } catch {
        // sem conta ou sem rede: o medidor só não aparece
      }
    })();
    return () => controller.abort();
  }, [tick]);

  // Quando o dia renova, lê de novo para o saldo voltar sem recarregar a página.
  useEffect(() => {
    if (!resetAt) return;
    const timer = setTimeout(
      () => setTick((value) => value + 1),
      Math.max(1_000, resetAt - nowMs() + 1_500),
    );
    return () => clearTimeout(timer);
  }, [resetAt]);

  return {
    usage,
    resetAt,
    spend,
    /** Chamar no clique de gerar: o navegador só libera o som depois de um gesto. */
    prepare: () => {
      sound.current = prepareRoomFeedbackSound();
    },
    /** Chamar quando a geração termina (com sucesso ou não). */
    reload: () => {
      setTimeout(() => setTick((value) => value + 1), SETTLE_DELAY_MS);
    },
  };
}
