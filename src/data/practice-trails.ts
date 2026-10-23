import { localizeResource, uiText } from "../i18n/runtime.js";
import type { PRACTICE_ISLANDS } from "./practice-islands";

export type PracticeIsland = (typeof PRACTICE_ISLANDS)[number];
export type SubjectIslandId = Exclude<PracticeIsland["id"], "languages">;
export type TrailIslandId = PracticeIsland["id"];

export const BASIC_MATH_CHAPTERS = localizeResource([
  {
    topic: "Contagem",
    color: "#2456ba",
    shade: "#193b7c",
    light: "#a4ccff",
    lessons: [
      "Contar até 10",
      "Contar até 20",
      "Maior e menor",
      "Dezenas e unidades",
      "Contar até 100",
    ],
  },
  {
    topic: "Adição",
    color: "#218468",
    shade: "#12503e",
    light: "#9ae1b3",
    lessons: [
      "Somar até 10",
      "Somar até 20",
      "Somar dezenas",
      "Somar com reagrupamento",
      "Somar três parcelas",
    ],
  },
  {
    topic: "Subtração",
    color: "#c6593d",
    shade: "#823521",
    light: "#ffb69a",
    lessons: [
      "Tirar até 10",
      "Encontrar a diferença",
      "Subtrair dezenas",
      "Subtrair com reagrupamento",
      "Conferir pela adição",
    ],
  },
  {
    topic: "Multiplicação",
    color: "#286aa1",
    shade: "#174367",
    light: "#9bd5ec",
    lessons: [
      "Grupos iguais",
      "Dobro e triplo",
      "Tabuadas de 2, 5 e 10",
      "Tabuadas de 3, 4 e 6",
      "Tabuadas de 7, 8 e 9",
    ],
  },
  {
    topic: "Divisão",
    color: "#b77720",
    shade: "#734810",
    light: "#ffe29b",
    lessons: [
      "Repartir igualmente",
      "Metade e terça parte",
      "Divisão exata",
      "Divisão com resto",
      "Conferir pela multiplicação",
    ],
  },
  {
    topic: "Contas mistas",
    color: "#397a7e",
    shade: "#224c50",
    light: "#ace0d9",
    lessons: [
      "Somar e subtrair",
      "Multiplicar e dividir",
      "Ordem das operações",
      "Contas com parênteses",
      "Desafio das quatro operações",
    ],
  },
  {
    topic: "Frações",
    color: "#ba5267",
    shade: "#7a3344",
    light: "#ffc1cf",
    lessons: [
      "Partes de um inteiro",
      "Metades e quartos",
      "Frações equivalentes",
      "Comparar frações",
      "Somar frações de mesmo denominador",
    ],
  },
  {
    topic: "Decimais",
    color: "#376db0",
    shade: "#204573",
    light: "#b4d8ff",
    lessons: [
      "Décimos e centésimos",
      "Comparar decimais",
      "Somar decimais",
      "Subtrair decimais",
      "Decimais em contas de dinheiro",
    ],
  },
  {
    topic: "Porcentagens",
    color: "#b88322",
    shade: "#735114",
    light: "#ffe8a6",
    lessons: [
      "O que significa por cento",
      "Calcular 50% e 25%",
      "Calcular 10% e 1%",
      "Descontos simples",
      "Porcentagem de uma quantidade",
    ],
  },
  {
    topic: "Dia a dia",
    color: "#4d7b38",
    shade: "#2b4f20",
    light: "#c0df98",
    lessons: [
      "Compras e troco",
      "Horas e minutos",
      "Comprimentos e medidas",
      "Dobrar e dividir receitas",
      "Desafio final de matemática básica",
    ],
  },
] as const);
export const BASIC_MATH_LEVELS = BASIC_MATH_CHAPTERS.flatMap((chapter, chapterIndex) =>
  chapter.lessons.map((title, step) => ({
    title,
    topic: chapter.topic,
    chapter: chapterIndex,
    step,
    description: uiText(2180),
  })),
);
export const MATH_SCENE_COUNT = Math.ceil(BASIC_MATH_LEVELS.length / 4);
function mathPosition(index: number, landings: readonly number[]) {
  return (
    ((MATH_SCENE_COUNT - 1 - Math.floor(index / 4)) * 100 + landings[index % 4]!) / MATH_SCENE_COUNT
  );
}

// Coordinates are measured on each portrait's actual flat landings.
export const MOBILE_TRAIL_Y: Record<TrailIslandId, readonly number[]> = {
  languages: [85, 62, 39, 16],
  portuguese: [85, 63, 41, 19],
  chemistry: [82, 56, 39, 17],
  biology: [85, 61, 35, 14],
  mathematics: BASIC_MATH_LEVELS.map((_, index) => mathPosition(index, [90, 63, 36, 14])),
  programming: [86, 56, 31, 13],
};

export const SUBJECT_TRAILS = localizeResource({
  languages: {
    points: [
      { x: 50, y: 85 },
      { x: 50, y: 62 },
      { x: 50, y: 39 },
      { x: 50, y: 16 },
    ],
    color: "#176784",
    shade: "#114459",
    light: "#d7e8a2",
    stops: [
      {
        title: uiText(2332),
        topic: "Vocabulário",
        description: uiText(2181),
      },
      {
        title: uiText(2333),
        topic: "Escuta",
        description: uiText(2181),
      },
      {
        title: uiText(2334),
        topic: "Conversação",
        description: uiText(2181),
      },
      {
        title: uiText(2182),
        topic: "Leitura",
        description: uiText(2181),
      },
    ],
  },
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
        title: uiText(2335),
        topic: "Gramática",
        description: uiText(2336),
      },
      {
        title: uiText(2183),
        topic: "Literatura",
        description: uiText(2184),
      },
      {
        title: uiText(2337),
        topic: "Interpretação",
        description: uiText(2185),
      },
      {
        title: uiText(2186),
        topic: "Escrita",
        description: uiText(2187),
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
        title: uiText(2188),
        topic: "Elementos",
        description: uiText(2189),
      },
      {
        title: uiText(2190),
        topic: "Moléculas",
        description: uiText(2191),
      },
      {
        title: uiText(2192),
        topic: "Reações",
        description: uiText(2193),
      },
      {
        title: uiText(2338),
        topic: "Misturas",
        description: uiText(2194),
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
        title: uiText(2339),
        topic: "Células",
        description: uiText(2195),
      },
      {
        title: uiText(2196),
        topic: "Genética",
        description: uiText(2197),
      },
      {
        title: uiText(2340),
        topic: "Ecologia",
        description: uiText(2198),
      },
      {
        title: uiText(2341),
        topic: "Botânica",
        description: uiText(2342),
      },
    ],
  },
  mathematics: {
    points: BASIC_MATH_LEVELS.map((_, index) => ({
      x: 50,
      y: mathPosition(index, [87, 71, 40, 14]),
    })),
    color: "#2456ba",
    shade: "#193b7c",
    light: "#a4ccff",
    stops: BASIC_MATH_LEVELS,
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
        title: uiText(2343),
        topic: "Python",
        description: uiText(2199),
      },
      {
        title: uiText(2344),
        topic: "JavaScript",
        description: uiText(2200),
      },
      {
        title: uiText(2201),
        topic: "HTML",
        description: uiText(2202),
      },
      {
        title: uiText(2203),
        topic: "CSS",
        description: uiText(2204),
      },
    ],
  },
} as const satisfies Record<
  TrailIslandId,
  {
    color: string;
    points: readonly { x: number; y: number }[];
    shade: string;
    light: string;
    stops: readonly { title: string; topic: string; description: string }[];
  }
>);
