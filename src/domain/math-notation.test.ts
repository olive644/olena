import { expect, it } from "vitest";
import { formatMathNotation } from "./math-notation";
import { MATH_COURSES } from "../data/math-courses";
import { challengeQuestion } from "../data/math-challenge-bank";

it.each([
  ["x^15", "x¹⁵"],
  ["15x^14", "15 · x¹⁴"],
  ["x^(−12)", "x⁻¹²"],
  ["e^x", "e^(x)"],
  ["x^(n+2)", "x^(n+2)"],
  ["sqrt(x)", "√x"],
  ["sqrt(x+1)", "√(x+1)"],
  ["x^(1/2)", "√x"],
  ["a/b", "a/b"],
  ["x^1/2", "x¹/2"],
  ["x^0.5", "x^(0.5)"],
  ["x^15x", "x^15x (expoente ambíguo: falta delimitar onde termina)"],
  ["∫_−8^8 2x dx", "∫₋₈⁸ 2 · x dx"],
  ["f'(x)", "f'(x) (derivada de f)"],
  ["f(a)+f'(a)", "f(a) (valor da função)+f'(a) (derivada de f)"],
  ["f(x)=x^15. f′(2) = ?", "f(x)=x¹⁵. derivada de f, calculada em x=2: ?"],
  ["f'(2)=4. f(2)=?", "derivada de f, calculada em x=2: 4. f(2) (valor da função)=?"],
  ["33 − 9", "33 − 9"],
  ["Meta de 25 min", "Meta de 25 min"],
])("displays %s without changing its mathematical meaning", (input, output) => {
  expect(formatMathNotation(input)).toBe(output);
});

it("delimits all powers in every practice and reserved final variant", () => {
  for (const course of MATH_COURSES)
    for (let level = 0; level < 6; level++)
      for (let index = 0; index < 72; index++) {
        const question = challengeQuestion(course.id, level, index);
        const display = formatMathNotation(question.expression);
        expect(display, question.id).not.toMatch(/\^(?!\()/);
        expect(display, question.id).not.toContain("expoente ambíguo");
      }
});
