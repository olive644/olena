import type { Language } from "./types";

// Rótulos do resumo no idioma do arquivo. As caixas e títulos são sempre os mesmos; só o texto muda.

export type Labels = {
  intro: string;
  mainPoints: string;
  overview: string;
  route: string;
  page: string;
  pages: string;
  pageTo: string;
  subtopics: string;
  definition: string;
  mistake: string;
  warning: string;
  essential: string;
  example: string;
  formula: string;
  timeline: string;
  when: string;
  whatHappened: string;
  numbers: string;
  terms: string;
  review: string;
  question: string;
  answer: string;
  part: string;
  aboutTitle: string;
  centralQuestion(title: string): string;
  about(selected: number, total: number): string;
};

export const LABELS: Record<Language, Labels> = {
  pt: {
    intro: "Introdução",
    mainPoints: "Pontos principais",
    overview: "Visão geral",
    route: "Roteiro do arquivo",
    page: "pág.",
    pages: "págs.",
    pageTo: "a",
    subtopics: "Subtópicos",
    definition: "Definição",
    mistake: "Erro frequente",
    warning: "Atenção",
    essential: "Ponto essencial",
    example: "Exemplo",
    formula: "Fórmula",
    timeline: "Linha do tempo",
    when: "Quando",
    whatHappened: "O que aconteceu",
    numbers: "Dados e números",
    terms: "Termos-chave",
    review: "Perguntas de revisão",
    question: "Pergunta",
    answer: "Resposta",
    part: "Parte",
    aboutTitle: "Sobre este resumo",
    centralQuestion: (title) => `Qual é a ideia central de “${title}”?`,
    about: (selected, total) =>
      `Resumo automático feito no seu aparelho, sem IA: ${selected} de ${total} frases do próprio arquivo, organizadas por seção. Nada foi reescrito nem acrescentado.`,
  },
  en: {
    intro: "Introduction",
    mainPoints: "Main points",
    overview: "Overview",
    route: "File outline",
    page: "p.",
    pages: "pp.",
    pageTo: "to",
    subtopics: "Subtopics",
    definition: "Definition",
    mistake: "Common mistake",
    warning: "Warning",
    essential: "Key point",
    example: "Example",
    formula: "Formula",
    timeline: "Timeline",
    when: "When",
    whatHappened: "What happened",
    numbers: "Data and numbers",
    terms: "Key terms",
    review: "Review questions",
    question: "Question",
    answer: "Answer",
    part: "Part",
    aboutTitle: "About this summary",
    centralQuestion: (title) => `What is the central idea of “${title}”?`,
    about: (selected, total) =>
      `Automatic summary made on your device, without AI: ${selected} of ${total} sentences from the file itself, organized by section. Nothing was rewritten or added.`,
  },
};
