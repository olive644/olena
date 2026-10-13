import { expect, it } from "vitest";
import { durationFromDial } from "./agenda-duration";
it("carries minutes/hours across the dial seam and preserves event limits", () => {
  expect(durationFromDial(59, "minutes", 0, 180)).toBe(60);
  expect(durationFromDial(60, "minutes", 59, 180)).toBe(59);
  expect(durationFromDial(11 * 60, "hours", 0, 1440)).toBe(720);
  expect(durationFromDial(25, "hours", 1, 180)).toBe(85);
  expect(durationFromDial(179, "minutes", 0, 180)).toBe(180);
  expect(durationFromDial(1, "minutes", 0, 180)).toBe(1);
});
