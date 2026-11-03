import { beforeEach, expect, it } from "vitest";
import type { PracticeActivity } from "../domain/workspace";
import { settleEnglishRewards } from "./english-rewards";
import {
  mathPlaceRewards,
  openMathChest,
  revealMathCard,
  oliverCollection,
} from "./math-place-rewards";
function round(id: string, correct = 5): PracticeActivity[] {
  return Array.from({ length: 6 }, (_, at) => ({
    id: `english:${id}:${at}`,
    islandId: "english",
    islandName: "English",
    completedAt: new Date(1700000000000 + at * 1000).toISOString(),
    answers: 1,
    correct: Number(at < correct),
    englishAttempt: {
      curriculum: 4,
      area: "english",
      part: 0,
      mode: "practice",
      questions: [at],
      correctQuestions: at < correct ? [at] : [],
    },
  }));
}
beforeEach(() => localStorage.clear());
it("keeps immediate points but grants exactly one chest for a completed eligible round", () => {
  const records = round("one");
  settleEnglishRewards(records.slice(0, 5), () => 0.5);
  expect(mathPlaceRewards("english-english").points).toBe(100);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(0);
  settleEnglishRewards(records, () => 0.5);
  expect(mathPlaceRewards("english-english").points).toBe(100);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(1);
  settleEnglishRewards(records, () => 0.5);
  expect(mathPlaceRewards("english-english").points).toBe(100);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(1);
  const chest = mathPlaceRewards("english-english").chests[0]!;
  openMathChest("english-english", chest.id, Date.now() + 11000, () => 0);
  revealMathCard("english-english", chest.id);
  expect(oliverCollection()["major-00"]).toBe(1);
  expect(mathPlaceRewards("foundations").points).toBe(0);
});
it("preserves the 100-point threshold, three slots and rare chest chance", () => {
  settleEnglishRewards(round("short", 4), () => 0.5);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(0);
  settleEnglishRewards([...round("a"), ...round("b"), ...round("c"), ...round("d")], () => 0);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(3);
  expect(mathPlaceRewards("english-english").chests.every((chest) => chest.kind === "arcane")).toBe(
    true,
  );
});

it("waits for the end of an arcade round instead of awarding at six answers", () => {
  const records = [...round("arcade:long"), ...round("arcade:extra")].map((item, at) => ({
    ...item,
    id: `english:arcade:long:${at}`,
  }));
  settleEnglishRewards(records, () => 0.5);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(0);
  const ended = records.map((item, at) =>
    at === 11 ? { ...item, id: item.id + ":completed" } : item,
  );
  settleEnglishRewards(ended, () => 0.5);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(1);
  expect(mathPlaceRewards("english-english").points).toBe(200);
  settleEnglishRewards(ended, () => 0.5);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(1);
});

it("waits for all indexed answers when the completion arrives before older synced answers", () => {
  const records = round("arcade:sync").map((item, at) => ({
    ...item,
    id: `english:arcade:sync:${at}${at === 5 ? ":completed" : ""}`,
  }));
  settleEnglishRewards([records[5]!], () => 0.5);
  settleEnglishRewards(records, () => 0.5);
  expect(mathPlaceRewards("english-english").points).toBe(100);
  expect(mathPlaceRewards("english-english").chests).toHaveLength(1);
});
