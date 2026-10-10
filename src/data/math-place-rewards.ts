import { isMathCourse, type MathCourseId } from "./math-courses";

export const MATH_PLACE_REWARDS_KEY = "helena.mathPlaceRewards.v1";
export const COMMON_CHEST_POINTS = 100;
export const COMMON_CHEST_WAIT = 60_000;
export type MathChest = { id: string; unlockAt: number | null; opened: boolean };
export type MathPlaceRewards = { points: number; receipts: string[]; chests: MathChest[] };
const empty = (): MathPlaceRewards => ({ points: 0, receipts: [], chests: [] });
function readAll(): Partial<Record<MathCourseId, MathPlaceRewards>> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(MATH_PLACE_REWARDS_KEY) ?? "{}");
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(
      Object.entries(raw).filter(([course, item]) => {
        if (!isMathCourse(course) || !item || typeof item !== "object") return false;
        const value = item as MathPlaceRewards;
        return (
          Number.isSafeInteger(value.points) &&
          value.points >= 0 &&
          Array.isArray(value.receipts) &&
          value.receipts.every((id) => typeof id === "string") &&
          Array.isArray(value.chests) &&
          value.chests.every(
            (chest) =>
              chest &&
              typeof chest.id === "string" &&
              typeof chest.opened === "boolean" &&
              (chest.unlockAt === null ||
                (Number.isSafeInteger(chest.unlockAt) && chest.unlockAt >= 0)),
          )
        );
      }),
    );
  } catch {
    return {};
  }
}
export function mathPlaceRewards(course: MathCourseId): MathPlaceRewards {
  return readAll()[course] ?? empty();
}
function save(course: MathCourseId, value: MathPlaceRewards) {
  localStorage.setItem(MATH_PLACE_REWARDS_KEY, JSON.stringify({ ...readAll(), [course]: value }));
  return value;
}
export function finishMathPlace(course: MathCourseId, id: string, points: number) {
  const value = mathPlaceRewards(course);
  if (
    !id ||
    !Number.isSafeInteger(points) ||
    points < 0 ||
    !Number.isSafeInteger(value.points + points)
  )
    throw new Error("Pontuação inválida.");
  if (value.receipts.includes(id)) return value;
  return save(course, {
    points: value.points + points,
    receipts: [...value.receipts, id],
    chests:
      points >= COMMON_CHEST_POINTS
        ? [...value.chests, { id, unlockAt: null, opened: false }]
        : value.chests,
  });
}
export function unlockMathChest(course: MathCourseId, id: string, now = Date.now()) {
  const value = mathPlaceRewards(course);
  return save(course, {
    ...value,
    chests: value.chests.map((chest) =>
      chest.id === id && chest.unlockAt === null && !chest.opened
        ? { ...chest, unlockAt: now + COMMON_CHEST_WAIT }
        : chest,
    ),
  });
}
export function openMathChest(course: MathCourseId, id: string, now = Date.now()) {
  const value = mathPlaceRewards(course);
  return save(course, {
    ...value,
    chests: value.chests.map((chest) =>
      chest.id === id && chest.unlockAt !== null && chest.unlockAt <= now
        ? { ...chest, opened: true }
        : chest,
    ),
  });
}
