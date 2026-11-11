import type { MathAchievement } from "./math-achievements.js";
import { ENGLISH_PART_ORDER } from "./english-part-order.js";

export type EnglishAchievementMetric =
  "rounds" | "correct" | "days" | "parts" | "perfect" | "variety";
export type EnglishAchievement = Omit<MathAchievement, "category" | "metric"> & {
  category: "english";
  metric: EnglishAchievementMetric;
  family: string;
  part?: number;
};
const families: readonly [EnglishAchievementMetric, string, string, readonly number[]][] = [
  ["rounds", "Conversas a bordo", "Pratique {0} rodadas de inglês.", [1, 5, 10, 25, 50, 100]],
  [
    "correct",
    "Palavras que conectam",
    "Acerte {0} atividades de inglês.",
    [1, 10, 50, 100, 250, 500, 1000, 2500],
  ],
  ["days", "Farol constante", "Pratique inglês em {0} dias diferentes.", [1, 3, 7, 14, 30]],
  ["parts", "Pontes entre palavras", "Confirme {0} partes da ilha de inglês.", [1, 2, 4, 6, 8]],
  [
    "perfect",
    "Conversa sem tropeços",
    "Conclua {0} rodadas de inglês sem erros, com pelo menos cinco respostas em cada uma.",
    [1, 5, 10, 25],
  ],
  [
    "variety",
    "Bagagem de ideias",
    "Acerte {0} atividades diferentes de inglês.",
    [10, 50, 100, 250, 500, 1000],
  ],
];
const partGoals = [
  ["Boas-vindas com a Olena", "Confirme a parte Cais das Boas-vindas de inglês."],
  ["Ritmo da praça", "Confirme a parte Praça dos Hábitos de inglês."],
  ["Memórias compartilhadas", "Confirme a parte Ponte das Memórias de inglês."],
  ["Novos horizontes", "Confirme a parte Mirante dos Planos de inglês."],
  ["Ideias em diálogo", "Confirme a parte Pátio das Ideias de inglês."],
  ["Sentidos em sintonia", "Confirme a parte Casa dos Sentidos de inglês."],
  ["Encontros no mercado", "Confirme a parte Mercado dos Encontros de inglês."],
  ["Leitora das entrelinhas", "Confirme a parte Arquivo das Entrelinhas de inglês."],
] as const;
const partPracticeNames = [
  "Vozes do cais",
  "Palavras na praça",
  "Relatos da ponte",
  "Planos em palavras",
  "Ideias em conversa",
  "Sentidos nas palavras",
  "Conversas no mercado",
  "Palavras nas entrelinhas",
] as const;
export const ENGLISH_ACHIEVEMENTS: readonly EnglishAchievement[] = [
  ...families.flatMap(([metric, name, description, targets], art) =>
    targets.map((target, tier) => ({
      category: "english" as const,
      id: `english-${metric}-${target}`,
      family: `english-${metric}`,
      name,
      description,
      metric,
      target,
      art,
      rarity:
        tier === targets.length - 1
          ? ("rare" as const)
          : tier > 1
            ? ("uncommon" as const)
            : ("common" as const),
    })),
  ),
  ...ENGLISH_PART_ORDER.flatMap((part): EnglishAchievement[] => [
    ...([20, 100] as const).map((target, tier): EnglishAchievement => ({
      category: "english",
      id: `english-part-${part}-correct-${target}`,
      family: `english-part-${part}-correct`,
      part,
      metric: "correct",
      target,
      art: 6 + part,
      rarity: tier === 0 ? "common" : "uncommon",
      name: partPracticeNames[part]!,
      description: "Acerte {0} atividades nesta parte de inglês.",
    })),
    ...([25, 50] as const).map((target, tier): EnglishAchievement => ({
      category: "english",
      id: `english-part-${part}-variety-${target}`,
      family: `english-part-${part}`,
      part,
      metric: "variety",
      target,
      art: 6 + part,
      rarity: tier === 0 ? "common" : "uncommon",
      name: partGoals[part]![0],
      description: "Acerte {0} atividades diferentes nesta parte de inglês.",
    })),
    {
      category: "english",
      id: `english-part-${part}`,
      family: `english-part-${part}`,
      part,
      metric: "parts",
      target: 100,
      art: 6 + part,
      rarity: "rare",
      name: partGoals[part]![0],
      description: partGoals[part]![1],
    },
  ]),
];
