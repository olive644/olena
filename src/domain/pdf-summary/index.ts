import { structureText } from "./layout";
import { readPdf, type PdfDocumentLike, type ReadPdfOptions } from "./pdf-source";
import { flashcardsFromDocument, summarizeDocument, type AutoFlashcard } from "./summarize";
import type { SummaryOptions, SummaryResult } from "./types";

export type { SummaryResult, SummaryStage } from "./types";

/** Resumo automático de um PDF já aberto (grátis, no aparelho, sem IA). */
export async function summarizePdf(
  pdf: PdfDocumentLike,
  options: ReadPdfOptions = {},
): Promise<SummaryResult> {
  const document = await readPdf(pdf, options);
  const summaryOptions: SummaryOptions = {};
  if (options.detail) summaryOptions.detail = options.detail;
  if (options.onProgress) summaryOptions.onProgress = options.onProgress;
  if (options.signal) summaryOptions.signal = options.signal;
  return summarizeDocument(document, summaryOptions);
}

/** Resumo automático de um texto (TXT, Markdown ou nota). */
export async function summarizePlainText(
  text: string,
  title: string,
  options: SummaryOptions = {},
): Promise<SummaryResult> {
  return summarizeDocument(structureText(text, title), options);
}

export type { AutoFlashcard } from "./summarize";
export { MAX_AUTO_FLASHCARDS } from "./summarize";

/** Flashcards automáticos de um PDF já aberto (grátis, no aparelho, sem IA). */
export async function flashcardsFromPdf(
  pdf: PdfDocumentLike,
  options: ReadPdfOptions = {},
): Promise<AutoFlashcard[]> {
  const document = await readPdf(pdf, options);
  return flashcardsFromDocument(document, options.signal ? { signal: options.signal } : {});
}

/** Flashcards automáticos de um texto (TXT, Markdown ou nota). */
export async function flashcardsFromPlainText(
  text: string,
  title: string,
): Promise<AutoFlashcard[]> {
  return flashcardsFromDocument(structureText(text, title));
}
