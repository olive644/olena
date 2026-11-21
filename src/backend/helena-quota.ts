// Limites diários da Olena e o texto que a pessoa lê quando um deles acaba. A cota gratuita da
// Cloudflare (10.000 neurons por dia, zerada à 00:00 UTC, que é 21h em Brasília) é da conta toda.
// O que limita o uso é o gasto estimado de cada pedido (créditos), não o número de pedidos: veja
// `helena-budget.ts`.

/** Pedidos por minuto e por dia por pessoa e por rede: proteção contra rajada, não de custo. */
export const USER_MINUTE_LIMIT = 5;
export const USER_DAILY_REQUEST_LIMIT = 60;
export const ADDRESS_DAILY_LIMIT = 400;
export const DAY_SECONDS = 86_400;

export type RateLimitName =
  | "user-minute"
  | "user-day"
  | "address-day"
  | "user-budget"
  | "address-budget"
  | "global-budget"
  | "busy"
  | "duplicate"
  | "request-too-big"
  | "provider-quota";

export type RateLimitDenial = {
  limit: RateLimitName;
  retryAfterSeconds: number;
  /** Créditos (neurons arredondados) do que a pessoa já gastou e do que pode gastar hoje. */
  usedCredits?: number;
  limitCredits?: number;
  /** Quanto o pedido custaria, quando ele é grande demais para caber. */
  requestCredits?: number;
  requestMaxCredits?: number;
};

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
  pt: "A conversa com a Olena foi desligada para economizar a cota gratuita. Ela só gera resumo, flashcards, quiz e simulado na Biblioteca.",
  en: "Chatting with Olena was turned off to save the free quota. She only makes summaries, flashcards, quizzes and mock exams in the Library.",
} as const;

export function quotaMessage(
  limit: RateLimitName | undefined,
  _capability: string,
  language: NoticeLanguage = "pt",
  details: Pick<
    RateLimitDenial,
    "usedCredits" | "limitCredits" | "requestCredits" | "requestMaxCredits"
  > = {},
): string {
  const en = language === "en";
  const reset = en ? "at 9 pm (Brasília time)" : "às 21h (horário de Brasília)";
  switch (limit) {
    case "user-minute":
      return en
        ? "You made too many requests in a short time. Wait 1 minute and try again."
        : "Você fez muitos pedidos em pouco tempo. Espere 1 minuto e tente de novo.";
    case "user-day":
      return en
        ? `You used all of today's requests to Olena. They come back ${reset}.`
        : `Você usou todos os pedidos de hoje à Olena. Eles voltam ${reset}.`;
    case "user-budget": {
      const numbers =
        details.usedCredits !== undefined && details.limitCredits !== undefined
          ? en
            ? ` (${details.usedCredits} of ${details.limitCredits})`
            : ` (${details.usedCredits} de ${details.limitCredits})`
          : "";
      return en
        ? `You used your Olena credits for today${numbers}. Shorter texts cost less. They come back ${reset}.`
        : `Você usou seus créditos de hoje na Olena${numbers}. Textos menores gastam menos. Eles voltam ${reset}.`;
    }
    case "request-too-big": {
      const numbers =
        details.requestCredits !== undefined && details.requestMaxCredits !== undefined
          ? en
            ? ` (it would cost ${details.requestCredits} credits, the limit is ${details.requestMaxCredits})`
            : ` (custaria ${details.requestCredits} créditos e o limite é ${details.requestMaxCredits})`
          : "";
      return en
        ? `This text is too big for a single request${numbers}. Select fewer sources or a shorter file.`
        : `Esse texto é grande demais para um pedido só${numbers}. Selecione menos fontes ou um arquivo menor.`;
    }
    case "busy":
      return en
        ? "Olena is still working on your previous request. Wait for it to finish."
        : "A Olena ainda está fazendo o seu pedido anterior. Espere terminar.";
    case "duplicate":
      return en
        ? "This request was already sent. Start a new one."
        : "Esse pedido já foi enviado. Faça um novo.";
    case "address-day":
    case "address-budget":
      return en
        ? `Too many requests came from your network today. They come back ${reset}.`
        : `Muitos pedidos saíram da sua rede hoje. Eles voltam ${reset}.`;
    case "global-budget":
    case "provider-quota":
      return en
        ? `Olena reached today's free limit. She is back ${reset}.`
        : `A Olena atingiu o limite gratuito de hoje. Ela volta ${reset}.`;
    default:
      return en
        ? "Usage limit reached. Try again later."
        : "Limite de uso atingido. Tente de novo mais tarde.";
  }
}
