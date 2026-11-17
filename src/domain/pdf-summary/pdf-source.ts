import { assembleDocument, layoutPage } from "./layout";
import type {
  PdfPageText,
  PdfTextItem,
  StructuredDocument,
  SummaryOptions,
  TextLine,
} from "./types";

// Ponte entre o leitor de PDF (pdf.js) e o resumo. Só aqui se conhece o formato do pdf.js, e as
// páginas são lidas uma a uma para não segurar um arquivo grande inteiro na memória.

type RawTextItem = {
  str: string;
  transform: readonly number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
};

export type PdfPageLike = {
  getTextContent(): Promise<{ items: readonly unknown[] }>;
  getViewport(options: { scale: number }): { width: number; height: number };
  cleanup(): void;
};

export type PdfDocumentLike = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
};

export type ReadPdfOptions = Pick<SummaryOptions, "detail" | "onProgress" | "signal"> & {
  title?: string;
  /** Lê o texto de uma página que é só imagem (OCR). Devolve o texto, com linha em branco entre parágrafos. */
  ocr?: (pageNumber: number) => Promise<string>;
};

function isTextItem(value: unknown): value is RawTextItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "str" in value &&
    typeof (value as { str: unknown }).str === "string" &&
    "transform" in value &&
    Array.isArray((value as { transform: unknown }).transform)
  );
}

export function itemsFromTextContent(raw: readonly unknown[]): PdfTextItem[] {
  const items: PdfTextItem[] = [];
  for (const value of raw) {
    if (!isTextItem(value)) continue;
    const [a = 0, b = 0, , d = 0, x = 0, y = 0] = value.transform;
    if (Math.abs(b) > Math.abs(a)) continue;
    const size = Math.abs(d) || value.height;
    if (!(size > 0) || value.str === "") continue;
    items.push({
      text: value.str,
      x,
      y,
      width: value.width,
      size,
      font: value.fontName,
      endsLine: value.hasEOL,
    });
  }
  return items;
}

/** Linhas sintéticas para o texto que o OCR leu: cada linha desce 14 pontos e cada parágrafo, 28. */
export function itemsFromOcrText(text: string, height: number): PdfTextItem[] {
  const items: PdfTextItem[] = [];
  let y = height - 72;
  let blank = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      blank = true;
      continue;
    }
    if (blank) y -= 14;
    blank = false;
    items.push({
      text: line,
      x: 72,
      y,
      width: line.length * 5.5,
      size: 11,
      font: "ocr",
      endsLine: true,
    });
    y -= 14;
  }
  return items;
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function readPdf(
  pdf: PdfDocumentLike,
  options: ReadPdfOptions = {},
): Promise<StructuredDocument> {
  const pageLines: TextLine[][] = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    options.signal?.throwIfAborted();
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    let items = itemsFromTextContent(content.items);
    const characters = items.reduce((sum, item) => sum + item.text.trim().length, 0);
    if (characters < 25 && options.ocr) {
      const recognized = await options.ocr(number);
      if (recognized.trim()) items = itemsFromOcrText(recognized, viewport.height);
    }
    const pageText: PdfPageText = {
      page: number,
      width: viewport.width,
      height: viewport.height,
      items,
    };
    pageLines.push(layoutPage(pageText));
    page.cleanup();
    options.onProgress?.(number / pdf.numPages, "reading");
    if (number % 3 === 0) await tick();
  }
  return assembleDocument(pageLines, pdf.numPages, options.title ?? "");
}
