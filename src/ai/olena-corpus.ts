// Currículo público sintético. Nunca recebe conversas ou dados de alunos.
export const lessons = Array.from({ length: 40 }, (_, index) => {
  const a = index + 3;
  const b = (index % 9) + 2;
  const multiply = index % 2 === 1;
  return {
    id: `basic-math-${index + 1}`,
    prompt: `Explique para um aluno como resolver ${a} ${multiply ? "×" : "+"} ${b}. Dê passos curtos, sem dados pessoais.`,
    reference: `${a} ${multiply ? "×" : "+"} ${b} = ${multiply ? a * b : a + b}`,
  };
});

export function passesArithmeticCheck(answer: string, reference: string): boolean {
  const normalize = (value: string) => value.replace(/[x*]/g, "×").replace(/\s/g, "");
  if (!answer.trim() || answer.length > 12000 || !normalize(answer).includes(normalize(reference)))
    return false;
  const equations = answer.matchAll(/(\d+)\s*([+×x*])\s*(\d+)\s*=\s*(\d+)/g);
  for (const equation of equations) {
    const a = Number(equation[1]);
    const b = Number(equation[3]);
    if ((equation[2] === "+" ? a + b : a * b) !== Number(equation[4])) return false;
  }
  return true;
}
