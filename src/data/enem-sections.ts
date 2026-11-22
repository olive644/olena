export type EnemSection = {
  id: string;
  label: string;
  question?: number;
  heading?: string;
  color: string;
};
export function enemSections(year: number, day: number): EnemSection[] {
  const languages: EnemSection = {
    id: "languages",
    label: "Linguagens, Códigos e suas Tecnologias",
    question: year >= 2017 ? 1 : 91,
    color: "#279d87",
  };
  const humanities: EnemSection = {
    id: "humanities",
    label: "Ciências Humanas e suas Tecnologias",
    question: year >= 2017 ? 46 : 1,
    color: "#ca8c22",
  };
  const nature: EnemSection = {
    id: "nature",
    label: "Ciências da Natureza e suas Tecnologias",
    question: year >= 2017 ? 91 : 46,
    color: "#4595bc",
  };
  const math: EnemSection = {
    id: "math",
    label: "Matemática e suas Tecnologias",
    question: 136,
    color: "#a76bd4",
  };
  const essay: EnemSection = {
    id: "essay",
    label: "Redação",
    heading: "PROPOSTA DE REDAÇÃO",
    color: "#d65e8a",
  };
  return year >= 2017
    ? day === 1
      ? [languages, humanities, essay]
      : [nature, math]
    : day === 1
      ? [humanities, nature]
      : [languages, math, essay];
}
