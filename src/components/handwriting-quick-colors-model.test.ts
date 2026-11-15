import { afterEach, describe, expect, it } from "vitest";
import {
  QUICK_COLOR_LIMIT,
  QUICK_COLOR_STORAGE_KEY,
  normalizeHex,
  readRecentColors,
  rememberRecentColor,
  writeRecentColors,
} from "./handwriting-quick-colors-model";

afterEach(() => localStorage.clear());

describe("cores rápidas do editor", () => {
  it("normaliza hex de 3 e 6 dígitos e recusa o resto", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex(" #7C3AED ")).toBe("#7c3aed");
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("javascript:alert(1)")).toBeNull();
  });

  it("lembra a cor nova no começo, sem repetir, e ignora as cores fixas da barra", () => {
    const fixed = ["#17151c", "#7c3aed"];
    expect(rememberRecentColor([], "#112233", fixed)).toEqual(["#112233"]);
    expect(rememberRecentColor(["#112233", "#445566"], "#445566", fixed)).toEqual([
      "#445566",
      "#112233",
    ]);
    expect(rememberRecentColor(["#112233"], "#7C3AED", fixed)).toEqual(["#112233"]);
    expect(rememberRecentColor(["#112233"], "nao-e-cor", fixed)).toEqual(["#112233"]);
  });

  it("guarda no máximo cinco cores recentes", () => {
    let recent: string[] = [];
    for (let index = 0; index < 9; index += 1)
      recent = rememberRecentColor(recent, `#00000${index}`, []);
    expect(recent).toHaveLength(QUICK_COLOR_LIMIT);
    expect(recent[0]).toBe("#000008");
  });

  it("lê do aparelho só cores válidas e sobrevive a dados corrompidos", () => {
    writeRecentColors(["#112233", "#445566"]);
    expect(readRecentColors()).toEqual(["#112233", "#445566"]);
    localStorage.setItem(QUICK_COLOR_STORAGE_KEY, JSON.stringify(["#abc", 7, "x", "#ABC", null]));
    expect(readRecentColors()).toEqual(["#aabbcc"]);
    localStorage.setItem(QUICK_COLOR_STORAGE_KEY, "{quebrado");
    expect(readRecentColors()).toEqual([]);
    localStorage.setItem(QUICK_COLOR_STORAGE_KEY, JSON.stringify({ a: 1 }));
    expect(readRecentColors()).toEqual([]);
  });
});
