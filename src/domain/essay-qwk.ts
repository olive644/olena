// Concordância entre a nota da IA e a dos corretores humanos (kappa ponderado quadrático, QWK), na
// escala da prova: 0 a 200 em passos de 40 (6 classes). Só para a medição de pesquisa
// (scripts/measure-essay-olena.mjs); nada disto aparece na interface.

export const SCORE_CLASSES = 6;

/** Nota em pontos (0 a 200) para a classe 0 a 5; arredonda para o múltiplo de 40 mais próximo. */
export function scoreClass(points: number): number {
  return Math.min(SCORE_CLASSES - 1, Math.max(0, Math.round(points / 40)));
}

/**
 * QWK de dois avaliadores. `undefined` quando não há pares ou quando a concordância esperada é zero
 * (um dos lados deu sempre a mesma nota, então o kappa não é definido).
 */
export function quadraticWeightedKappa(
  human: readonly number[],
  model: readonly number[],
): number | undefined {
  if (human.length !== model.length || human.length === 0) return undefined;
  const total = human.length;
  const observed = Array.from({ length: SCORE_CLASSES }, () =>
    new Array<number>(SCORE_CLASSES).fill(0),
  );
  const rowSum = new Array<number>(SCORE_CLASSES).fill(0);
  const colSum = new Array<number>(SCORE_CLASSES).fill(0);
  human.forEach((value, index) => {
    const a = scoreClass(value * 40);
    const b = scoreClass((model[index] ?? 0) * 40);
    observed[a]![b]! += 1;
    rowSum[a]! += 1;
    colSum[b]! += 1;
  });
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < SCORE_CLASSES; i += 1) {
    for (let j = 0; j < SCORE_CLASSES; j += 1) {
      const weight = ((i - j) / (SCORE_CLASSES - 1)) ** 2;
      numerator += weight * (observed[i]![j]! / total);
      denominator += weight * ((rowSum[i]! * colSum[j]!) / (total * total));
    }
  }
  return denominator === 0 ? undefined : 1 - numerator / denominator;
}

export type ScoreDisplay = "number" | "range" | "level-only";

/**
 * Regra fixada ANTES de ver o resultado (docs/REDACAO_IA.md): QWK médio de 0,40 ou mais mostra o
 * número como estimativa; de 0,30 a 0,40 mostra uma faixa; abaixo de 0,30, só o nível.
 */
export function scoreDisplayFor(meanQwk: number | undefined): ScoreDisplay {
  if (meanQwk === undefined || Number.isNaN(meanQwk)) return "level-only";
  if (meanQwk >= 0.4) return "number";
  if (meanQwk >= 0.3) return "range";
  return "level-only";
}
