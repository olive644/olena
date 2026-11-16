import { describe, expect, it } from "vitest";
import { FOLD_SIZE_PX, isInFoldCorner } from "./handwriting-fold";

const bounds = { top: 100, right: 500 };

describe("dobra do canto da folha", () => {
  it("reconhece o triângulo do canto de cima à direita", () => {
    expect(isInFoldCorner(bounds, 499, 101)).toBe(true);
    expect(isInFoldCorner(bounds, 500, 100)).toBe(true);
    // Em cima da borda diagonal que liga (right-34, top) a (right, top+34).
    expect(isInFoldCorner(bounds, 500 - FOLD_SIZE_PX / 2, 100 + FOLD_SIZE_PX / 2 - 1)).toBe(true);
  });

  it("não pega o papel ao redor", () => {
    expect(isInFoldCorner(bounds, 500 - FOLD_SIZE_PX, 100)).toBe(false);
    expect(isInFoldCorner(bounds, 500, 100 + FOLD_SIZE_PX)).toBe(false);
    expect(isInFoldCorner(bounds, 480, 130)).toBe(false);
    // Fora da folha (para cima ou para a direita) também não conta.
    expect(isInFoldCorner(bounds, 520, 110)).toBe(false);
    expect(isInFoldCorner(bounds, 490, 90)).toBe(false);
  });
});
