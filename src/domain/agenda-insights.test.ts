import { expect, it } from "vitest";
import { mathAnswerSequence, pomodoroWeek } from "./agenda-insights";

it("shows only real Pomodoro completions inside the selected dates and week", () => {
  const week = pomodoroWeek(
    ["2026-10-05", "2026-10-06", "2026-10-06", "2026-10-08", "2026-02-30", 4],
    { start: "2026-10-06", end: "2026-10-08" },
  );
  expect(week.filter((day) => day.active).map((day) => day.key)).toEqual([
    "2026-10-06",
    "2026-10-08",
  ]);
  expect(week[0]?.key).toBe("2026-10-05");
  expect(
    pomodoroWeek({}, { start: "2026-10-06", end: "2026-10-08" }).some((day) => day.active),
  ).toBe(false);
});

it("counts consecutive correct answers per round, not days, and resets after errors", () => {
  const activities = [1, 1, 0, 1, 1, 1].map((correct, index) => ({
    id: `math:foundations:round:${index}`,
    islandId: "mathematics:foundations",
    islandName: "Matemática",
    completedAt: `2026-10-06T12:00:0${index}`,
    answers: 1,
    correct,
  }));
  activities.push({ ...activities[0]!, id: "math:foundations:other:0" });
  expect(mathAnswerSequence(activities, { start: "2026-10-06", end: "2026-10-06" })).toBe(3);
  expect(mathAnswerSequence(activities, { start: "2026-10-07", end: "2026-10-07" })).toBe(0);
});
