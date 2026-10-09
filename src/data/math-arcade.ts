export type ArithmeticQuestion = {
  expression: string;
  answer: number;
  choices: number[];
  stage: string;
};

/** Apenas operações básicas. Divisões sempre exatas, sem resultados negativos. */
export function createArithmeticQuestion(
  correct: number,
  random = Math.random,
): ArithmeticQuestion {
  const integer = (maximum: number) => Math.floor(random() * maximum) + 1;
  const stage = Math.min(3, Math.floor(correct / 5));
  const operation = stage < 3 ? stage : Math.floor(random() * 4);
  let left = integer(stage === 0 ? 10 : 12);
  let right = integer(stage === 0 ? 10 : 12);
  let answer: number;
  const signs = ["+", "−", "×", "÷"];
  if (operation === 0) answer = left + right;
  else if (operation === 1) {
    if (right > left) [left, right] = [right, left];
    answer = left - right;
  } else if (operation === 2) answer = left * right;
  else {
    answer = left;
    left *= right;
  }
  const choices = [answer, answer + 1, answer + 2, answer > 0 ? answer - 1 : 3];
  for (let index = choices.length - 1; index > 0; index--) {
    const destination = Math.floor(random() * (index + 1));
    [choices[index], choices[destination]] = [choices[destination]!, choices[index]!];
  }
  return {
    expression: `${left} ${signs[operation]} ${right}`,
    answer,
    choices,
    stage: ["Primeiras somas", "Subtrações", "Multiplicações", "Operações misturadas"][stage]!,
  };
}

export function arithmeticPoints(streak: number): number {
  return 10 + Math.min(5, Math.max(0, streak - 1)) * 2;
}
