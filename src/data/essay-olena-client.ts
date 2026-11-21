import { HELENA_ESSAY_MAX_LENGTH, type HelenaRequest } from "../ai/helena-contract";
import { estimateCredits } from "../ai/helena-cost";
import { parseEssayReview, type EssayReview } from "../ai/essay-output";
import { getFirebaseAccountServices } from "./firebase-account";
import { HelenaClientError, requestHelena } from "./helena-client";

// Pedido de comentários da Olena para uma redação. O texto só sai daqui no toque do botão, com a
// conta de verdade. O servidor monta as instruções; daqui vão só a redação e o tema, como dados.

export type EssayReviewFailure = "signed-out" | "limit" | "unavailable" | "format";

export class EssayReviewError extends Error {
  readonly kind: EssayReviewFailure;
  constructor(kind: EssayReviewFailure, message: string) {
    super(message);
    this.name = "EssayReviewError";
    this.kind = kind;
  }
}

/** A redação que vai ao servidor: o contrato aceita até 6.000 caracteres. */
export function essayForOlena(text: string): string {
  return text.trim().slice(0, HELENA_ESSAY_MAX_LENGTH);
}

export function buildEssayRequest(text: string, topic?: string): HelenaRequest {
  const sources: HelenaRequest["sources"] = [
    { id: "essay", kind: "material", title: "Redação", content: essayForOlena(text) },
  ];
  const title = topic?.trim();
  if (title)
    sources.push({ id: "topic", kind: "note", title: "Tema", content: title.slice(0, 600) });
  return {
    version: 1,
    capability: "essay",
    prompt: "Comentar a redação por competência.",
    sources,
    privacy: { consent: true, retention: "none" },
  };
}

/** Créditos que o pedido pode gastar (um teto: o gasto real costuma ser menor). */
export function estimateEssayCredits(text: string, topic?: string): number {
  const request = buildEssayRequest(text, topic);
  const chars = request.sources.reduce((total, source) => total + source.content.length, 0);
  return estimateCredits("essay", chars);
}

export type EssayReviewRequester = (text: string, topic?: string) => Promise<EssayReview>;

export const requestEssayReview: EssayReviewRequester = async (text, topic) => {
  const services = await getFirebaseAccountServices().catch(() => undefined);
  const user = services?.auth.currentUser;
  if (!user || user.isAnonymous)
    throw new EssayReviewError("signed-out", "Entre na sua conta para pedir comentários da Olena.");
  const token = await user.getIdToken();
  const sent = essayForOlena(text);
  try {
    const response = await requestHelena(buildEssayRequest(text, topic), {
      token,
      signal: AbortSignal.timeout(58_000),
    });
    const review = parseEssayReview(response.answer, sent, { allowScore: true, detail: false });
    if (!review)
      throw new EssayReviewError(
        "format",
        "A Olena respondeu em um formato inesperado. Tente de novo.",
      );
    return review;
  } catch (error) {
    if (error instanceof EssayReviewError) throw error;
    if (error instanceof HelenaClientError && error.code === "rate_limited")
      throw new EssayReviewError("limit", error.message);
    throw new EssayReviewError(
      "unavailable",
      "A Olena não respondeu agora. Tente de novo; um pedido que falha não gasta créditos.",
    );
  }
};
