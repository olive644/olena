import type { HelenaRequest } from "./helena-contract.js";

// Custo estimado de um pedido à Olena, em neurons (a unidade da cota gratuita da Cloudflare),
// que a tela mostra como "créditos". A conta é a mesma no servidor (`backend/helena-budget.ts`) e
// no app, para o aviso de antes de gerar bater com o que o servidor vai reservar.

/** Neurons por milhão de tokens, página oficial da Cloudflare para o modelo padrão (16/11/2026). */
export const DEFAULT_NEURON_PRICES = { input: 4_090, output: 34_870 } as const;
export type NeuronPrices = { input: number; output: number };

/** Caracteres por token: 3 é conservador para português e texto de OCR (o comum é 3,5 a 4). */
export const CHARS_PER_TOKEN = 3;
/** Política do sistema, instruções e formato: acrescentam isto à entrada de todo pedido. */
export const PROMPT_OVERHEAD_TOKENS = 700;
/** Parte da saída máxima que a reserva cobre, e a folga sobre a reserva. */
export const OUTPUT_RESERVE_SHARE = 0.7;
export const RESERVE_MARGIN = 1.2;

export const estimateTokens = (chars: number) => Math.ceil(Math.max(0, chars) / CHARS_PER_TOKEN);

/** Neurons de um gasto de tokens, com duas casas. */
export function neuronsForTokens(
  prices: NeuronPrices,
  inputTokens: number,
  outputTokens: number,
): number {
  const neurons = (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000;
  return Math.round(neurons * 100) / 100;
}

/** Máximo de tokens de resposta que o servidor aceita de cada tipo de pedido. */
export function maxOutputTokens(capability: HelenaRequest["capability"], count = 10): number {
  if (capability === "summarize") return 1_600;
  if (capability === "flashcards") return 1_600;
  // Só o nível e a nota das cinco competências, sem comentários (as observações ficam para o Olena Pro).
  if (capability === "essay") return 600;
  if (capability === "quiz" || capability === "exam") return Math.min(3_800, 500 + count * 190);
  return 700;
}

/**
 * Custo de reserva de um pedido: a entrada inteira, 70% da saída máxima e 20% de folga. A resposta
 * quase nunca enche o máximo de tokens; depois do pedido, o gasto real acerta a conta.
 */
export function reserveNeurons(
  prices: NeuronPrices,
  capability: HelenaRequest["capability"],
  inputChars: number,
  count = 10,
) {
  const inputTokens = estimateTokens(inputChars) + PROMPT_OVERHEAD_TOKENS;
  const output = maxOutputTokens(capability, count);
  const reserve =
    neuronsForTokens(prices, inputTokens, 0) +
    neuronsForTokens(prices, 0, output) * OUTPUT_RESERVE_SHARE;
  return {
    inputTokens,
    maxOutputTokens: output,
    neurons: Math.ceil(reserve * RESERVE_MARGIN * 100) / 100,
  };
}

/** Créditos que a pessoa vê: neurons arredondados para cima. */
export const credits = (neurons: number) => Math.max(0, Math.ceil(neurons - 1e-9));

/** Estimativa para a tela, com o preço padrão: créditos de um pedido com este tamanho de texto. */
export function estimateCredits(
  capability: HelenaRequest["capability"],
  inputChars: number,
  count = 10,
): number {
  return credits(reserveNeurons(DEFAULT_NEURON_PRICES, capability, inputChars, count).neurons);
}
