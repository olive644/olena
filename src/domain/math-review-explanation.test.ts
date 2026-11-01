import { expect, it } from "vitest";
import { MATH_COURSES, type MathCourseId } from "../data/math-courses";
import { challengeQuestion } from "../data/math-challenge-bank";
import type { MasteryQuestion } from "./math-mastery-engine";
import { mathReviewExplanation } from "./math-review-explanation";

function question(
  course: MathCourseId,
  level: number,
  index: number,
  shuffle = 1,
): MasteryQuestion {
  return {
    ...challengeQuestion(course, level, index, shuffle),
    phase: index >= 48 ? "final" : "practice",
    position: index >= 48 ? 0 : null,
  };
}
const answer = (n: number) => `Resposta: ${String(n).replace(".", ",")}.`;

it.each(MATH_COURSES)(
  "checks every numeric conclusion for all families and variants in $id",
  ({ id }) => {
    for (let level = 0; level < 6; level++) {
      // 48 de prática + 24 reservadas do final, incluindo números 8..13.
      for (let index = 0; index < 72; index++) {
        for (const shuffle of [1, 53]) {
          const q = question(id, level, index, shuffle);
          const before = structuredClone(q);
          Object.freeze(q.choices);
          Object.freeze(q);
          const steps = mathReviewExplanation(id, q);
          expect(steps.at(-1), `${id}/${level}/${index}`).toBe(answer(q.answer));
          expect(steps).toContain(`Fonte da questão: ${q.source}`);
          expect(steps.join(" ")).not.toMatch(/NaN|Infinity|undefined|Resolva a operação indicada/);
          expect(q).toEqual(before);
          if (index < 48) {
            const recovery = { ...q, phase: "recovery" as const };
            expect(mathReviewExplanation(id, recovery)).toEqual(steps);
          }
        }
      }
    }
  },
);

it("uses the snapshot without reshuffling or consulting its generic hint", () => {
  const q = question("foundations", 0, 0);
  q.choices.reverse();
  q.review = "Dica indisponível";
  expect(mathReviewExplanation("foundations", q)).toEqual([
    "Some as duas parcelas: 10 + 5 = 15.",
    `Fonte da questão: ${q.source}`,
    "Resposta: 15.",
  ]);
});

it("explains concrete intermediate arithmetic, inverse operations and contextual quantities", () => {
  expect(mathReviewExplanation("foundations", question("foundations", 0, 18))).toContain(
    "Some primeiro 8 + 4 = 12.",
  );
  expect(mathReviewExplanation("foundations", question("foundations", 0, 18))).toContain(
    "Acrescente 2: 12 + 2 = 14.",
  );
  expect(mathReviewExplanation("foundations", question("foundations", 3, 30))).toContain(
    "2 carros não bastam; a pessoa restante exige mais um: 3.",
  );
  expect(mathReviewExplanation("foundations", question("foundations", 5, 24))).toContain(
    "Primeiro desconto: 200 × 0,9 = 180.",
  );
  expect(mathReviewExplanation("foundations", question("foundations", 5, 24))).toContain(
    "Segundo desconto: 180 × 0,8 = 144.",
  );
  expect(mathReviewExplanation("school", question("school", 0, 24))).toContain(
    "Divida por 2: x − 2 = 3.",
  );
  expect(mathReviewExplanation("school", question("school", 3, 18))).toContain(
    "Retire o portão de 1 metro: 12 − 1 = 11 metros de cerca.",
  );
  expect(mathReviewExplanation("school", question("school", 5, 24))).toContain(
    "Duas azuis: 1/2 × 1/2 = 1/4 = 25%.",
  );
});

it("shows order of composition, derivative rules, initial conditions and signed integrals", () => {
  expect(mathReviewExplanation("advanced", question("advanced", 4, 6))).toContain(
    "Primeiro g(2) = 2 + 1 = 3.",
  );
  expect(mathReviewExplanation("advanced", question("advanced", 4, 6))).toContain(
    "Depois f(3) = 3² = 9.",
  );
  expect(mathReviewExplanation("calculus1", question("calculus1", 2, 42))).toContain(
    "Em x = 0: 2 × 1 × 2 = 4.",
  );
  expect(mathReviewExplanation("calculus1", question("calculus1", 4, 12))).toContain(
    "Tangente: y − 4 = 4(x − 2).",
  );
  expect(mathReviewExplanation("calculus2", question("calculus2", 0, 24))).toContain(
    "F(1) = 2 dá C = 1; F(2) = 4 + 1 = 5.",
  );
  expect(mathReviewExplanation("calculus2", question("calculus2", 1, 36))).toContain(
    "Superior menos inferior: 0² − 2² = -4.",
  );
  expect(mathReviewExplanation("calculus2", question("calculus2", 2, 30))).toContain(
    "Cada área = 2 × 2/2 = 2; total = 4.",
  );
  expect(mathReviewExplanation("calculus3", question("calculus3", 1, 42))).toContain(
    "Depois em y: ∂²f/∂y∂x = 6x²y.",
  );
  expect(mathReviewExplanation("calculus3", question("calculus3", 5, 42))).toContain(
    "Integral interna: [xy + y²]₀^2 = 2x + 4.",
  );
});

it("handles Thompson substitutions rather than the original numeric parameter", () => {
  for (const [index, exponent, derivativePower] of [
    [0, 13, 12],
    [1, -1.5, -2.5],
    [2, 2.4, 1.4],
  ]) {
    const q = question("calculus1", 2, index!);
    const steps = mathReviewExplanation("calculus1", q);
    expect(steps).toContain(
      `Com a = ${String(exponent).replace(".", ",")}, f′(x) = ${String(exponent).replace(".", ",")} × x^(${String(derivativePower).replace(".", ",")}).`,
    );
    expect(steps.at(-1)).toBe(answer(exponent!));
    expect(q.source).toContain("Thompson");
    expect(steps).toContain(`Fonte da questão: ${q.source}`);
  }
});

it("does not reuse practice parameters for final questions", () => {
  const steps = mathReviewExplanation("foundations", question("foundations", 5, 48));
  expect(steps).toContain("Primeiro desconto: 800 × 0,9 = 720.");
  expect(steps).toContain("Segundo desconto: 720 × 0,8 = 576.");
  expect(steps.at(-1)).toBe(answer(576));
});

it("rejects mismatched metadata, unsupported revisions and incorrect numeric conclusions", () => {
  const q = question("foundations", 0, 0);
  expect(() => mathReviewExplanation("school", q)).toThrow("fora do banco");
  expect(() => mathReviewExplanation("foundations", { ...q, format: 7 })).toThrow("fora do banco");
  expect(() => mathReviewExplanation("foundations", { ...q, seed: 10000 })).toThrow(
    "fora do banco",
  );
  expect(() => mathReviewExplanation("foundations", { ...q, answer: q.answer + 1 })).toThrow(
    "não confere",
  );
  Object.defineProperty(q, "revision", { value: 4 });
  expect(() => mathReviewExplanation("foundations", q)).toThrow("fora do banco");
});

it("keeps exact fractions until the requested final rounding", () => {
  const steps = mathReviewExplanation("calculus2", question("calculus2", 3, 24));
  expect(steps).toContain("Primitiva: (2/3)x³ + 3x.");
  expect(steps).toContain("Em 1 menos em 0: 2/3 + 3 ≈ 3,67.");
  expect(steps).toContain("Arredondando apenas a resposta para duas casas decimais: 3,67.");
  expect(steps.at(-1)).toBe("Resposta: 3,67.");
});
