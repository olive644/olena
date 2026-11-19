import { describe, expect, it } from "vitest";
import { decodeText, fitWithin } from "./library-source-files";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("texto enviado à Biblioteca", () => {
  it("lê UTF-8 e tira a marca BOM", () => {
    const utf8 = new TextEncoder().encode("fotossíntese");
    expect(decodeText(utf8)).toBe("fotossíntese");
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]))).toBe("fotossíntese");
  });

  it("lê o texto ANSI (Windows-1252) do Bloco de Notas sem trocar os acentos", () => {
    // "fotossíntese" em Windows-1252: o í é o byte E D, que não é UTF-8 válido.
    const ansi = bytes(0x66, 0x6f, 0x74, 0x6f, 0x73, 0x73, 0xed, 0x6e, 0x74, 0x65, 0x73, 0x65);
    expect(decodeText(ansi)).toBe("fotossíntese");
    expect(decodeText(bytes(0xe7, 0xe3, 0x6f))).toBe("ção");
  });

  it("lê UTF-16 com marca de ordem dos bytes", () => {
    expect(decodeText(bytes(0xff, 0xfe, 0x61, 0x00, 0xe7, 0x00))).toBe("aç");
    expect(decodeText(bytes(0xfe, 0xff, 0x00, 0x61, 0x00, 0xe7))).toBe("aç");
  });
});

describe("tamanho da imagem", () => {
  it("reduz pelo maior lado, mantém a proporção e nunca amplia", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
});

import { MAX_LIBRARY_CHARS, MAX_PDF_BYTES, fitsLibrary } from "./library-source-files";

describe("espaço da Biblioteca na conta", () => {
  it("PDF pode passar de 1 MB, mas tem teto", () => {
    expect(MAX_PDF_BYTES).toBeGreaterThanOrEqual(4 * 1024 * 1024);
    expect(MAX_PDF_BYTES).toBeLessThanOrEqual(8 * 1024 * 1024);
  });

  it("deixa folga para o resto do espaço de trabalho sob o limite de 20 milhões das regras", () => {
    expect(MAX_LIBRARY_CHARS).toBeLessThanOrEqual(12_000_000);
    // O maior PDF permitido em base64 cabe sozinho no teto.
    expect(fitsLibrary(0, Math.ceil((MAX_PDF_BYTES * 4) / 3))).toBe(true);
  });

  it("recusa o que passaria do teto e aceita o que cabe", () => {
    expect(fitsLibrary(MAX_LIBRARY_CHARS - 100, 100)).toBe(true);
    expect(fitsLibrary(MAX_LIBRARY_CHARS - 100, 101)).toBe(false);
    expect(fitsLibrary(8_000_000, 5_000_000)).toBe(false);
  });
});
