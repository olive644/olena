import { MATH_COURSES, isMathCourse, type MathCourseId } from "../data/math-courses.js";
import type { MasteryProgress } from "./math-mastery-progress.js";
import { countSolved } from "./math-game-progress.js";
import type { PracticeActivity } from "./workspace.js";
import { zonedDateTime } from "./agenda-calendar.js";
import { GENERAL_ACHIEVEMENTS, type GeneralAchievement } from "./general-achievement-catalog.js";

export type MathAchievement = {
  category?: "mathematics";
  id: string;
  name: string;
  description: string;
  target: number;
  metric: "rounds" | "correct" | "days" | "stages" | "islands";
  rarity: "common" | "uncommon" | "rare";
  course?: MathCourseId;
  art: number;
};
export type Achievement = MathAchievement | GeneralAchievement;
const milestones: readonly [MathAchievement["metric"], string, string, readonly number[]][] = [
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
export const MATH_ACHIEVEMENTS: readonly MathAchievement[] = [
  ...milestones.flatMap(([metric, name, description, targets], art) =>
    targets.map((target, tier): MathAchievement => ({
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
    ].map((entry, tier): MathAchievement => ({
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
export const ALL_ACHIEVEMENTS: readonly Achievement[] = [
  ...MATH_ACHIEVEMENTS,
  ...GENERAL_ACHIEVEMENTS,
];
export function validAchievementFavorites(value: unknown): value is string[] {
  return validAchievementIds(value) && value.length <= 3;
}
export function isAchievementId(value: unknown): value is string {
  return typeof value === "string" && ALL_ACHIEVEMENTS.some((item) => item.id === value);
}
export function validAchievementIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= ALL_ACHIEVEMENTS.length &&
    value.every(isAchievementId) &&
    new Set(value).size === value.length
  );
}
export function validAchievementDates(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).length <= ALL_ACHIEVEMENTS.length &&
    Object.entries(value).every(
      ([id, date]) =>
        isAchievementId(id) &&
        typeof date === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(date) &&
        Number.isFinite(Date.parse(date)),
    )
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
  // Datas só vêm de recibos datados. Progresso legado sem recibo não ganha data inventada.
  const dates = new Map<string, string>();
  const rounds = new Set<string>(),
    days = new Set<string>();
  const history = new Map<MathCourseId, { correct: number; stages: Set<number> }>();
  for (const record of [...records].sort(
    (a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt),
  )) {
    const id = record.islandId.slice(12) as MathCourseId;
    const course = history.get(id) ?? { correct: 0, stages: new Set<number>() };
    course.correct += record.correct;
    if (Number.isInteger(record.moduleLevel) && record.moduleLevel! >= 0 && record.moduleLevel! < 6)
      course.stages.add(record.moduleLevel!);
    history.set(id, course);
    rounds.add(record.id.replace(/:\d+:\d+$/, ""));
    days.add(zonedDateTime(Date.parse(record.completedAt), zone).date);
    const snapshot = [...history.values()];
    const counters = {
      correct: snapshot.reduce((sum, item) => sum + item.correct, 0),
      stages: snapshot.reduce((sum, item) => sum + item.stages.size, 0),
      islands: snapshot.filter((item) => item.stages.size === 6).length,
      rounds: rounds.size,
      days: days.size,
    };
    for (const goal of MATH_ACHIEVEMENTS) {
      const own = goal.course ? history.get(goal.course) : undefined;
      const amount = goal.course
        ? goal.metric === "correct"
          ? (own?.correct ?? 0)
          : (own?.stages.size ?? 0)
        : counters[goal.metric];
      if (amount >= goal.target && !dates.has(goal.id)) dates.set(goal.id, record.completedAt);
    }
  }
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
      earnedAt: dates.get(achievement.id),
    };
  });
}
