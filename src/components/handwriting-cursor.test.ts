import { describe, expect, it } from "vitest";
import { cursorColor } from "./handwriting-cursor";

describe("cor do cursor", () => {
  it("é sempre a mesma para o mesmo participante", () => {
    expect(cursorColor("abc-123")).toBe(cursorColor("abc-123"));
  });

  it("vem da paleta e reparte participantes diferentes", () => {
    const colors = new Set(Array.from({ length: 40 }, (_, index) => cursorColor(`p-${index}`)));
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.size).toBeGreaterThan(2);
  });
});
