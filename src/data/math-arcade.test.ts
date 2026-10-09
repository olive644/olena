import { describe, expect, it } from "vitest";
import { arithmeticPoints, createArithmeticQuestion } from "./math-arcade";

describe("arithmetic arcade", () => {
  it("generates only basic exact arithmetic with distinct nonnegative choices", () => {
    for (let correct = 0; correct < 100; correct++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const question = createArithmeticQuestion(correct);
        const [left, sign, right] = question.expression.split(" ");
        const a = Number(left),
          b = Number(right);
        const result = sign === "+" ? a + b : sign === "−" ? a - b : sign === "×" ? a * b : a / b;
        expect(question.answer).toBe(result);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(result);
        expect(question.choices.every((value) => value >= 0)).toBe(true);
      }
    }
  });
  it("progresses by correct answers and caps the combo bonus", () => {
    expect(createArithmeticQuestion(0).stage).toBe("Primeiras somas");
    expect(createArithmeticQuestion(5).stage).toBe("Subtrações");
    expect(createArithmeticQuestion(10).stage).toBe("Multiplicações");
    expect(createArithmeticQuestion(15).stage).toBe("Operações misturadas");
    expect(arithmeticPoints(1)).toBe(10);
    expect(arithmeticPoints(20)).toBe(20);
  });
});
