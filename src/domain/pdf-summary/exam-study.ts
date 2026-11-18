import type { ExamQuestion, ParsedExam } from "./exam";
import { studyableQuestions } from "./exam";
import type { AutoFlashcard } from "./summarize";

// Material de estudo a partir de uma prova do próprio usuário: as questões e o gabarito do arquivo
// viram flashcards, quiz e simulado sem reescrever nada. Quando o arquivo não traz o gabarito, nada
// é inventado: o erro avisa o que falta.

export class ExamError extends Error {
  readonly reason: "no-answer-key" | "needs-figures" | "only-answer-key" | "ambiguous-key";
  constructor(reason: ExamError["reason"]) {
    super(reason);
    this.name = "ExamError";
    this.reason = reason;
  }
}

const letter = (index: number) => String.fromCharCode(65 + index);

/** Texto de apoio que ainda cabe num cartão, e num enunciado de quiz ou simulado. */
const MAX_CARD_CONTEXT = 400;
const MAX_QUIZ_CONTEXT = 2500;

/** Por que uma prova não rende material, ou undefined se rende. */
export function examProblem(exam: ParsedExam): ExamError | undefined {
  if (studyableQuestions(exam).length > 0) return undefined;
  if (exam.keyAmbiguous) return new ExamError("ambiguous-key");
  return new ExamError(exam.hasAnswerKey ? "needs-figures" : "no-answer-key");
}

/** Enunciado completo, com o texto de apoio quando é curto. */
export function fullStem(question: ExamQuestion): string {
  return question.context && question.context.length <= MAX_CARD_CONTEXT
    ? `${question.context} ${question.stem}`
    : question.stem;
}

/**
 * Flashcards de verdadeiro ou falso: para cada questão, a alternativa certa vira um cartão verdadeiro
 * e uma errada (a de cada questão varia com o número) vira um cartão falso. O verso mostra o gabarito.
 */
export function examFlashcards(exam: ParsedExam): AutoFlashcard[] {
  const cards: AutoFlashcard[] = [];
  for (const question of studyableQuestions(exam)) {
    // "Segundo o texto..." sem o texto não dá para responder, e texto longo não cabe no cartão.
    if (question.context.length > MAX_CARD_CONTEXT) continue;
    const right = question.answer!;
    const correct = question.options[right]!;
    const wrongs = question.options.map((_, index) => index).filter((index) => index !== right);
    const wrong = wrongs[question.number % wrongs.length]!;
    const stem = fullStem(question);
    // Enunciado que fica no meio da frase ("... atender o público com") se completa com a alternativa;
    // pergunta ou ordem ("Assinale...") ganha "Resposta:".
    const completes = !/[?.!]$/.test(stem.trim());
    const statement = (option: string) =>
      completes ? `${stem} ${option}` : `${stem} Resposta: ${option}`;
    cards.push({
      front: statement(correct),
      back: `Verdadeiro. Gabarito: ${letter(right)}) ${correct}`,
      page: question.page,
      kind: "exam",
    });
    cards.push({
      front: statement(question.options[wrong]!),
      back: `Falso. O gabarito é ${letter(right)}) ${correct}`,
      page: question.page,
      kind: "exam",
    });
  }
  return cards;
}

export type ExamQuizQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  page: number;
};

/** Questões do quiz ou simulado: as da prova, com as alternativas e o gabarito do arquivo. */
export function examQuizQuestions(exam: ParsedExam): ExamQuizQuestion[] {
  return studyableQuestions(exam)
    .filter(
      (question) =>
        question.context.length <= MAX_QUIZ_CONTEXT &&
        question.options.length <= 5 &&
        new Set(question.options.map((option) => option.toLowerCase())).size ===
          question.options.length,
    )
    .map((question) => ({
      prompt: question.context ? `${question.context}\n\n${question.stem}` : question.stem,
      options: question.options,
      answer: question.answer!,
      explanation: `Gabarito: ${letter(question.answer!)}) ${question.options[question.answer!]!}`,
      page: question.page,
    }));
}

/** Resumo de uma prova: o que ela tem, o gabarito e o que ficou de fora. */
export function examSummary(exam: ParsedExam, title: string): string {
  const total = exam.questions.length;
  const study = studyableQuestions(exam).length;
  const lines = [`# ${title}`, ""];
  lines.push(
    `> **Sobre esta prova** ${total} questões encontradas, ${exam.answered} com gabarito no arquivo` +
      (exam.figureQuestions ? `, ${exam.figureQuestions} dependem de figura ou gráfico` : "") +
      `. ${study} podem virar flashcards, quiz e simulado.`,
    "",
  );
  if (!exam.hasAnswerKey)
    lines.push(
      "> **Atenção** O arquivo não traz o gabarito. Sem ele não dá para saber as respostas, e nada foi inventado. Envie o gabarito junto para criar flashcards, quiz e simulado.",
      "",
    );
  if (exam.answered > 0) {
    lines.push("## Gabarito", "", "| Questão | Resposta |", "| --- | --- |");
    for (const question of exam.questions)
      if (question.answer !== undefined)
        lines.push(`| ${question.number} | ${letter(question.answer)} |`);
    lines.push("");
    const counts = new Map<string, number>();
    for (const question of exam.questions)
      if (question.answer !== undefined)
        counts.set(letter(question.answer), (counts.get(letter(question.answer)) ?? 0) + 1);
    lines.push(
      `**Distribuição das respostas:** ${[...counts.entries()]
        .sort()
        .map(([option, count]) => `${option} ${count}`)
        .join(", ")}`,
      "",
    );
  }
  lines.push("## Questões", "");
  for (const question of exam.questions) {
    lines.push(`**${question.number}.** ${fullStem(question)} (pág. ${question.page})`);
    question.options.forEach((option, index) =>
      lines.push(
        `- ${question.answer === index ? "**" : ""}${letter(index)}) ${option}${question.answer === index ? "**" : ""}`,
      ),
    );
    lines.push("");
  }
  if (exam.figureQuestions)
    lines.push(
      "> **Figuras** Questões que citam figura, gráfico ou tabela: " +
        exam.questions
          .filter((question) => question.needsFigure)
          .map((question) => question.number)
          .join(", ") +
        ". O texto do PDF não traz a imagem, então elas ficam fora dos flashcards, do quiz e do simulado.",
    );
  return lines.join("\n").trim();
}
