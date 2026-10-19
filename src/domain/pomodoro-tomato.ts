/** Mordidas que o tomate do Pomodoro leva ao longo de um ciclo de foco, qualquer que seja a duração. */
export const TOMATO_BITES = 8;

/**
 * Etapa do tomate (0 = inteiro, 8 = só o miolo e a folha) para a fração de tempo que falta.
 * A mordida k chega quando k oitavos do tempo escolhido já passaram, então 25 ou 50 minutos
 * mostram a mesma sequência, só que mais devagar ou mais depressa.
 */
export function tomatoStage(remainingFraction: number): number {
  const eaten = Math.floor((1 - remainingFraction) * TOMATO_BITES + 1e-9);
  return Math.max(0, Math.min(TOMATO_BITES, eaten));
}

/**
 * Medidas da imagem estática do tomate, em pixels, geradas por scripts/tomato-rive/art.cjs
 * (conferidas contra layers.json em pomodoro-tomato.test.ts).
 */
export const TOMATO_ART = { staticWidth: 454, staticHeight: 430 } as const;
