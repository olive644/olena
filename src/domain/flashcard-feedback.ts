import type { FalseKind } from "./pdf-summary/true-false";

// Fase A do ciclo de qualidade: contadores por tipo de cartão, só neste aparelho e sem nenhum texto.
// Servem para saber qual gerador de afirmação falha mais (descartes e motivos) e ajustar as regras.

export const CARD_ORIGINS = [
  "true",
  "definition",
  "number",
  "negation",
  "opposite",
  "exam",
] as const;
export type CardOrigin = "true" | FalseKind | "exam";

export const FEEDBACK_REASONS = [
  "nonsense",
  "obvious",
  "actually-true",
  "grammar",
  "loose",
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export type OriginStats = {
  kept: number;
  discarded: number;
  edited: number;
  reasons: Partial<Record<FeedbackReason, number>>;
};
export type FeedbackStore = Partial<Record<CardOrigin, OriginStats>>;
export type FeedbackEvent =
  { type: "kept" } | { type: "edited" } | { type: "discarded"; reason?: FeedbackReason };

const KEY = "helena.flashcardFeedback.v1";

export function recordFeedback(
  store: FeedbackStore,
  origin: CardOrigin,
  event: FeedbackEvent,
): FeedbackStore {
  const before = store[origin] ?? { kept: 0, discarded: 0, edited: 0, reasons: {} };
  const next: OriginStats = { ...before, reasons: { ...before.reasons } };
  if (event.type === "kept") next.kept += 1;
  else if (event.type === "edited") next.edited += 1;
  else {
    next.discarded += 1;
    if (event.reason) next.reasons[event.reason] = (next.reasons[event.reason] ?? 0) + 1;
  }
  return { ...store, [origin]: next };
}

/** Parte dos cartões deste tipo que o usuário descartou ou editou (0 a 1). */
export function rejectionRate(stats: OriginStats | undefined): number {
  if (!stats) return 0;
  const total = stats.kept + stats.discarded + stats.edited;
  return total === 0 ? 0 : (stats.discarded + stats.edited) / total;
}

const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;

/** Lê o que foi salvo ignorando qualquer coisa fora do formato. Nunca lança. */
export function loadFeedback(): FeedbackStore {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (typeof raw !== "object" || raw === null) return {};
    const store: FeedbackStore = {};
    for (const origin of CARD_ORIGINS) {
      const item = (raw as Record<string, unknown>)[origin];
      if (typeof item !== "object" || item === null) continue;
      const stats = item as Record<string, unknown>;
      const reasons: Partial<Record<FeedbackReason, number>> = {};
      const saved = stats["reasons"];
      if (typeof saved === "object" && saved !== null)
        for (const reason of FEEDBACK_REASONS) {
          const value = count((saved as Record<string, unknown>)[reason]);
          if (value) reasons[reason] = value;
        }
      store[origin] = {
        kept: count(stats["kept"]),
        discarded: count(stats["discarded"]),
        edited: count(stats["edited"]),
        reasons,
      };
    }
    return store;
  } catch {
    return {};
  }
}

export function saveFeedback(store: FeedbackStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // sem armazenamento (janela privada, cota): o contador é opcional
  }
}

/** Registra um evento e salva. */
export function noteFeedback(origin: CardOrigin | undefined, event: FeedbackEvent): void {
  if (!origin) return;
  saveFeedback(recordFeedback(loadFeedback(), origin, event));
}
