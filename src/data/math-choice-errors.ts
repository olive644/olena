import type { MathCourseId } from "./math-courses.js";

type Errors = (n: number, answer: number) => readonly number[];
// Uma linha por formato original. Candidatos vêm das operações do enunciado,
// não de uma lista comum a toda a disciplina. Colisões são removidas pelo banco.
const ERRORS: Record<MathCourseId, readonly (readonly Errors[])[]> = {
  foundations: [
    [
      (n, a) => [a - 10, a + 10, a - 1, a + 1], // Transporte e contagem.
      (n, a) => [4 * n + 13, 3 * n + 9, a - 1, a + 1],
      (n, a) => [n + 7, a - 1, a + 1, a + 10],
      (n, a) => [2 * n + 8, 2 * n + 6, 2 * n + 2, a + 10],
    ],
    [
      (n, a) => [a + 10, a - 1, a + 1, 5 * n + 12],
      (n, a) => [4 * n + 10, 3 * n + 8, a - 1, a + 1],
      (n, a) => [5 * n, 2 * n, a - 1, a + 1],
      (n, a) => [4 * n + 17, 3 * n + 10, a - 1, a + 1],
    ],
    [
      (n, a) => [2 * n + 5, a - n - 2, a - n - 3, a + n + 2],
      (n, a) => [2 * n + 5, a - n, a + n, n + 5],
      (n, a) => [2 * n + 6, a - 1, a + 1, (n + 2) ** 2],
      (n) => [5 * (n + 3), 2 * (n + 3), 3 * (n + 3), 6 * n + 3],
    ],
    [
      (n, a) => [n, a - 1, a + 1, n * (n + 3)],
      (n, a) => [n + 5, a - 1, a + 1, n * (n + 5)],
      (n, a) => [n + 4, a - 1, a + 1, (n + 2) * (n + 4)],
      (n, a) => [a + 1, a + 0.5, 2, 4 * n + 2],
    ],
    [
      (n) => [9 * n, 4 * n, 6 * n, 12 * n],
      (n) => [2 * n, 4 * n, 8 * n, 3 * n],
      (n) => [2 * n, 3 * n, n, 6 * n],
      (n) => [3 * n, 8 * n, 4 * n, 7 * n],
    ],
    [
      (n) => [15 * n, 20 * n - 25, 4 * n, 25 * n],
      (n) => [4 * n, 20 * n - 20, 24 * n, 18 * n],
      () => [75, 4, 0.25, 33.33],
      (n) => [3 * n, 10 * n + 30, 7 * n, 10.3 * n],
    ],
  ],
  school: [
    [
      (n) => [4 * n, 6 + 4 / n, 4 * n + 2, 5 * n + 2],
      (n) => [4 * n, 3 * n, 6 * n, 8 * n],
      (n) => [(4 * n) / 3, 6 * n, 5 * n, 3 * n],
      (n, a) => [n + 2, a - 1, a + 1, (n + 2) * (n + 3)],
    ],
    [
      (n) => [3 * n, n * n, n ** 4, n ** 3 + n],
      (n) => [2 ** (2 * n), 2 ** n + 4, 2 * (n + 2), 2 ** (n + 4), n + 2],
      (n) => [n ** 3, 2 * n * n, 4 * n, n ** 6],
      (n) => [n ** 5, 1, n * n, 0],
    ],
    [
      (n) => [2 * n + 1, 2 * n + 2, 2 * n * (n + 1), 3 * n + 1],
      (n) => [3 * n - 1, (3 * n - 2) / n, 3 - 1 / n, 3 * n],
      (n) => [4 * (2 * n + 2), 4 * n + 8, 2 * n + 2, 5 * n + 2],
      (n) => [-n * n - n, n * n + n, n, n * n],
    ],
    [
      (n) => [2 * n + 3, n * (n + 3), 4 * n + 3, 4 * n + 12],
      (n) => [2 * n * (n + 2), n + 2, n * n, 3 * n + 2],
      (n) => [n * n, 2 * n, n / 2, 4 * n],
      (n) => [4 * n + 4, 4 * n + 5, 2 * n + 1, n * (n + 2) - 1],
    ],
    [
      (n) => [n + 12, n + 18, 6 * n + 15, n + 9],
      (n) => [6 * n, 4 * n + 2, 16 * n, 4 * n],
      (n) => [2 + 5 * n, 2 + 3 * n, 5 * (n + 2), 4 * n],
      (n) => [n + 18, n + 24, n + 14, n + 16],
    ],
    [
      () => [75, 33.33, 0.25, 20],
      () => [25, 100, 0.5, 33.33],
      () => [40, 0.6, 37.5, 80],
      () => [20, 0.8, 25, 75],
    ],
  ],
  advanced: [
    [
      (n) => [-3, n - 3, n + 3, 3 - 2 * n],
      (n) => [n * n + 2 * n, n * n - 2, -n * n - 2 * n, n * n],
      (n) => [n / 2, 1 / (2 * n), n, 2 / n],
      (n) => [n + 3, (n + 6) / 2, 3 + 2 * n, 3 - n],
    ],
    [
      (n) => [2 ** n / 2, 2 * n, n - 1, n + 1],
      (n) => [10 ** n / 10, 10 * n, n - 1, n + 1],
      (n) => [2 * n, n, 2 ** n + 4, n + 4],
      (n) => [3 ** n / 3, 3 * n, n - 1, n + 1],
    ],
    [
      (n) => [2 * n, 0, n / 2, -n],
      (n) => [n, 0, -n / 2, -2 * n],
      (n) => [n, 2 * n + 2, 2, -n + 2],
      (n) => [2 * n + 3, n, 0, -n - 3],
    ],
    [
      (n) => [3 * n, 2 * (n + 1), n * (n + 1) + 6, 2 * n + 6],
      (n) => [3 * n, 3, 2 * n + 3, n + 7],
      (n) => [7 * n, 25 * n * n, n, Math.sqrt(7 * n)],
      (n) => [4 * n, 2 * n, -4 * n, 4 * n * n],
    ],
    [
      (n) => [n + 6, 2 * n + 3, 3 * n, n + 3],
      (n) => [n * n + 1, n * n + 2 * n, 2 * n + 1, n + 1],
      (n) => [2 * n + 6, n + 6, 3 * n + 6, 2],
      (n) => [n + 1, n * n + 1, 2 * n + 1, n * n],
    ],
    [
      (n) => [4 * n + 4, n + 1, (n + 2) ** 2 - n * n, 2 * n],
      (n) => [6 * n, 3 * n, n, 12 * n],
      (n) => [3 * n, n + 2, 4 * n + 2, 0],
      (n) => [n, -3 * n, (-5 * n) / 3, 0],
    ],
  ],
  calculus1: [
    [
      (n) => [n * n, n - 1, n * n + 1, 2 * n],
      (n) => [0, n, n * n, 1],
      (n) => [0, 1, n * n, 1 / n],
      (n) => [1 / 3, n / 3, 0, n + 1],
    ],
    [
      (n) => [2 * n + 3, 3, 0, n + 3],
      (n) => [n, n * n, 0, 2 * n + 1],
      (n) => [n, 1, 3 * n, n / 3],
      (n) => [n ** 3, 3 * n, n * n, 2 * n * n],
    ],
    [
      (n, a) => [1, a - 1, a + 1, -a],
      (n, a) => [-a, (-1) ** n, n - 1, -n - 1],
      (n) => [8 * n, 6 * n, 3 * n, 24 * n],
      (n) => [1, n + 1, n, -1],
    ],
    [
      (n) => [2 + n, 4 + 2 * n, 4, n],
      (n) => [3 + n, 1 - n, 3, 2 - n],
      (n) => [4 * n + n + 1, 2 * n, n, 4 * n + 1],
      (n) => [6 + n, 2 + 2 * n, 6 + n * n, 3 + n],
    ],
    [
      (n) => [n * n, n, -2 * n, 2],
      (n) => [n, 3, 0, n + 2],
      (n) => [n * n, 2 * n, 0, -2 * n * n],
      (n) => [3 * n + 2, n + 2, 0, 3 * n],
    ],
    [
      (n) => [-n, 3, n * n + 3, 0],
      (n) => [n, -n, 0, n * n],
      (n) => [2 * n, -n, -2 * n, 0],
      (n) => [n, -2 * n, 0, n * n],
    ],
  ],
  calculus2: [
    [
      (n) => [4 * n, 4 * n - 3, 2 * n + 3, 8 * n + 3],
      (n) => [3 * n + 2, 2 * n, n + 2, 2 - 2 * n],
      (n) => [8, 12, 8 - n, 4 + n],
      (n) => [2 + n, 1 + n / 2, n, 1],
    ],
    [
      (n) => [(n + 1) ** 2, 2 * n, n * n, 2 * n + 2],
      (n) => [n, 4 * n, n * n, n + 2],
      (n) => [3 * n * n, 3 * n ** 3, n ** 3 / 3, n * n],
      (n) => [2 * n, -n, -4 * n, 0],
    ],
    [
      (n) => [2 * n * n, n, 2 * n, (n * n) / 2],
      (n) => [3 * (n + 2), n, 3 * n + 2, 2 * n],
      (n) => [n, 4 * n, 0, 2 * n + 2],
      (n) => [4 * n * n, n * n, 2 * n, n],
    ],
    [
      (n) => [2 * n + 4, n, n + 2, 2 * n],
      (n) => [4 + 2 * n, 8 + n, 12 + n, 8],
      (n) => [3 * n - 2, n + 1, n, n - 2],
      (n) => [2 * n * n + n, n * n + 1, n * n, 2 * n],
    ],
    [
      (n) => [2 * n, n * n, 4 * n * n, 2 * n ** 3],
      (n) => [3 * n ** 3, 27 * n ** 3, 4.5 * n * n, 9 * n * n],
      (n) => [2, 2 * (n + 1) ** 2, 2 * ((n + 1) ** 2 + n * n), 2 * n + 1],
      (n) => [(n + 3) ** 2, 2 * (n + 3), (n + 3) / 2, n],
    ],
    [
      (n) => [4 * n * n, n * n, 2 * n, 4 * n],
      (n) => [(n + 1) ** 2, n * n, 2 * n, 2 * n + 2],
      (n) => [4 * n + 2, 2 * n + 1, 2 * n, n + 2],
      (n) => [2 * n, 2 * n - 2, n - 1, 2 * n + 1],
    ],
  ],
  calculus3: [
    [
      (n) => [2 * n + 2, n * n + 4, n * n, (n + 2) ** 2],
      (n) => [2 * n, n - 2, -n, n + 2],
      (n) => [n + 2, n + 8, (n + 2) ** 2, n + 4],
      (n) => [2 * n, 2 * (n + 3), 2 * n + 1, 5 * n],
    ],
    [
      (n) => [n, 2, n * n, 2 * n + 1],
      (n) => [n + 6, n, 3, 2 * n + 9],
      (n) => [2, n, n + 4, 2 * n],
      (n) => [n ** 3, 3 * n, n * n, 3 * n * n + 1],
    ],
    [
      (n) => [2, n * n, n, 2 * n + 2],
      (n) => [2, 2 * n, 1, n + 2],
      (n) => [3, 3 * n, n + 3, 0],
      (n) => [2 * n, 2 * n * n, 4 * n * n, 4],
    ],
    [
      (n) => [2 * n, 2 * n + 2, 2 * n + 3, 3 * n + 9],
      (n) => [2 * n, -2 * n, n * n, n],
      (n) => [n * n + 1, n - 1, (n - 1) ** 2, n * n],
      (n) => [6 + 3 * n, 3 * n, n, 6 * n * n],
    ],
    [
      (n) => [n + 2, n + 3, n + 6, 6 * n],
      (n) => [n * n + 2, 2 * n + 2, 2 * n, 2 * n + 6],
      (n) => [n + 3, 3, 1, 2],
      (n) => [2 * n + 1, 2 * n - 1, 0, n],
    ],
    [
      (n) => [n, 2, 4 * n, n * n],
      (n) => [n, 4 * n, 2, n * n],
      (n) => [n, 4 * n, 2, 2 * n * n],
      (n) => [3 * n, 2 * n, 12 * n, n + 3],
    ],
  ],
};

export function originalChoiceErrors(
  course: MathCourseId,
  level: number,
  index: number,
  answer: number,
) {
  return ERRORS[course][level]![Math.floor(index / 6)]!((index % 6) + 2, answer);
}

export function choiceBounds(course: MathCourseId, level: number, format: number) {
  if (course === "foundations") return [0, level === 3 && format === 4 ? 4 : Infinity] as const;
  if (course === "school" && level === 5) return [0, 100] as const;
  if ((course === "school" && level === 3) || (course === "calculus2" && [2, 4].includes(level)))
    return [0, Infinity] as const;
  return [-Infinity, Infinity] as const;
}
