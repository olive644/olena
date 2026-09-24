import { describe, expect, it } from "vitest";
import { OCR_WORKER_OPTIONS } from "./handwriting-ocr";

describe("opções do OCR local", () => {
  it("aponta worker, núcleo e idioma para o mesmo domínio", () => {
    for (const path of [
      OCR_WORKER_OPTIONS.workerPath,
      OCR_WORKER_OPTIONS.corePath,
      OCR_WORKER_OPTIONS.langPath,
    ]) {
      // caminho absoluto do próprio site: nunca http(s):// nem protocolo relativo (//)
      expect(path).toMatch(/^\/(?!\/)/);
    }
  });

  it("não usa blob para o worker, que o CSP bloqueia", () => {
    expect(OCR_WORKER_OPTIONS.workerBlobURL).toBe(false);
  });

  it("não deixa barra no fim de langPath e corePath, como o tesseract.js exige", () => {
    expect(OCR_WORKER_OPTIONS.langPath.endsWith("/")).toBe(false);
    expect(OCR_WORKER_OPTIONS.corePath.endsWith("/")).toBe(false);
  });
});
