import { isMathCourse, type MathCourseId } from "./math-courses";
import { drawOliverCards, isOliverCard, randomCardRoll, type OliverCardId } from "./oliver-cards";
import { OLIVER_TAROT, type OliverArtworkId } from "./oliver-tarot";
import { writeSyncedStorage } from "./synced-storage";

export const MATH_PLACE_REWARDS_KEY = "helena.mathPlaceRewards.v1";
export const COMMON_CHEST_POINTS = 100;
export const COMMON_CHEST_WAIT = 60_000;
export const MAX_MATH_CHESTS = 3;
export const ARCANE_CHEST_CHANCE = 0.05;
export type MathChest = {
  id: string;
  unlockAt: number | null;
  opened: boolean;
  cards?: OliverCardId[];
  revealed?: number;
  kind?: "common" | "arcane";
  arcana?: typeof OLIVER_TAROT.id;
};
export function chestCards(chest: MathChest): OliverArtworkId[] {
  return chest.arcana ? [chest.arcana] : (chest.cards ?? []);
}
export function isChestCollected(chest: MathChest) {
  return (
    chest.opened &&
    (chestCards(chest).length === 0 || (chest.revealed ?? 0) >= chestCards(chest).length)
  );
}
export type MathPlaceRewards = {
  points: number;
  receipts: string[];
  chests: MathChest[];
  rounds?: Record<string, number>;
};
const empty = (): MathPlaceRewards => ({ points: 0, receipts: [], chests: [] });
export function parseMathRewards(
  serialized: string,
): Partial<Record<MathCourseId, MathPlaceRewards>> {
  try {
    const raw: unknown = JSON.parse(serialized);
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(
      Object.entries(raw).filter(([course, item]) => {
        if (!isMathCourse(course) || !item || typeof item !== "object") return false;
        const value = item as MathPlaceRewards;
        return (
          Number.isSafeInteger(value.points) &&
          value.points >= 0 &&
          (value.rounds === undefined ||
            (value.rounds !== null &&
              typeof value.rounds === "object" &&
              !Array.isArray(value.rounds) &&
              Object.values(value.rounds).every(
                (points) => Number.isSafeInteger(points) && points >= 0,
              ) &&
              Object.values(value.rounds).reduce((sum, points) => sum + points, 0) <=
                value.points)) &&
          Array.isArray(value.receipts) &&
          value.receipts.every((id) => typeof id === "string") &&
          Array.isArray(value.chests) &&
          value.chests.every(
            (chest) =>
              chest &&
              typeof chest.id === "string" &&
              typeof chest.opened === "boolean" &&
              (chest.kind === undefined || chest.kind === "common" || chest.kind === "arcane") &&
              (chest.arcana === undefined ||
                (chest.kind === "arcane" &&
                  chest.arcana === OLIVER_TAROT.id &&
                  (!chest.opened ||
                    (Number.isInteger(chest.revealed) &&
                      chest.revealed! >= 0 &&
                      chest.revealed! <= 2)))) &&
              (chest.kind !== "arcane" || chest.arcana === OLIVER_TAROT.id) &&
              (chest.cards === undefined ||
                (Array.isArray(chest.cards) &&
                  chest.cards.length >= 1 &&
                  chest.cards.length <= 2 &&
                  chest.cards.every(isOliverCard) &&
                  chest.opened &&
                  Number.isInteger(chest.revealed) &&
                  chest.revealed! >= 0 &&
                  chest.revealed! <= chest.cards.length)) &&
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
function readAll() {
  return parseMathRewards(localStorage.getItem(MATH_PLACE_REWARDS_KEY) ?? "{}");
}
export function mathPlaceRewards(course: MathCourseId): MathPlaceRewards {
  return readAll()[course] ?? empty();
}
function save(course: MathCourseId, value: MathPlaceRewards) {
  writeSyncedStorage(MATH_PLACE_REWARDS_KEY, JSON.stringify({ ...readAll(), [course]: value }));
  return value;
}
export function finishMathPlace(
  course: MathCourseId,
  id: string,
  points: number,
  random = randomCardRoll,
) {
  const value = mathPlaceRewards(course);
  if (
    !id ||
    !Number.isSafeInteger(points) ||
    points < 0 ||
    !Number.isSafeInteger(value.points + points)
  )
    throw new Error("Pontuação inválida.");
  if (value.receipts.includes(id)) return value;
  const eligible =
    points >= COMMON_CHEST_POINTS &&
    value.chests.filter((chest) => !isChestCollected(chest)).length < MAX_MATH_CHESTS;
  const roll = eligible ? random() : 1;
  if (!Number.isFinite(roll) || roll < 0 || (eligible && roll >= 1))
    throw new Error("Sorteio inválido.");
  const arcane = roll < ARCANE_CHEST_CHANCE;
  return save(course, {
    points: value.points + points,
    receipts: [...value.receipts, id],
    rounds: { ...value.rounds, [id]: points },
    chests: eligible
      ? [
          ...value.chests,
          {
            id,
            unlockAt: null,
            opened: false,
            ...(arcane ? { kind: "arcane" as const, arcana: OLIVER_TAROT.id } : {}),
          },
        ]
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
export function openMathChest(
  course: MathCourseId,
  id: string,
  now = Date.now(),
  random?: () => number,
) {
  const value = mathPlaceRewards(course);
  return save(course, {
    ...value,
    chests: value.chests.map((chest) =>
      chest.id === id && !chest.opened && chest.unlockAt !== null && chest.unlockAt <= now
        ? {
            ...chest,
            opened: true,
            ...(chest.arcana ? {} : { cards: drawOliverCards(random) }),
            revealed: 0,
          }
        : chest,
    ),
  });
}
export function revealMathCard(course: MathCourseId, id: string) {
  const value = mathPlaceRewards(course);
  return save(course, {
    ...value,
    chests: value.chests.map((chest) =>
      chest.id === id && chest.opened && (chest.revealed ?? 0) < chestCards(chest).length
        ? { ...chest, revealed: (chest.revealed ?? 0) + 1 }
        : chest,
    ),
  });
}
export function oliverCollection(): Partial<Record<OliverArtworkId, number>> {
  const collection: Partial<Record<OliverArtworkId, number>> = {};
  for (const place of Object.values(readAll()))
    for (const chest of place.chests) {
      for (const card of chestCards(chest).slice(0, chest.revealed ?? 0))
        collection[card] = (collection[card] ?? 0) + 1;
    }
  return collection;
}
