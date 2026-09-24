import { describe, expect, it } from "vitest";
import { safeEqual } from "./secure-compare";

describe("safeEqual", () => {
  it("aceita segredos idênticos", () => {
    expect(safeEqual("b7e2c1f0-token", "b7e2c1f0-token")).toBe(true);
  });

  it("recusa segredos diferentes, inclusive de tamanhos distintos", () => {
    expect(safeEqual("b7e2c1f0-token", "b7e2c1f0-tokeN")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "abc")).toBe(false);
  });

  it("nunca autoriza quando o segredo guardado está ausente", () => {
    expect(safeEqual(undefined, "")).toBe(false);
    expect(safeEqual(undefined, "abc")).toBe(false);
  });

  it("trata a credencial vazia como igual só a outra vazia", () => {
    expect(safeEqual("", "")).toBe(true);
  });
});
