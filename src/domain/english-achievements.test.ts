import { achievementArtPath, achievementFamilies } from "./achievement-presentation";
import { expect, it } from "vitest";
import { englishAchievements } from "./english-achievements";
import { ENGLISH_ACHIEVEMENTS } from "./english-achievement-catalog";
import { validAchievementFavorites, validAchievementDates } from "./math-achievements";
import { mergeProfileProgress } from "./profile-progress";
import { retainedAchievementHistory } from "./achievement-history";
import type { PracticeActivity } from "./workspace";

const now = new Date("2026-11-06T12:00:00Z");
function receipt(
  index: number,
  correct = true,
  completed = false,
  round = "sample",
): PracticeActivity {
  return {
    id: `english:arcade:${round}:${index}${completed ? ":completed" : ""}`,
    islandId: "english",
    islandName: "English",
    answers: 1,
    correct: Number(correct),
    completedAt: new Date(Date.parse("2026-11-01T12:00:00Z") + index * 1000).toISOString(),
    englishAttempt: {
      curriculum: 4,
      area: "english",
      part: 0,
      mode: "practice",
      questions: [index],
      correctQuestions: correct ? [index] : [],
    },
  };
}
it("has progressive global and per-part families without invented progress", () => {
  expect(ENGLISH_ACHIEVEMENTS).toHaveLength(74);
  expect(new Set(ENGLISH_ACHIEVEMENTS.map((item) => item.id)).size).toBe(74);
  expect(new Set(ENGLISH_ACHIEVEMENTS.map((item) => item.family)).size).toBe(22);
  expect(
    englishAchievements([], undefined, now).every(
      (item) => !item.earned && item.value === 0 && !item.earnedAt,
    ),
  ).toBe(true);
  expect(
    validAchievementFavorites(["english-correct-1", "correct-1", "general-streak-bronze"]),
  ).toBe(true);
  expect(validAchievementDates({ "english-correct-1": "2026-11-01T12:00:00Z" })).toBe(true);
});
it("counts per-answer receipts as one round, deduplicates IDs and dates the threshold", () => {
  const records = Array.from({ length: 5 }, (_, i) => receipt(i, true, i === 4));
  const goals = englishAchievements(
    [...records, records[0]!, ...records].reverse(),
    undefined,
    now,
  );
  expect(goals.find((item) => item.id === "english-rounds-5")?.value).toBe(1);
  expect(goals.find((item) => item.id === "english-correct-10")?.value).toBe(5);
  expect(goals.find((item) => item.id === "english-perfect-1")).toMatchObject({
    earned: true,
    earnedAt: records[4]!.completedAt,
  });
});
it("never labels a short, unfinished or mistaken round as perfect", () => {
  for (const records of [
    [receipt(0, true, true)],
    Array.from({ length: 5 }, (_, i) => receipt(i)),
    Array.from({ length: 5 }, (_, i) => receipt(i, i !== 2, i === 4)),
  ])
    expect(
      englishAchievements(records, undefined, now).find((item) => item.id === "english-perfect-1")
        ?.earned,
    ).toBe(false);
});
it("replaying an answer raises correct practice but not distinct-task evidence", () => {
  const records = Array.from({ length: 10 }, (_, i) => ({
    ...receipt(0),
    id: `english:arcade:r${i}:0`,
  }));
  const goals = englishAchievements(records, undefined, now);
  expect(goals.find((item) => item.id === "english-correct-10")?.earned).toBe(true);
  expect(goals.find((item) => item.id === "english-variety-10")?.value).toBe(1);
});
it("ignores mathematics, malformed records and future dates", () => {
  const sample = receipt(0);
  const goals = englishAchievements(
    [
      { ...sample, islandId: "mathematics:foundations" },
      { ...sample, id: "mismatch", correct: 2 },
      { ...sample, id: "future", completedAt: "2028-01-01T00:00:00Z" },
      { ...sample, id: "bad-date", completedAt: "bad" },
    ],
    undefined,
    now,
  );
  expect(goals.every((item) => !item.earned)).toBe(true);
});
it("counts study days in the account timezone", () => {
  const records = ["2026-11-01T02:30:00Z", "2026-11-01T03:30:00Z"].map((completedAt, i) => ({
    ...receipt(i),
    completedAt,
  }));
  expect(
    englishAchievements(records, "America/Sao_Paulo", now).find(
      (item) => item.id === "english-days-3",
    )?.value,
  ).toBe(2);
  expect(
    englishAchievements(records, "UTC", now).find((item) => item.id === "english-days-3")?.value,
  ).toBe(1);
});
it("only awards parts from accepted confirmations, including the new B1 and C1 locations", () => {
  const records: PracticeActivity[] = [];
  for (const part of [0, 1, 2, 3, 6, 4, 7, 5]) {
    for (let id = 0; id < 100; id++) {
      const item = receipt(id, true, false, `part${part}`);
      records.push({
        ...item,
        completedAt: new Date(
          Date.parse("2026-11-01T12:00:00Z") + records.length * 1000,
        ).toISOString(),
        englishAttempt: { ...item.englishAttempt!, part },
      });
    }
    records.push({
      id: `english:arcade:final${part}`,
      islandId: "english",
      islandName: "English",
      answers: 5,
      correct: 5,
      completedAt: new Date(
        Date.parse("2026-11-01T12:00:00Z") + records.length * 1000,
      ).toISOString(),
      englishAttempt: {
        curriculum: 4,
        area: "english",
        part,
        mode: "final",
        questions: [0, 1, 2, 3, 4],
        correctQuestions: [0, 1, 2, 3, 4],
      },
    });
  }
  const goals = englishAchievements(records, undefined, now);
  expect(goals.find((item) => item.id === "english-parts-8")).toMatchObject({
    earned: true,
    earnedAt: records.at(-1)!.completedAt,
  });
  const unqualified = [
    {
      ...receipt(0),
      answers: 5,
      correct: 5,
      englishAttempt: {
        curriculum: 4 as const,
        area: "english" as const,
        part: 0,
        mode: "final" as const,
        questions: [0, 1, 2, 3, 4],
        correctQuestions: [0, 1, 2, 3, 4],
      },
    },
  ];
  expect(
    englishAchievements(unqualified, undefined, now).find((item) => item.id === "english-parts-1")
      ?.earned,
  ).toBe(false);
});
it("retains only known English history and the earliest proven date through sync", () => {
  const selected = JSON.stringify({
    achievementFavorites: [],
    achievementHistory: { "english-correct-1": "2026-11-03T12:00:00Z" },
  });
  const incoming = JSON.stringify({
    achievementHistory: {
      "english-correct-1": "2026-11-01T12:00:00Z",
      invented: "2026-11-01T12:00:00Z",
    },
  });
  const merged = JSON.parse(mergeProfileProgress(selected, incoming)!);
  expect(merged.achievementHistory).toEqual({ "english-correct-1": "2026-11-01T12:00:00Z" });
  expect(merged.achievementFavorites).toEqual([]);
  expect(
    retainedAchievementHistory({
      "english-correct-1": "",
      unknown: "",
      "english-perfect-1": "bad",
    }),
  ).toEqual({ "english-correct-1": "" });
});

it("gives each part intermediate milestones and keeps Olena as its final tier", () => {
  for (let part = 0; part < 8; part++) {
    const family = ENGLISH_ACHIEVEMENTS.filter((goal) => goal.family === `english-part-${part}`);
    expect(family.map((goal) => goal.id)).toEqual([
      `english-part-${part}-variety-25`,
      `english-part-${part}-variety-50`,
      `english-part-${part}`,
    ]);
    expect(family.at(-1)?.rarity).toBe("rare");
    expect(family.map((goal) => goal.target)).toEqual([25, 50, 100]);
  }
});
it("counts accepted current receipts per part with dates and distinct tasks", () => {
  const records = Array.from({ length: 50 }, (_, index) => receipt(index));
  const goals = englishAchievements([...records, ...records], undefined, now);
  expect(goals.find((goal) => goal.id === "english-part-0-correct-20")).toMatchObject({
    earned: true,
    value: 20,
    earnedAt: records[19]!.completedAt,
  });
  expect(goals.find((goal) => goal.id === "english-part-0-variety-50")).toMatchObject({
    earned: true,
    value: 50,
    earnedAt: records[49]!.completedAt,
  });
  expect(goals.find((goal) => goal.id === "english-part-0")?.earned).toBe(false);
  expect(goals.filter((goal) => goal.part === 1).every((goal) => goal.value === 0)).toBe(true);
  const repeated = records.map((record, index) => ({
    ...record,
    englishAttempt: { ...record.englishAttempt!, questions: [0], correctQuestions: [0] },
    id: `english:arcade:repeat:${index}`,
  }));
  expect(
    englishAchievements(repeated, undefined, now).find(
      (goal) => goal.id === "english-part-0-variety-25",
    )?.value,
  ).toBe(1);
});

it("uses distinct art for every level and shows the highest earned tier per family", () => {
  expect(new Set(ENGLISH_ACHIEVEMENTS.map((goal) => achievementArtPath(goal))).size).toBe(74);
  const ids = new Set(["english-part-0-variety-25", "english-part-0-variety-50"]);
  const families = achievementFamilies(ENGLISH_ACHIEVEMENTS, ids);
  expect(families.find((goal) => "family" in goal && goal.family === "english-part-0")?.id).toBe(
    "english-part-0-variety-50",
  );
  ids.add("english-part-0");
  expect(
    achievementFamilies(ENGLISH_ACHIEVEMENTS, ids).find(
      (goal) => "family" in goal && goal.family === "english-part-0",
    )?.id,
  ).toBe("english-part-0");
});
