import { applyAnswerKey, isExam, parseExam, type ParsedExam } from "./exam";
import { structureText } from "./layout";
import { readPdf, type PdfDocumentLike, type ReadPdfOptions } from "./pdf-source";
import {
  extractFacts,
  flashcardsFromDocument,
  summarizeDocument,
  type AutoFlashcard,
} from "./summarize";
import type { StructuredDocument, SummaryOptions, SummaryResult } from "./types";
import { questionsFromFacts, type GeneratedQuestion, type QuizDifficulty } from "./quiz-questions";

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

export {
  applyAnswerKey,
  isExam,
  parseExam,
  studyableQuestions,
  type ExamQuestion,
  type ParsedExam,
} from "./exam";
export {
  ExamError,
  examFlashcards,
  examProblem,
  examQuizQuestions,
  type ExamQuizQuestion,
} from "./exam-study";
export { flashcardsFromDocument } from "./summarize";

/** Lê o PDF como documento estruturado, para o chamador decidir o que gerar (resumo, prova, cartões). */
export async function documentFromPdf(
  pdf: PdfDocumentLike,
  options: ReadPdfOptions = {},
): Promise<StructuredDocument> {
  return readPdf(pdf, options);
}

/** Texto comum (TXT, Markdown, nota ou OCR) como documento estruturado. */
export function documentFromText(text: string, title: string): StructuredDocument {
  return structureText(text, title);
}

/**
 * Separa as provas dos demais arquivos. O gabarito que vem num arquivo só dele é aplicado à prova
 * sem gabarito quando há uma prova e um gabarito sem ambiguidade; senão cada prova usa o seu.
 */
export function splitExams<T extends { doc: StructuredDocument }>(
  items: readonly T[],
): { exams: (T & { exam: ParsedExam })[]; others: T[] } {
  const parsed = items.map((item) => ({ item, exam: parseExam(item.doc) }));
  const exams = parsed.filter(({ exam }) => isExam(exam));
  const keyOnly = parsed.filter(
    ({ exam }) => !isExam(exam) && Object.keys(exam.key).length > 0 && exam.questions.length < 2,
  );
  const unanswered = exams.filter(({ exam }) => exam.answered === 0);
  const merged = keyOnly.length === 1 && unanswered.length === 1 ? keyOnly[0]!.exam.key : undefined;
  const usedKey = merged !== undefined ? keyOnly[0] : undefined;
  return {
    exams: exams.map(({ item, exam }) => ({
      ...item,
      exam: merged !== undefined && exam.answered === 0 ? applyAnswerKey(exam, merged) : exam,
    })),
    others: parsed
      .filter(({ exam }) => !isExam(exam) && (usedKey === undefined || exam !== usedKey.exam))
      .map(({ item }) => item),
  };
}

export type { GeneratedQuestion, QuizDifficulty } from "./quiz-questions";

/** Perguntas de múltipla escolha de um texto comum (definição, ano, valor e afirmação), no aparelho. */
export async function quizQuestionsFromDocument(
  doc: StructuredDocument,
  difficulty: QuizDifficulty,
  limit: number,
  options: Pick<SummaryOptions, "signal"> = {},
): Promise<GeneratedQuestion[]> {
  const { language, facts } = await extractFacts(doc, options);
  return questionsFromFacts(facts, language, difficulty, limit);
}
