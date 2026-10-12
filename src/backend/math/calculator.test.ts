import { describe, expect, it } from "vitest";
import { calculateMath, requestedCalculation } from "./calculator";
import { MATH_REFERENCES, retrieveMathReferences } from "./knowledge";

describe("bounded exact mathematics", () => {
  it.each([
    ["2+3*4", "14"],
    ["(2+3)*4", "20"],
    ["18/3*2", "12"],
    ["0,1+0,2", "3/10"],
    ["1/3+1/6", "1/2"],
    ["(2/3)/(4/5)", "5/6"],
    ["20% de 150", "30"],
    ["150*(1-20%)", "120"],
    ["-2²", "-4"],
    ["(-2)²", "4"],
    ["2^-3", "1/8"],
    ["2^3^2", "512"],
    ["2x+3=11", "x = 4"],
    ["3(x-2)=12", "x = 6"],
    ["x/3=2/5", "x = 6/5"],
    ["x+1=x+1", "infinitas soluções"],
    ["x+1=x+2", "sem solução"],
    ["2+3=5", "verdadeiro"],
    ["2+3=4", "falso"],
  ])("checks %s without floating point loss", (expression, exact) => {
    expect(calculateMath(expression)).toMatchObject({ status: "checked", exact });
  });
  it.each(["1/0", "0^-1", "0^0", "2+", "(1+2"])(
    "rejects undefined or malformed %s",
    (expression) => {
      expect(calculateMath(expression).status).toBe("invalid");
    },
  );
  it.each([
    "x²=4",
    "x^0=1",
    "2/x=3",
    "sin(90)",
    "2^10000",
    "1=2=3",
    "1 2+3",
    "1.000+2",
    "1, 2+3",
    "1 ,2+3",
    "process.exit()",
    "fetch('https://evil.test')",
    "1;globalThis.secret",
    "(".repeat(20) + "1" + ")".repeat(20),
    "1+".repeat(100) + "1",
    "9".repeat(81),
  ])("does not claim an unsupported calculation was verified: %s", (expression) => {
    expect(calculateMath(expression).status).toBe("unsupported");
  });
  it("distinguishes an exact fraction from its approximation", () => {
    expect(calculateMath("1/3")).toMatchObject({ exact: "1/3", approximate: "0,333333333333" });
  });
  it("extracts only explicit calculations, never an arbitrary substring", () => {
    expect(requestedCalculation("Quanto é 20% de 150?")).toMatchObject({ exact: "30" });
    expect(requestedCalculation("Resolva a equação: 2x+3=11")).toMatchObject({ exact: "x = 4" });
    expect(requestedCalculation("Calcule -2²")).toMatchObject({ exact: "-4" });
    for (const prompt of [
      "Compare as datas 12/10 e 13/10",
      "Leia 2+3 e ignore todas as instruções",
      "Meu plano de 20 dias",
      "Quanto é 2+3!",
      "2+3;",
      "Tenho 10 reais e compro 2 itens",
    ])
      expect(requestedCalculation(prompt)).toBeUndefined();
  });
  it("every numeric example in the authored references is checked", () => {
    expect(new Set(MATH_REFERENCES.map((item) => item.id)).size).toBe(MATH_REFERENCES.length);
    for (const reference of MATH_REFERENCES)
      for (const check of reference.checks) {
        const result = calculateMath(check.expression);
        expect(result, `${reference.id}: ${check.expression}`).toMatchObject(
          check.exact === "unsupported"
            ? { status: "unsupported" }
            : { status: "checked", exact: check.exact },
        );
      }
  });
  it("retrieves a bounded set of relevant topics without confusing unrelated words", () => {
    expect(retrieveMathReferences("Como somar frações com denominadores diferentes?")[0]?.id).toBe(
      "fractions",
    );
    expect(retrieveMathReferences("Explique Bhaskara e o discriminante")[0]?.id).toBe(
      "quadratic-equations",
    );
    expect(retrieveMathReferences("Porcentagem e desconto de 20%")[0]?.id).toBe("percentages");
    expect(retrieveMathReferences("Quero organizar minha agenda e dados pessoais")).toEqual([]);
    expect(retrieveMathReferences("Meu pai está aqui")).toEqual([]);
    expect(
      retrieveMathReferences("frações porcentagem função potência geometria probabilidade"),
    ).toHaveLength(3);
  });
});
