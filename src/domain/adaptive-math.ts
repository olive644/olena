import { MATH_COURSES, type MathCourseId, type MathProgress } from "../data/math-courses.js";

export type MathQuestion = {
  expression: string;
  answer: number;
  choices: number[];
  topic: string;
  budget: number;
  drain: number;
};
export type MathChallenge = MathQuestion & { seed: number };
export function mathChallenge(
  course: MathCourseId,
  progress: MathProgress,
  seed = Math.floor(Math.random() * 2147483646) + 1,
): MathChallenge {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  return { ...mathQuestion(course, progress, random), seed };
}

/** Conteúdo matemático calculado, não texto de IA. Resultados exatos e distratores distintos. */
export function mathQuestion(
  course: MathCourseId,
  progress: MathProgress,
  random = Math.random,
): MathQuestion {
  const n = (max: number) => 1 + Math.floor(random() * max);
  const level = progress.level;
  const a = n(5 + level * 2),
    b = n(5 + level),
    c = n(4);
  let expression = "",
    answer = 0;
  if (course === "foundations") {
    if (level === 0) {
      expression = `${a} + ${b}`;
      answer = a + b;
    }
    if (level === 1) {
      expression = `${a + b} − ${b}`;
      answer = a;
    }
    if (level === 2) {
      expression = `${a} × ${b}`;
      answer = a * b;
    }
    if (level === 3) {
      expression = `${a * b} ÷ ${b}`;
      answer = a;
    }
    if (level === 4) {
      expression = `1/${b} de ${a * b}`;
      answer = a;
    }
    if (level === 5) {
      expression = `${b * 10}% de ${a * 10}`;
      answer = a * b;
    }
  } else if (course === "school") {
    if (level === 0) {
      expression = `x + ${b} = ${a + b}. x = ?`;
      answer = a;
    }
    if (level === 1) {
      expression = `${a}²`;
      answer = a * a;
    }
    if (level === 2) {
      expression = `f(x) = ${a}x + ${b}. f(${c}) = ?`;
      answer = a * c + b;
    }
    if (level === 3) {
      expression = `Área de um retângulo ${a} × ${b}`;
      answer = a * b;
    }
    if (level === 4) {
      expression = `PA: ${a}, ${a + b}, ${a + b * 2}, ?`;
      answer = a + b * 3;
    }
    if (level === 5) {
      expression = `${c} de 4 fichas são azuis. Chance de azul, em %`;
      answer = c * 25;
    }
  } else if (course === "advanced") {
    if (level === 0) {
      expression = `f(x) = x². f(${a}) = ?`;
      answer = a * a;
    }
    if (level === 1) {
      expression = `log₂(${2 ** c})`;
      answer = c;
    }
    if (level === 2) {
      expression = `${a} sen(90°) + ${b} cos(0°)`;
      answer = a + b;
    }
    if (level === 3) {
      expression = `(${a}, ${b}) · (${c}, 1)`;
      answer = a * c + b;
    }
    if (level === 4) {
      expression = `f(x)=x+${a}, g(x)=${b}x. f(g(${c})) = ?`;
      answer = b * c + a;
    }
    if (level === 5) {
      expression = `f(x)=${a}x. [f(${b + 1})−f(${b})]/1 = ?`;
      answer = a;
    }
  } else if (course === "calculus1") {
    if (level === 0) {
      expression = `lim x→${c} (${a}x + ${b})`;
      answer = a * c + b;
    }
    if (level === 1) {
      expression = `f(x)=${a}x. f′(${b}) = ?`;
      answer = a;
    }
    if (level === 2) {
      expression = `f(x)=${a}x². f′(${c}) = ?`;
      answer = 2 * a * c;
    }
    if (level === 3) {
      expression = `f(x)=${a}x²+${b}x. f′(${c}) = ?`;
      answer = 2 * a * c + b;
    }
    if (level === 4) {
      expression = `Inclinação da tangente a y=x² em x=${a}`;
      answer = 2 * a;
    }
    if (level === 5) {
      expression = `f(x)=(x−${a})². x do mínimo = ?`;
      answer = a;
    }
  } else if (course === "calculus2") {
    if (level === 0) {
      expression = `F′(x)=${2 * a}x, F(0)=0. F(${c}) = ?`;
      answer = a * c * c;
    }
    if (level === 1) {
      expression = `∫₀^${b} ${a} dx`;
      answer = a * b;
    }
    if (level === 2) {
      expression = `Área sob y=2x entre 0 e ${c}`;
      answer = c * c;
    }
    if (level === 3) {
      expression = `∫₀^${c} (2x + ${a}) dx`;
      answer = c * c + a * c;
    }
    if (level === 4) {
      expression = `Volume/π ao girar y=1, 0≤x≤${a}`;
      answer = a;
    }
    if (level === 5) {
      expression = `∫₀^${c} x dx`;
      answer = (c * c) / 2;
    }
  } else {
    if (level === 0) {
      expression = `f(x,y)=x+y. f(${a},${b}) = ?`;
      answer = a + b;
    }
    if (level === 1) {
      expression = `f(x,y)=${a}x²+y. ∂f/∂x em x=${c}`;
      answer = 2 * a * c;
    }
    if (level === 2) {
      expression = `f(x,y)=x²+y². ∂f/∂y em (${a},${b})`;
      answer = 2 * b;
    }
    if (level === 3) {
      expression = `(${a},${b},1) · (1,1,${c})`;
      answer = a + b + c;
    }
    if (level === 4) {
      expression = `F=(${a}x,${b}y,${c}z). div F = ?`;
      answer = a + b + c;
    }
    if (level === 5) {
      expression = `∫₀^${a} ∫₀^${b} 1 dy dx`;
      answer = a * b;
    }
  }
  const choices = [answer, answer + 1, answer + 2, answer === 0 ? 3 : answer - 1];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }
  return {
    expression,
    answer,
    choices,
    topic: MATH_COURSES.find((item) => item.id === course)!.topics[level]!,
    budget: 14 + level * 3,
    drain: 1 + level * 0.16,
  };
}

export function assessMath(
  progress: MathProgress,
  question: MathQuestion,
  choice: number,
  elapsed: number,
  streak: number,
) {
  const correct = choice === question.answer;
  const fast = elapsed <= (question.budget / question.drain) * 0.32;
  const nextStreak = correct ? streak + 1 : 0;
  const points = correct
    ? 10 + progress.level * 4 + (fast ? 6 : 0) + Math.min(5, nextStreak) * 2
    : 0;
  const mastery = correct ? progress.mastery + (fast ? 2 : 1) : Math.max(0, progress.mastery - 1);
  const advance = mastery >= 4 && progress.level < 5;
  return {
    correct,
    fast,
    points,
    streak: nextStreak,
    message: correct
      ? fast
        ? "MUITO RÁPIDO!"
        : elapsed < question.budget * 0.7
          ? "WOW! BOA!"
          : "BOA, NO SEU RITMO!"
      : "Poxa! Quem sabe na próxima!",
    progress: {
      ...progress,
      level: progress.level + Number(advance),
      mastery: advance ? 0 : Math.min(3, mastery),
      correct: progress.correct + Number(correct),
    },
  };
}
