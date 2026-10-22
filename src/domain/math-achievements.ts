import { MATH_COURSES, isMathCourse, type MathCourseId } from "../data/math-courses.js";
import type { MasteryProgress } from "./math-mastery-progress.js";
import { countSolved } from "./math-game-progress.js";
import type { PracticeActivity } from "./workspace.js";
import { zonedDateTime } from "./agenda-calendar.js";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  target: number;
  metric: "rounds" | "correct" | "days" | "stages" | "islands";
  rarity: "common" | "uncommon" | "rare";
  course?: MathCourseId;
  art: number;
};
const milestones: readonly [Achievement["metric"], string, string, readonly number[]][] = [
  [
    "rounds",
    "Explorador das contas",
    "Jogue {0} rodadas nas ilhas de matemática.",
    [1, 5, 10, 25, 50, 100],
  ],
  [
    "correct",
    "Constelação de acertos",
    "Acerte {0} contas nas ilhas de matemática.",
    [1, 10, 50, 100, 250, 500, 1000, 2500],
  ],
  ["days", "Compasso constante", "Pratique matemática em {0} dias diferentes.", [1, 3, 7, 14, 30]],
  [
    "stages",
    "Construtor de pontes",
    "Conclua {0} etapas das ilhas de matemática.",
    [1, 6, 12, 24, 36],
  ],
  ["islands", "Cartógrafo do infinito", "Conclua {0} ilhas de matemática.", [1, 3, 6]],
];
export const MATH_ACHIEVEMENTS: readonly Achievement[] = [
  ...milestones.flatMap(([metric, name, description, targets], art) =>
    targets.map((target, tier): Achievement => ({
      id: `${metric}-${target}`,
      name,
      description,
      target,
      metric,
      art,
      rarity: tier === targets.length - 1 ? "rare" : tier > 1 ? "uncommon" : "common",
    })),
  ),
  ...MATH_COURSES.flatMap((course, art) =>
    [
      { metric: "correct" as const, target: 20, name: "Primeiras soluções" },
      { metric: "correct" as const, target: 100, name: "Cem ideias" },
      { metric: "stages" as const, target: 1, name: "Primeira travessia" },
      { metric: "stages" as const, target: 3, name: "Meia jornada" },
      { metric: "stages" as const, target: 6, name: "Domínio da ilha" },
    ].map((entry, tier): Achievement => ({
      ...entry,
      id: `${course.id}-${entry.metric}-${entry.target}`,
      course: course.id,
      art,
      description:
        entry.metric === "correct"
          ? "Acerte {0} contas nesta ilha."
          : "Conclua {0} etapas desta ilha.",
      rarity: tier === 4 ? "rare" : tier > 0 ? "uncommon" : "common",
    })),
  ),
];
export function isAchievementId(value: unknown): value is string {
  return typeof value === "string" && MATH_ACHIEVEMENTS.some((item) => item.id === value);
}
export function validAchievementIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MATH_ACHIEVEMENTS.length &&
    value.every(isAchievementId) &&
    new Set(value).size === value.length
  );
}

// Acertos e etapas vêm dos registros sincronizados existentes, sem criar um segundo saldo.
export function mathAchievements(
  progress: Partial<Record<MathCourseId, MasteryProgress>>,
  activities: readonly PracticeActivity[] = [],
  zone = "America/Sao_Paulo",
) {
  const records = [
    ...new Map(
      activities
        .filter(
          (item) =>
            item.islandId.startsWith("mathematics:") &&
            isMathCourse(item.islandId.slice(12)) &&
            Number.isSafeInteger(item.answers) &&
            item.answers > 0 &&
            Number.isSafeInteger(item.correct) &&
            item.correct >= 0 &&
            item.correct <= item.answers &&
            Number.isFinite(Date.parse(item.completedAt)),
        )
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const courses = MATH_COURSES.map(({ id }) => {
    const p = progress[id];
    const own = records.filter((item) => item.islandId === `mathematics:${id}`);
    return {
      id,
      correct: Math.max(
        p?.correct ?? 0,
        own.reduce((sum, item) => sum + item.correct, 0),
      ),
      stages: Math.max(
        countSolved(p?.confirmed ?? 0),
        new Set(
          own.flatMap((item) =>
            Number.isInteger(item.moduleLevel) && item.moduleLevel! >= 0 && item.moduleLevel! < 6
              ? [item.moduleLevel]
              : [],
          ),
        ).size,
      ),
    };
  });
  const totals = {
    rounds: new Set(records.map((item) => item.id.replace(/:\d+:\d+$/, ""))).size,
    correct: courses.reduce((sum, item) => sum + item.correct, 0),
    days: new Set(records.map((item) => zonedDateTime(Date.parse(item.completedAt), zone).date))
      .size,
    stages: courses.reduce((sum, item) => sum + item.stages, 0),
    islands: courses.filter((item) => item.stages === 6).length,
  };
  return MATH_ACHIEVEMENTS.map((achievement) => {
    const course = courses.find((item) => item.id === achievement.course);
    const value =
      course && (achievement.metric === "correct" || achievement.metric === "stages")
        ? course[achievement.metric]
        : totals[achievement.metric];
    return {
      ...achievement,
      value: Math.min(achievement.target, value),
      earned: value >= achievement.target,
    };
  });
}
