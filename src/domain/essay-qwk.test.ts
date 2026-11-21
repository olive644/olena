import { describe, expect, it } from "vitest";
import { quadraticWeightedKappa, scoreClass, scoreDisplayFor } from "./essay-qwk";

describe("kappa ponderado quadrático", () => {
  it("é 1 quando a IA concorda sempre e negativo quando discorda no extremo", () => {
    expect(quadraticWeightedKappa([0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5])).toBeCloseTo(1, 10);
    expect(quadraticWeightedKappa([0, 5, 0, 5], [5, 0, 5, 0])).toBeLessThan(0);
  });

  it("pune mais o erro grande que o pequeno", () => {
    const human = [0, 1, 2, 3, 4, 5, 2, 3];
    const near = [1, 1, 2, 3, 4, 4, 2, 3];
    const far = [4, 1, 2, 3, 0, 5, 2, 3];
    expect(quadraticWeightedKappa(human, near)!).toBeGreaterThan(
      quadraticWeightedKappa(human, far)!,
    );
  });

  it("não é definido sem pares nem quando os dois lados dão sempre a mesma nota", () => {
    expect(quadraticWeightedKappa([], [])).toBeUndefined();
    expect(quadraticWeightedKappa([1, 2], [1])).toBeUndefined();
    expect(quadraticWeightedKappa([2, 2, 2], [2, 2, 2])).toBeUndefined();
  });

  it("uma IA que dá sempre a mesma nota, ou que acerta só por acaso, fica em zero", () => {
    expect(quadraticWeightedKappa([1, 2, 3], [2, 2, 2])!).toBeCloseTo(0, 10);
    expect(quadraticWeightedKappa([0, 0, 1, 1], [0, 1, 1, 0])!).toBeCloseTo(0, 10);
  });

  it("arredonda pontos para a classe de 40 em 40 e limita ao intervalo", () => {
    expect([0, 19, 21, 100, 200, 260].map(scoreClass)).toEqual([0, 0, 1, 3, 5, 5]);
  });
});

describe("regra de exibição da nota (fixada antes da medição)", () => {
  it("0,40 ou mais: número; 0,30 a 0,40: faixa; abaixo: só nível", () => {
    expect(scoreDisplayFor(0.41)).toBe("number");
    expect(scoreDisplayFor(0.4)).toBe("number");
    expect(scoreDisplayFor(0.39)).toBe("range");
    expect(scoreDisplayFor(0.3)).toBe("range");
    expect(scoreDisplayFor(0.29)).toBe("level-only");
    expect(scoreDisplayFor(undefined)).toBe("level-only");
    expect(scoreDisplayFor(Number.NaN)).toBe("level-only");
  });
});
