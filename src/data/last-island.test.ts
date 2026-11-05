import { afterEach, expect, it } from "vitest";
import { lastIslandOf, readLastIsland, rememberEnteredIsland } from "./last-island";
const NOW = Date.parse("2026-11-05T12:00:00Z");
const at = (minutes: number) => new Date(NOW - minutes * 60000).toISOString();
const math = (minutes: number, course = "school") => ({
  islandId: `mathematics:${course}`,
  completedAt: at(minutes),
  answers: 1,
});
const english = (minutes: number, part = 0) => ({
  islandId: "english",
  completedAt: at(minutes),
  answers: 1,
  englishAttempt: { part },
});
afterEach(() => localStorage.clear());
it("defaults to mathematics when nothing was entered or practiced", () => {
  expect(lastIslandOf([], NOW, undefined)).toEqual({ id: "mathematics", course: undefined });
});
it("follows the most recent practice between mathematics and english", () => {
  expect(lastIslandOf([math(60), english(5, 2)], NOW, undefined)).toEqual({
    id: "english",
    part: 2,
  });
  expect(lastIslandOf([english(60), math(5, "geometry")], NOW, undefined)).toEqual({
    id: "mathematics",
    course: "geometry",
  });
});
it("an island entered after the last practice wins, with the part that was opened", () => {
  const stored = { id: "english" as const, part: 3, at: NOW - 1000 };
  expect(lastIslandOf([math(5)], NOW, stored)).toEqual({ id: "english", part: 3 });
});
it("a practice more recent than the last entry wins over it", () => {
  const stored = { id: "english" as const, part: 3, at: NOW - 3_600_000 };
  expect(lastIslandOf([math(5, "school")], NOW, stored)).toEqual({
    id: "mathematics",
    course: "school",
  });
});
it("keeps the math course of the latest math practice when mathematics was entered last", () => {
  const stored = { id: "mathematics" as const, at: NOW - 1000 };
  expect(lastIslandOf([english(5), math(60, "geometry")], NOW, stored)).toEqual({
    id: "mathematics",
    course: "geometry",
  });
});
it("ignores empty practices, future records and other islands", () => {
  const empty = { ...english(1), answers: 0 };
  const future = { ...english(-60), englishAttempt: { part: 4 } };
  const other = { islandId: "languages", completedAt: at(1), answers: 3 };
  expect(lastIslandOf([empty, future, other], NOW, undefined).id).toBe("mathematics");
});
it("stores the entered island per account and rejects another account's record", () => {
  localStorage.setItem("helena.account.v1", "uid-1");
  rememberEnteredIsland("english", 2);
  expect(readLastIsland()).toMatchObject({ id: "english", part: 2 });
  localStorage.setItem("helena.account.v1", "uid-2");
  expect(readLastIsland()).toBeUndefined();
});
it("drops a corrupt stored record and an invalid part", () => {
  localStorage.setItem("helena.lastIsland.v1", "{nope");
  expect(readLastIsland()).toBeUndefined();
  localStorage.setItem(
    "helena.lastIsland.v1",
    JSON.stringify({ owner: null, id: "english", part: 99, at: 5 }),
  );
  expect(readLastIsland()).toEqual({ id: "english", at: 5 });
});
