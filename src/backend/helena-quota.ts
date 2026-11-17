// Limites diários da Olena e o texto que a pessoa lê quando um deles acaba. A cota gratuita da
// Cloudflare (10.000 neurons por dia, zerada à 00:00 UTC, que é 21h em Brasília) é da conta toda:
// o resumo é o pedido mais caro, então ganha um teto próprio, abaixo do teto geral.

export const SUMMARY_GLOBAL_DAILY_LIMIT = 100;
export const SUMMARY_USER_DAILY_LIMIT = 5;
export const GLOBAL_DAILY_LIMIT = 300;
export const DAY_SECONDS = 86_400;

export type RateLimitName =
  | "user-minute"
  | "user-day"
  | "address-day"
  | "summary-user-day"
  | "summary-day"
  | "global-day"
  | "provider-quota";

export type RateLimitDenial = { limit: RateLimitName; retryAfterSeconds: number };

/** Segundos até a janela fixa atual terminar (as janelas começam à 00:00 UTC). */
export function secondsUntilReset(windowSeconds: number, now = Date.now()): number {
  return Math.max(1, windowSeconds - (Math.floor(now / 1000) % windowSeconds));
}

const RESET = "às 21h (horário de Brasília)";

export function quotaMessage(limit: RateLimitName | undefined, capability: string): string {
  const automatic =
    capability === "summarize" ? " O Resumo automático continua funcionando, no seu aparelho." : "";
  switch (limit) {
    case "user-minute":
      return "Você fez muitos pedidos em pouco tempo. Espere 1 minuto e tente de novo.";
    case "user-day":
      return `Você usou todos os pedidos de hoje à Olena. Eles voltam ${RESET}.${automatic}`;
    case "summary-user-day":
      return `Você já fez ${SUMMARY_USER_DAILY_LIMIT} resumos com a Olena hoje. Eles voltam ${RESET}.${automatic}`;
    case "address-day":
      return `Muitos pedidos saíram da sua rede hoje. Eles voltam ${RESET}.${automatic}`;
    case "summary-day":
    case "global-day":
    case "provider-quota":
      return `A Olena atingiu o limite gratuito de hoje. Ela volta ${RESET}.${automatic}`;
    default:
      return `Limite de uso atingido. Tente de novo mais tarde.${automatic}`;
  }
}
