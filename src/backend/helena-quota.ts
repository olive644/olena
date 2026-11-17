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

export type NoticeLanguage = "pt" | "en";

/** Idioma dos avisos: o app manda X-App-Language; qualquer coisa que não comece com "en" é português. */
export function noticeLanguage(header: string | null | undefined): NoticeLanguage {
  return header?.toLowerCase().startsWith("en") ? "en" : "pt";
}

export const ASSISTANT_OFF_MESSAGE = {
  pt: "A conversa com a Olena foi desligada para economizar a cota gratuita. O Resumo automático segue funcionando.",
  en: "Chatting with Olena was turned off to save the free quota. Automatic summary keeps working.",
} as const;

export function quotaMessage(
  limit: RateLimitName | undefined,
  capability: string,
  language: NoticeLanguage = "pt",
): string {
  const en = language === "en";
  const reset = en ? "at 9 pm (Brasília time)" : "às 21h (horário de Brasília)";
  const automatic =
    capability === "summarize"
      ? en
        ? " Automatic summary still works, on your device."
        : " O Resumo automático continua funcionando, no seu aparelho."
      : "";
  switch (limit) {
    case "user-minute":
      return en
        ? "You made too many requests in a short time. Wait 1 minute and try again."
        : "Você fez muitos pedidos em pouco tempo. Espere 1 minuto e tente de novo.";
    case "user-day":
      return en
        ? `You used all of today's requests to Olena. They come back ${reset}.${automatic}`
        : `Você usou todos os pedidos de hoje à Olena. Eles voltam ${reset}.${automatic}`;
    case "summary-user-day":
      return en
        ? `You already made ${SUMMARY_USER_DAILY_LIMIT} summaries with Olena today. They come back ${reset}.${automatic}`
        : `Você já fez ${SUMMARY_USER_DAILY_LIMIT} resumos com a Olena hoje. Eles voltam ${reset}.${automatic}`;
    case "address-day":
      return en
        ? `Too many requests came from your network today. They come back ${reset}.${automatic}`
        : `Muitos pedidos saíram da sua rede hoje. Eles voltam ${reset}.${automatic}`;
    case "summary-day":
    case "global-day":
    case "provider-quota":
      return en
        ? `Olena reached today's free limit. She is back ${reset}.${automatic}`
        : `A Olena atingiu o limite gratuito de hoje. Ela volta ${reset}.${automatic}`;
    default:
      return en
        ? `Usage limit reached. Try again later.${automatic}`
        : `Limite de uso atingido. Tente de novo mais tarde.${automatic}`;
  }
}
