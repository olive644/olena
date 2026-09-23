const MAX_OCR_FORMULA_LENGTH = 240;

/**
 * Keeps OCR output safe for the formula editor while normalizing the symbols
 * that Tesseract commonly emits for multiplication and line breaks.
 */
export function normalizeMathOcrText(value: string): string {
  return value.replace(/[×·]/g, "*").replace(/\s+/g, " ").trim().slice(0, MAX_OCR_FORMULA_LENGTH);
}
