import { ENGLISH_SCENE_LEVELS } from "./english-difficulty.js";
export const A1_BANK = 240;
const A1_NEW_START = 120;
export const A1_UNIT_TARGET = 12;
const legacyUnits = [
  0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 2, 0, 0, 0, 1, 1, 1, 0, 1, 0, 2, 4, 4, 1, 1, 1, 5, 5, 5,
];
export function a1Unit(id: number) {
  return id >= A1_NEW_START
    ? Math.floor((id - A1_NEW_START) / 20)
    : (legacyUnits[Math.floor(id / 4)] ?? 0);
}
export function a1Difficulty(id: number) {
  if (id < 120) return Math.min(3, ENGLISH_SCENE_LEVELS[0][Math.floor(id / 4)] ?? 0);
  const position = (id - A1_NEW_START) % 20;
  return position < 6 ? 0 : position < 12 ? 1 : position < 16 ? 2 : 3;
}
export function a1Coverage(solved: Iterable<number>) {
  const unique = new Set(solved);
  const units = Array.from(
    { length: 6 },
    (_, unit) => [...unique].filter((id) => a1Unit(id) === unit).length,
  );
  return { units, ready: unique.size >= 100 && units.every((count) => count >= A1_UNIT_TARGET) };
}
