// Limites diários da Olena e o texto que a pessoa lê quando um deles acaba. A cota gratuita da
// Cloudflare (10.000 neurons por dia, zerada à 00:00 UTC, que é 21h em Brasília) é da conta toda.

/**
 * Resumo, flashcards, quiz e simulado da Biblioteca. Cada tipo pode ser gerado 2 vezes por dia por
 * pessoa. O teto global é o que protege a conta: as estimativas abaixo vêm da cota gratuita da
 * Cloudflare (10.000 neurons por dia para a conta toda) e de um pedido de cerca de 8.000 tokens de
 * entrada e 1.500 de saída. Valores NÃO verificados no painel: ajuste com o uso medido.
 */
export const STUDY_USER_DAILY_LIMIT = 2;
export const STUDY_GLOBAL_DAILY_LIMIT = 40;
export const GLOBAL_DAILY_LIMIT = 100;
// Uma turma atrás do mesmo endereço (30 alunos a até 8 pedidos cada) cabe em 250 por dia.
export const ADDRESS_DAILY_LIMIT = 250;
export const DAY_SECONDS = 86_400;

export type RateLimitName =
  | "user-minute"
  | "user-day"
  | "address-day"
  | "study-user-day"
  | "study-day"
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
  pt: "A conversa com a Olena foi desligada para economizar a cota gratuita. Ela só gera resumo, flashcards, quiz e simulado na Biblioteca.",
  en: "Chatting with Olena was turned off to save the free quota. She only makes summaries, flashcards, quizzes and mock exams in the Library.",
} as const;

const CAPABILITY_NAME = {
  pt: { summarize: "resumos", flashcards: "flashcards", quiz: "quizzes", exam: "simulados" },
  en: {
    summarize: "summaries",
    flashcards: "flashcards",
    quiz: "quizzes",
    exam: "mock exams",
  },
} as const;

export function quotaMessage(
  limit: RateLimitName | undefined,
  capability: string,
  language: NoticeLanguage = "pt",
): string {
  const en = language === "en";
  const reset = en ? "at 9 pm (Brasília time)" : "às 21h (horário de Brasília)";
  const names = CAPABILITY_NAME[language] as Record<string, string>;
  const name = names[capability] ?? (en ? "requests" : "pedidos");
  switch (limit) {
    case "user-minute":
      return en
        ? "You made too many requests in a short time. Wait 1 minute and try again."
        : "Você fez muitos pedidos em pouco tempo. Espere 1 minuto e tente de novo.";
    case "user-day":
      return en
        ? `You used all of today's requests to Olena. They come back ${reset}.`
        : `Você usou todos os pedidos de hoje à Olena. Eles voltam ${reset}.`;
    case "study-user-day":
      return en
        ? `You already made ${STUDY_USER_DAILY_LIMIT} ${name} with Olena today. They come back ${reset}.`
        : `Você já fez ${STUDY_USER_DAILY_LIMIT} ${name} com a Olena hoje. Eles voltam ${reset}.`;
    case "address-day":
      return en
        ? `Too many requests came from your network today. They come back ${reset}.`
        : `Muitos pedidos saíram da sua rede hoje. Eles voltam ${reset}.`;
    case "study-day":
    case "global-day":
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
