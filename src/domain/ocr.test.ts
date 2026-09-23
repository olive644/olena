import { describe, expect, it } from "vitest";
import { normalizeMathOcrText } from "./ocr";

describe("normalizeMathOcrText", () => {
  it("normalizes multiplication symbols and whitespace", () => {
    expect(normalizeMathOcrText("  y × 2\n + 1 · x  ")).toBe("y * 2 + 1 * x");
  });

  it("keeps OCR suggestions bounded for the formula editor", () => {
    expect(normalizeMathOcrText("x".repeat(300))).toHaveLength(240);
  });
});
