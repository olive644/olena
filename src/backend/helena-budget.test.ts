import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GLOBAL_DAILY_NEURONS,
  REQUEST_MAX_NEURONS,
  USER_BASE_NEURONS,
  USER_MAX_NEURONS,
  credits,
  estimateRequest,
  estimateTokens,
  maxOutputTokens,
  neuronsFor,
  userDailyCap,
} from "./helena-budget";

afterEach(() => vi.unstubAllEnvs());

const request = (
  chars: number,
  capability: "summarize" | "flashcards" | "quiz" | "exam" = "summarize",
) => ({
  capability,
  prompt: "Resuma.",
  sources: [{ id: "a", kind: "material" as const, title: "Aula", content: "x".repeat(chars) }],
});

describe("orçamento da Olena em créditos", () => {
  it("usa o preço oficial por milhão de tokens (entrada e saída)", () => {
    expect(neuronsFor(1_000_000, 0)).toBe(4090);
    expect(neuronsFor(0, 1_000_000)).toBe(34870);
    expect(neuronsFor(8000, 1500)).toBeCloseTo(32.72 + 52.3, 1);
  });

  it("o preço pode ser trocado por variável quando o modelo mudar", () => {
    vi.stubEnv("OLENA_NEURONS_IN_PER_M", "1000");
    vi.stubEnv("OLENA_NEURONS_OUT_PER_M", "2000");
    expect(neuronsFor(1_000_000, 1_000_000)).toBe(3000);
    vi.stubEnv("OLENA_NEURONS_IN_PER_M", "nao é número");
    expect(neuronsFor(1_000_000, 0)).toBe(4090);
  });

  it("estima tokens de forma conservadora e nunca negativa", () => {
    expect(estimateTokens(3000)).toBe(1000);
    expect(estimateTokens(0)).toBe(0);
    expect(estimateTokens(-5)).toBe(0);
  });

  it("texto curto custa pouco e texto longo custa mais, sempre dentro do teto de um pedido", () => {
    const small = estimateRequest(request(500));
    const big = estimateRequest(request(36_000));
    expect(small.neurons).toBeLessThan(big.neurons);
    expect(small.neurons).toBeLessThan(70);
    expect(big.neurons).toBeLessThan(REQUEST_MAX_NEURONS);
    // o pedido máximo (36.000 caracteres, quiz de 20 questões) ainda cabe no teto de um pedido
    expect(estimateRequest(request(36_000, "quiz"), 20).neurons).toBeLessThan(REQUEST_MAX_NEURONS);
  });

  it("a saída máxima acompanha o tipo e a quantidade pedida", () => {
    expect(maxOutputTokens("summarize")).toBe(1600);
    expect(maxOutputTokens("flashcards")).toBe(1600);
    expect(maxOutputTokens("quiz", 5)).toBe(1450);
    expect(maxOutputTokens("exam", 20)).toBe(3800);
    expect(maxOutputTokens("tutor")).toBe(700);
  });

  it("a reserva cobre a entrada, 70% da saída máxima e uma folga, e fica abaixo do pior caso cheio", () => {
    const estimate = estimateRequest(request(8000));
    const worst = neuronsFor(estimate.inputTokens, estimate.maxOutputTokens);
    const typical = neuronsFor(estimate.inputTokens, estimate.maxOutputTokens * 0.4);
    expect(estimate.neurons).toBeGreaterThan(typical);
    expect(estimate.neurons).toBeLessThan(worst * 1.2);
  });

  it("a parte justa de cada pessoa cresce com o dia vazio e volta ao piso com o dia cheio", () => {
    expect(userDailyCap(0)).toBeGreaterThan(USER_BASE_NEURONS);
    expect(userDailyCap(0)).toBeLessThanOrEqual(USER_MAX_NEURONS);
    expect(userDailyCap(GLOBAL_DAILY_NEURONS * 0.5)).toBeLessThan(userDailyCap(0));
    expect(userDailyCap(GLOBAL_DAILY_NEURONS)).toBe(USER_BASE_NEURONS);
    expect(userDailyCap(GLOBAL_DAILY_NEURONS * 3)).toBe(USER_BASE_NEURONS);
  });

  it("o teto da conta fica abaixo da cota gratuita, com margem para erro de estimativa", () => {
    expect(GLOBAL_DAILY_NEURONS).toBeLessThanOrEqual(10_000 * 0.85);
    // mesmo vários pedidos máximos não passam do teto de uma pessoa por acidente
    expect(USER_MAX_NEURONS).toBeGreaterThanOrEqual(REQUEST_MAX_NEURONS);
  });

  it("créditos são neurons arredondados para cima", () => {
    expect(credits(0)).toBe(0);
    expect(credits(0.01)).toBe(1);
    expect(credits(12)).toBe(12);
    expect(credits(12.01)).toBe(13);
  });
});
