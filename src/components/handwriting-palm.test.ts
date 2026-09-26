import { describe, expect, it } from "vitest";
import { PALM_GRACE_MS, shouldIgnoreTouch } from "./handwriting-palm";

describe("rejeição de palma", () => {
  it("ignora o toque enquanto a caneta está na folha", () => {
    expect(shouldIgnoreTouch({ penDown: true, lastPenAt: 1000 }, 1000)).toBe(true);
  });

  it("ignora o toque logo depois de a caneta sair", () => {
    expect(shouldIgnoreTouch({ penDown: false, lastPenAt: 1000 }, 1000 + PALM_GRACE_MS - 1)).toBe(
      true,
    );
  });

  it("aceita o toque (pinça, rolagem) depois da tolerância", () => {
    expect(shouldIgnoreTouch({ penDown: false, lastPenAt: 1000 }, 1000 + PALM_GRACE_MS)).toBe(
      false,
    );
  });

  it("sem caneta nunca ignora o toque, então dedo e pinça funcionam normalmente", () => {
    expect(shouldIgnoreTouch({ penDown: false, lastPenAt: null }, 5)).toBe(false);
  });
});
