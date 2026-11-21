import type { CardOrigin } from "./flashcard-feedback";
import { CARD_ORIGINS } from "./flashcard-feedback";

// Fase C: um classificador minúsculo (regressão logística) que aprende neste aparelho quais cartões
// o usuário costuma descartar ou editar e passa a deixar de fora os parecidos. Não é um modelo de
// linguagem: usa 14 números por cartão (tipo, tamanho, pontuação...) e nunca guarda o texto.

export const FEATURE_COUNT = CARD_ORIGINS.length + 9;
/** Avaliações mínimas antes de o filtro agir. Antes disso ele não esconde nada. */
export const MIN_SAMPLES = 30;
/** Chance de rejeição a partir da qual o cartão fica de fora. */
export const HIDE_ABOVE = 0.8;

export type QualityModel = { weights: number[]; samples: number };

const KEY = "helena.flashcardQuality.v1";

export function emptyModel(): QualityModel {
  return { weights: new Array<number>(FEATURE_COUNT).fill(0), samples: 0 };
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Características numéricas do cartão. O texto é lido aqui e descartado. */
export function cardFeatures(front: string, back: string, origin: CardOrigin): number[] {
  const words = front.trim().split(/\s+/).filter(Boolean);
  const capitals = words.slice(1).filter((word) => /^\p{Lu}/u.test(word)).length;
  return [
    ...CARD_ORIGINS.map((item) => (item === origin ? 1 : 0)),
    1,
    clamp01(front.length / 300),
    clamp01(words.length / 50),
    words.length > 1 ? capitals / (words.length - 1) : 0,
    /\d/.test(front) ? 1 : 0,
    clamp01((front.match(/,/g)?.length ?? 0) / 5),
    /[()]/.test(front) ? 1 : 0,
    clamp01(back.length / 400),
    /[:;]/.test(front) ? 1 : 0,
  ];
}

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

/** Chance (0 a 1) de o usuário descartar ou editar este cartão. */
export function predictReject(model: QualityModel, features: readonly number[]): number {
  return sigmoid(
    model.weights.reduce((sum, weight, index) => sum + weight * (features[index] ?? 0), 0),
  );
}

/** Um passo de aprendizado com a resposta do usuário (1 = descartou ou editou, 0 = aceitou). */
export function learn(
  model: QualityModel,
  features: readonly number[],
  rejected: 0 | 1,
  rate = 0.3,
): QualityModel {
  const error = predictReject(model, features) - rejected;
  return {
    samples: model.samples + 1,
    weights: model.weights.map((weight, index) =>
      Math.min(8, Math.max(-8, weight - rate * (error * (features[index] ?? 0) + 0.002 * weight))),
    ),
  };
}

/** O cartão fica de fora? Só depois de avaliações suficientes. */
export function shouldHide(model: QualityModel, features: readonly number[]): boolean {
  return model.samples >= MIN_SAMPLES && predictReject(model, features) > HIDE_ABOVE;
}

export function loadModel(): QualityModel {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (typeof raw !== "object" || raw === null) return emptyModel();
    const { weights, samples } = raw as Record<string, unknown>;
    if (
      !Array.isArray(weights) ||
      weights.length !== FEATURE_COUNT ||
      !weights.every((item) => typeof item === "number" && Number.isFinite(item)) ||
      typeof samples !== "number" ||
      !Number.isSafeInteger(samples) ||
      samples < 0
    )
      return emptyModel();
    return { weights: weights as number[], samples };
  } catch {
    return emptyModel();
  }
}

export function saveModel(model: QualityModel): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(model));
  } catch {
    // sem armazenamento: o aprendizado é opcional
  }
}

export function resetModel(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada a apagar
  }
}

/** Aprende com um sinal do usuário sobre um cartão e salva. */
export function learnFromSignal(
  card: { front: string; back: string; origin?: CardOrigin | undefined },
  rejected: boolean,
): void {
  if (!card.origin) return;
  saveModel(learn(loadModel(), cardFeatures(card.front, card.back, card.origin), rejected ? 1 : 0));
}
