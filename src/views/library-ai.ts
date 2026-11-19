import type { HelenaRequest, StudyCapability } from "../ai/helena-contract";
import type { StudyQuestion } from "../ai/study-output";
import type { QuizDifficulty, QuizLength, SourceQuiz } from "../domain/source-quiz";

// Pedidos da Biblioteca à Olena (IA): resumo, flashcards, quiz e simulado. Só funções puras: o
// que vai ao servidor, quanto e em que formato, e como a resposta vira material da pasta.

export type OlenaKind = "Resumo" | "Flashcards" | "Quizzes" | "Simulados";

export const OLENA_CAPABILITY: Record<OlenaKind, StudyCapability> = {
  Resumo: "summarize",
  Flashcards: "flashcards",
  Quizzes: "quiz",
  Simulados: "exam",
};

// Limites do contrato: 8.000 caracteres por trecho, 12 trechos, 30.000 no total.
const CHUNK = 8_000;
const MAX_CHUNKS = 12;
const TOTAL = 30_000;

export type SourceText = { id: string; title: string; content: string };

/**
 * Parte do texto que vai à Olena. Cada fonte recebe uma fatia igual do total. Texto que não cabe é
 * amostrado em trechos espaçados do começo ao fim (e não cortado no começo), para a IA ver o
 * documento inteiro e não só a primeira página.
 */
export function budgetSources(texts: readonly SourceText[]): HelenaRequest["sources"] {
  if (texts.length === 0) return [];
  const share = Math.floor(TOTAL / texts.length);
  const sources: HelenaRequest["sources"] = [];
  for (const text of texts) {
    const content = text.content.trim();
    const allowed = Math.min(content.length, share);
    const chunks = Math.max(1, Math.ceil(allowed / CHUNK));
    const size = Math.ceil(allowed / chunks);
    for (let index = 0; index < chunks && sources.length < MAX_CHUNKS; index += 1) {
      // Com o texto todo cabendo, os trechos são seguidos; senão, espaçados.
      const start =
        content.length <= allowed
          ? index * size
          : Math.floor(((content.length - size) * index) / Math.max(1, chunks - 1));
      const piece = content.slice(start, start + size).trim();
      if (!piece) continue;
      sources.push({
        id: chunks === 1 ? text.id : `${text.id}#${index + 1}`.slice(0, 160),
        kind: "material",
        title: (chunks === 1 ? text.title : `${text.title} (${index + 1})`).slice(0, 200),
        content: piece,
      });
    }
  }
  return sources;
}

const QUESTION_COUNT = { short: 5, medium: 10, long: 15 } as const;
// Simulado: mais questões que o quiz, até o limite da resposta da Olena.
const EXAM_COUNT = { short: 10, medium: 15, long: 20 } as const;
const FLASHCARD_COUNT = 12;

/** Só parâmetros numéricos: o servidor monta as instruções (texto livre daqui não é usado). */
export function studyPrompt(
  kind: Exclude<OlenaKind, "Resumo">,
  difficulty: QuizDifficulty,
  length: QuizLength,
): string {
  if (kind === "Flashcards") return `count=${FLASHCARD_COUNT}`;
  const count = kind === "Simulados" ? EXAM_COUNT[length] : QUESTION_COUNT[length];
  return `count=${count};options=${difficulty === "easy" ? 3 : 4};difficulty=${difficulty}`;
}

/** Instrução do resumo, no formato de guia de estudo que a tela já desenha. */
export const SUMMARY_PROMPT =
  "Escreva um guia de estudo em português brasileiro usando apenas as fontes fornecidas. Sintetize em palavras próprias e organize por assunto. Comece com # e um título curto. Use de 4 a 7 seções com títulos ## numerados, parágrafos curtos, - para listas e **negrito** para termos-chave. Intercale pelo menos três caixas com uma linha inteira começando por > e um rótulo em negrito, por exemplo Definição, Atenção, Cronologia ou Ponto essencial. Inclua datas, exemplos ou cálculos quando sustentados pelas fontes. Preserve números e fatos. Indique lacunas quando os trechos forem incompletos. Seja conciso: no máximo 600 palavras no total. Entregue somente o guia, sem bloco de código.";

/** Questões da Olena no formato que o estudo de quiz e de simulado já lê. Página 0 = sem página. */
export function toSourceQuiz(
  questions: readonly StudyQuestion[],
  difficulty: QuizDifficulty,
  source: { id: string; title: string },
): SourceQuiz {
  return {
    version: 1,
    difficulty,
    questions: questions.map((question) => ({
      prompt: question.prompt,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      sourceId: source.id,
      sourceTitle: source.title,
      page: 0,
    })),
  };
}
