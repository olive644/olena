import type { HelenaRequest } from "../ai/helena-contract.js";
import {
  DEFAULT_NEURON_PRICES,
  credits,
  estimateTokens,
  maxOutputTokens,
  neuronsForTokens,
  reserveNeurons,
  type NeuronPrices,
} from "../ai/helena-cost.js";

export { credits, estimateTokens, maxOutputTokens };

// Orçamento diário da Olena em "créditos", que são os neurons da Cloudflare Workers AI. Em vez de
// contar usos (2 por dia por pessoa, seja um texto de uma página ou uma prova inteira), o servidor
// estima o custo de cada pedido pelo tamanho do texto e pelo máximo de tokens da resposta, reserva
// esse valor antes de chamar o modelo e acerta com o que foi gasto de verdade depois. Texto curto
// custa pouco e rende mais usos; texto longo custa mais. A conta é de quem chama (por pessoa e por
// endereço) e tem teto da conta toda. A fórmula do custo está em `ai/helena-cost.ts`, a mesma que o
// app usa para avisar antes de gerar.
//
// Preço: página oficial da Cloudflare, modelo `llama-3.1-8b-instruct-fp8-fast` (conferido em
// 16/11/2026, NÃO conferido de novo): 4.090 neurons por milhão de tokens de entrada e 34.870 por
// milhão de saída. Se trocar `OLENA_TEACHER_MODEL`, ajuste os dois preços (variáveis
// `OLENA_NEURONS_IN_PER_M` e `OLENA_NEURONS_OUT_PER_M`) ou o gasto fica errado.

export const DAY_NEURONS_FREE_TIER = 10_000;

/** Parte da cota gratuita que a Olena pode gastar; o resto é margem de erro da estimativa e voz. */
export const GLOBAL_DAILY_NEURONS = 8_000;
/** Piso diário de cada pessoa, mesmo com o dia cheio. */
export const USER_BASE_NEURONS = 250;
/** Teto diário de uma pessoa, mesmo com a conta vazia. */
export const USER_MAX_NEURONS = 1_000;
/** Fração do que ainda resta na conta que uma pessoa pode usar no dia (parte justa). */
export const USER_FAIR_SHARE = 0.12;
/** Um pedido só, para um texto gigante não esvaziar o dia. */
export const REQUEST_MAX_NEURONS = 300;
/** Uma rede inteira (turma, escola) por dia. */
export const ADDRESS_DAILY_NEURONS = 2_500;

function envPrice(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Neurons por milhão de tokens. Lidos na hora, para o teste poder trocar. */
export function neuronPrices(): NeuronPrices {
  return {
    input: envPrice("OLENA_NEURONS_IN_PER_M", DEFAULT_NEURON_PRICES.input),
    output: envPrice("OLENA_NEURONS_OUT_PER_M", DEFAULT_NEURON_PRICES.output),
  };
}

/** Neurons de um gasto de tokens, com duas casas. */
export function neuronsFor(inputTokens: number, outputTokens: number): number {
  return neuronsForTokens(neuronPrices(), inputTokens, outputTokens);
}

export type RequestEstimate = {
  inputTokens: number;
  maxOutputTokens: number;
  /** Custo de reserva: a entrada, 70% da saída máxima e 20% de folga. */
  neurons: number;
};

/** Estima o custo de um pedido já validado, antes de chamar o modelo. */
export function estimateRequest(
  request: Pick<HelenaRequest, "capability" | "prompt" | "sources">,
  count = 10,
): RequestEstimate {
  const chars =
    request.prompt.length +
    request.sources.reduce(
      (total, source) => total + source.content.length + source.title.length,
      0,
    );
  return reserveNeurons(neuronPrices(), request.capability, chars, count);
}

/**
 * O que uma pessoa pode gastar hoje: a parte justa do que ainda resta na conta, entre o piso e o
 * teto. Com o dia vazio, quem usa muito pode ir longe; com o dia cheio, todos voltam ao piso.
 */
export function userDailyCap(globalUsed: number): number {
  const remaining = Math.max(0, GLOBAL_DAILY_NEURONS - globalUsed);
  return Math.min(
    USER_MAX_NEURONS,
    Math.max(USER_BASE_NEURONS, Math.round(remaining * USER_FAIR_SHARE)),
  );
}

export type BudgetSnapshot = {
  usedNeurons: number;
  limitNeurons: number;
  remainingNeurons: number;
  /** Quanto um pedido máximo custa, para a tela avisar antes de gerar. */
  requestMaxNeurons: number;
  resetInSeconds: number;
};
