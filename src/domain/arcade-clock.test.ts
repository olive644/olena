import { expect, it, vi } from "vitest";
import {
  arcadeQuestionTiming,
  arcadeElapsed,
  arcadeReserve,
  ARCADE_LIVES,
  ARCADE_RESERVE,
  ARCADE_COUNTDOWN,
} from "./arcade-clock";
it("keeps the exact existing mathematics lives, countdown, question budget and reserve rules", () => {
  expect([ARCADE_LIVES, ARCADE_RESERVE, ARCADE_COUNTDOWN]).toEqual([3, 60, 3]);
  expect(arcadeQuestionTiming(24, 1)).toEqual({ budget: 30, drain: 1 });
  expect(arcadeQuestionTiming(24, 3)).toEqual({ budget: 38, drain: 1 });
  expect(arcadeReserve(55, true, false, false)).toBe(57);
  expect(arcadeReserve(55, true, false, true)).toBe(58);
  expect(arcadeReserve(89, true, false, true)).toBe(90);
  expect(arcadeReserve(55, false, false, false)).toBe(55);
  expect(arcadeReserve(55, false, true, false)).toBe(51);
  expect(arcadeReserve(3, false, true, false)).toBe(60);
  expect(arcadeReserve(0, false, true, false)).toBe(60);
  expect(arcadeReserve(55, true, false, true, true)).toBe(60);
});

it("counts hidden-tab wall time and resists a backwards system clock", () => {
  const monotonic = vi.spyOn(performance, "now").mockReturnValue(3000);
  const wall = vi.spyOn(Date, "now").mockReturnValue(15000);
  try {
    const start = { elapsed: 2, at: 1000, wallAt: 10000 };
    expect(arcadeElapsed(start)).toBe(7);
    wall.mockReturnValue(9000);
    expect(arcadeElapsed(start)).toBe(4);
    monotonic.mockReturnValue(500);
    expect(arcadeElapsed(start)).toBe(2);
  } finally {
    monotonic.mockRestore();
    wall.mockRestore();
  }
});
