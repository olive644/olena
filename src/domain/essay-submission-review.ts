export const ESSAY_COMPETENCIES = [
  {
    id: "C1",
    title: "Domínio da escrita formal",
    description: "Ortografia, gramática, pontuação e construção das frases.",
  },
  {
    id: "C2",
    title: "Tema, gênero e repertório",
    description: "Compreensão do tema, texto dissertativo-argumentativo e repertório pertinente.",
  },
  {
    id: "C3",
    title: "Construção da argumentação",
    description: "Tese, seleção e organização de argumentos para defender um ponto de vista.",
  },
  {
    id: "C4",
    title: "Coesão e progressão",
    description: "Articulação entre ideias, frases e parágrafos.",
  },
  {
    id: "C5",
    title: "Proposta de intervenção",
    description:
      "Intervenção relacionada ao problema, detalhada e respeitando os direitos humanos.",
  },
] as const;

export function essaySubmissionReview(text: string) {
  const words = text.match(/\p{L}[\p{L}\p{M}]*/gu) ?? [];
  const insufficient = words.length <= 1;
  const paragraphs = text
    .split(/\n+/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const repeated = paragraphs.filter(
    (paragraph, index) => paragraph.length > 40 && paragraphs.indexOf(paragraph) !== index,
  );
  const longSentences = text
    .split(/[.!?]+/u)
    .filter((sentence) => (sentence.match(/\p{L}[\p{L}\p{M}]*/gu) ?? []).length > 60).length;
  return {
    words: words.length,
    paragraphs: text.split(/\n+/u).filter((paragraph) => paragraph.trim()).length,
    insufficient,
    structuralObservations: [
      ...(words.length >= 80 && paragraphs.length === 1
        ? [
            "O texto foi escrito em um único parágrafo. Revise a divisão entre introdução, desenvolvimento e conclusão; essa contagem não avalia a qualidade dos argumentos.",
          ]
        : []),
      ...(repeated.length
        ? [
            `Foram encontrados ${repeated.length} parágrafos repetidos literalmente. Confira se houve duplicação ao editar.`,
          ]
        : []),
      ...(longSentences
        ? [
            `Há ${longSentences} períodos com mais de 60 palavras. Confira a pontuação e a clareza; o tamanho, sozinho, não caracteriza erro.`,
          ]
        : []),
    ],
    observations: insufficient
      ? [
          "O texto contém no máximo uma palavra. Não há desenvolvimento suficiente para avaliar uma redação dissertativo-argumentativa.",
        ]
      : [],
  };
}
