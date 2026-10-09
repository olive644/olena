import type { PRACTICE_ISLANDS } from "./practice-islands";

export type PracticeIsland = (typeof PRACTICE_ISLANDS)[number];
export type SubjectIslandId = Exclude<PracticeIsland["id"], "languages">;

export const SUBJECT_TRAILS = {
  portuguese: {
    route: "M144 620 C144 540 216 525 216 450 S140 360 140 280 S190 190 190 100",
    points: [
      { x: 40, y: 86.1111 },
      { x: 60, y: 62.5 },
      { x: 38.8889, y: 38.8889 },
      { x: 52.7778, y: 13.8889 },
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
    route: "M130 620 130 535 220 480 220 430 140 360 140 275 195 210 195 100",
    points: [
      { x: 36.1111, y: 86.1111 },
      { x: 61.1111, y: 59.7222 },
      { x: 38.8889, y: 38.1944 },
      { x: 54.1667, y: 13.8889 },
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
    route: "M150 620 C110 540 220 520 220 450 S160 355 145 275 S190 180 175 100",
    points: [
      { x: 41.6667, y: 86.1111 },
      { x: 61.1111, y: 62.5 },
      { x: 40.2778, y: 38.1944 },
      { x: 48.6111, y: 13.8889 },
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
    route: "M140 620 140 560 220 490 220 440 135 345 135 270 180 180 180 100",
    points: [
      { x: 55.1, y: 74.5 },
      { x: 48.1, y: 52 },
      { x: 44.9, y: 27.8 },
      { x: 36.3, y: 18.1 },
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
    route: "M130 620 130 530 220 530 220 445 220 350 140 350 140 275 140 175 190 175 190 100",
    points: [
      { x: 36.1111, y: 86.1111 },
      { x: 61.1111, y: 61.8056 },
      { x: 38.8889, y: 38.1944 },
      { x: 52.7778, y: 13.8889 },
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
    route: string;
    points: readonly { x: number; y: number }[];
    shade: string;
    light: string;
    stops: readonly { title: string; topic: string; description: string }[];
  }
>;
