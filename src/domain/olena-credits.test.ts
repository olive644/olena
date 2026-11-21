import { describe, expect, it } from "vitest";
import { countdownParts, creditLevel, creditsSpent, dayElapsedShare } from "./olena-credits";

describe("medidor de créditos da Olena", () => {
  it("a contagem arredonda para cima e nunca fica negativa", () => {
    expect(countdownParts(4 * 3600 + 12 * 60)).toEqual({ hours: 4, minutes: 12 });
    expect(countdownParts(59)).toEqual({ hours: 0, minutes: 1 });
    expect(countdownParts(3600)).toEqual({ hours: 1, minutes: 0 });
    expect(countdownParts(-5)).toEqual({ hours: 0, minutes: 0 });
  });

  it("só conta gasto quando o uso sobe; dia novo e primeira leitura não contam", () => {
    expect(creditsSpent(undefined, 40)).toBe(0);
    expect(creditsSpent(10, 52)).toBe(42);
    expect(creditsSpent(52, 52)).toBe(0);
    expect(creditsSpent(300, 0)).toBe(0);
  });

  it("o nível avisa quando o saldo não cobre um pedido grande e quando acaba", () => {
    expect(creditLevel(400, 300)).toBe("ok");
    expect(creditLevel(300, 300)).toBe("ok");
    expect(creditLevel(120, 300)).toBe("low");
    expect(creditLevel(0, 300)).toBe("empty");
  });

  it("a fração do dia passada fica entre 0 e 1", () => {
    expect(dayElapsedShare(86_400)).toBe(0);
    expect(dayElapsedShare(43_200)).toBe(0.5);
    expect(dayElapsedShare(0)).toBe(1);
    expect(dayElapsedShare(999_999)).toBe(0);
  });
});
