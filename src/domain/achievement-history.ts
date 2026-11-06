import { GENERAL_ACHIEVEMENTS } from "./general-achievement-catalog.js";
import { ENGLISH_ACHIEVEMENTS } from "./english-achievement-catalog.js";

/** Retained achievements survive deleted source records, never an unknown ID or invented date. */
export function retainedAchievementHistory(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    [...GENERAL_ACHIEVEMENTS, ...ENGLISH_ACHIEVEMENTS].flatMap(({ id }) => {
      const date = (value as Record<string, unknown>)[id];
      return typeof date === "string" &&
        (date === "" || (/^\d{4}-\d{2}-\d{2}T/.test(date) && Number.isFinite(Date.parse(date))))
        ? [[id, date]]
        : [];
    }),
  );
}
