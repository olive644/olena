// Contas do medidor de créditos da Olena, sem DOM nem relógio: a tela passa os números.

/** Duração em horas e minutos, arredondada para cima (a contagem nunca mostra 0 min antes da hora). */
export function countdownParts(seconds: number): { hours: number; minutes: number } {
  const total = Math.max(0, Math.ceil(seconds / 60));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Quanto foi gasto entre duas leituras do mesmo dia. Zero se nada foi gasto ou se o dia virou. */
export function creditsSpent(previousUsed: number | undefined, nextUsed: number): number {
  if (previousUsed === undefined) return 0;
  return Math.max(0, nextUsed - previousUsed);
}

/** Estado do medidor pelo saldo e pelo custo máximo de um pedido. */
export function creditLevel(remaining: number, requestMax: number): "ok" | "low" | "empty" {
  if (remaining <= 0) return "empty";
  return remaining < requestMax ? "low" : "ok";
}

/** Fração do dia já passada desde a última renovação (a janela é de 24 horas). */
export function dayElapsedShare(secondsToReset: number): number {
  const day = 86_400;
  return Math.min(1, Math.max(0, 1 - secondsToReset / day));
}
