import type { PRACTICE_ISLANDS } from "./practice-islands";

export type PracticeIsland = (typeof PRACTICE_ISLANDS)[number];
export type SubjectIslandId = Exclude<PracticeIsland["id"], "languages">;

// Coordinates are measured on each portrait's actual flat landings.
export const MOBILE_TRAIL_Y: Record<SubjectIslandId, readonly number[]> = {
  portuguese: [85, 63, 41, 19],
  chemistry: [82, 56, 39, 17],
  biology: [85, 61, 35, 14],
  mathematics: [90, 63, 36, 14],
  programming: [86, 56, 31, 13],
};

export const SUBJECT_TRAILS = {
  portuguese: {
    points: [
      { x: 50, y: 87 },
      { x: 50, y: 62 },
      { x: 50, y: 37 },
      { x: 50, y: 14 },
    ],
    color: "#b9472c",
    shade: "#843222",
    light: "#ffb793",
    stops: [
      {
        title: "Bosque das palavras",
        topic: "Gramática",
        description: "Palavras, frases e os caminhos que conectam nossas ideias.",
      },
      {
        title: "Biblioteca de histórias",
        topic: "Literatura",
        description: "Autores, personagens e diferentes formas de contar histórias.",
      },
      {
        title: "Ponte dos sentidos",
        topic: "Interpretação",
        description: "Leitura atenta para descobrir sentidos e intenções em um texto.",
      },
      {
        title: "Ateliê da escrita",
        topic: "Escrita",
        description: "Organização de ideias e construção dos seus próprios textos.",
      },
    ],
  },
  chemistry: {
    points: [
      { x: 50, y: 74 },
      { x: 50, y: 50 },
      { x: 50, y: 29 },
      { x: 50, y: 14 },
    ],
    color: "#087f95",
    shade: "#075367",
    light: "#8be2e8",
    stops: [
      {
        title: "Portão dos elementos",
        topic: "Elementos",
        description: "Átomos e elementos, as peças que compõem a matéria.",
      },
      {
        title: "Ponte das moléculas",
        topic: "Moléculas",
        description: "Como os átomos se conectam e formam novas estruturas.",
      },
      {
        title: "Laboratório de mudanças",
        topic: "Reações",
        description: "Transformações da matéria e pistas de uma reação química.",
      },
      {
        title: "Fonte das misturas",
        topic: "Misturas",
        description: "Substâncias, misturas e maneiras de separar seus componentes.",
      },
    ],
  },
  biology: {
    points: [
      { x: 50, y: 87 },
      { x: 50, y: 61 },
      { x: 50, y: 34 },
      { x: 50, y: 14 },
    ],
    color: "#287443",
    shade: "#184d30",
    light: "#b8e784",
    stops: [
      {
        title: "Semente da vida",
        topic: "Células",
        description: "Células e estruturas que tornam a vida possível.",
      },
      {
        title: "Árvore das heranças",
        topic: "Genética",
        description: "Características e informações que passam entre gerações.",
      },
      {
        title: "Vale dos encontros",
        topic: "Ecologia",
        description: "Relações entre seres vivos e os ambientes onde vivem.",
      },
      {
        title: "Estufa das descobertas",
        topic: "Botânica",
        description: "Plantas, suas estruturas e seus ciclos de vida.",
      },
    ],
  },
  mathematics: {
    points: [
      { x: 50, y: 87 },
      { x: 50, y: 71 },
      { x: 50, y: 40 },
      { x: 50, y: 14 },
    ],
    color: "#2456ba",
    shade: "#193b7c",
    light: "#a4ccff",
    stops: [
      {
        title: "Portão dos números",
        topic: "Números",
        description: "Quantidades, operações e relações entre os números.",
      },
      {
        title: "Ponte da álgebra",
        topic: "Álgebra",
        description: "Padrões, expressões e incógnitas que ajudam a resolver problemas.",
      },
      {
        title: "Praça das formas",
        topic: "Geometria",
        description: "Formas, medidas e relações no plano e no espaço.",
      },
      {
        title: "Mirante dos dados",
        topic: "Estatística",
        description: "Leitura de dados, gráficos e informações para tirar conclusões.",
      },
    ],
  },
  programming: {
    points: [
      { x: 50, y: 88 },
      { x: 50, y: 64 },
      { x: 50, y: 37 },
      { x: 50, y: 14 },
    ],
    color: "#176784",
    shade: "#114459",
    light: "#89d8e7",
    stops: [
      {
        title: "Oficina Python",
        topic: "Python",
        description: "Primeiros passos de lógica e programação com Python.",
      },
      {
        title: "Circuito JavaScript",
        topic: "JavaScript",
        description: "Lógica e interações para dar comportamento às páginas.",
      },
      {
        title: "Fundação HTML",
        topic: "HTML",
        description: "Elementos e estrutura semântica de uma página.",
      },
      {
        title: "Ateliê CSS",
        topic: "CSS",
        description: "Estilos, composição e layouts que se adaptam à tela.",
      },
    ],
  },
} as const satisfies Record<
  SubjectIslandId,
  {
    color: string;
    points: readonly { x: number; y: number }[];
    shade: string;
    light: string;
    stops: readonly { title: string; topic: string; description: string }[];
  }
>;
