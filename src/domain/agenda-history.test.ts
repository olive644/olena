import { describe, expect, it } from "vitest";
import { focusHistory, historySummary, orderedRange } from "./agenda-history";
import { toDateKey, type FocusSession } from "./workspace";

function session(id: string, date: string, durationMinutes = 25): FocusSession {
  return { id, subjectId: "math", completedAt: `${date}T12:00:00`, durationMinutes };
}
describe("agenda study history", () => {
  it("normalizes reverse ranges", () => {
    expect(orderedRange("2026-10-15", "2026-10-10")).toEqual({
      start: "2026-10-10",
      end: "2026-10-15",
    });
  });
  it("uses local completion dates, aggregates real minutes and ignores invalid records", () => {
    const timestamp = "2026-10-12T01:30:00Z";
    const history = focusHistory([
      session("a", "2026-10-11", 10),
      session("b", "2026-10-11", 20),
      { ...session("c", "2026-10-11"), completedAt: timestamp },
      session("zero", "2026-10-13", 0),
      session("negative", "2026-10-13", -1),
      { ...session("bad", "2026-10-13"), completedAt: "invalid" },
    ]);
    expect(history.get("2026-10-11")!.minutes).toBeGreaterThanOrEqual(30);
    expect(
      history.get(toDateKey(new Date(timestamp)))!.sessions.some((item) => item.id === "c"),
    ).toBe(true);
    expect(history.has("2026-10-13")).toBe(false);
  });
  it("counts consecutive recorded days across month boundaries, not planned events", () => {
    const history = focusHistory([
      session("a", "2026-09-30"),
      session("b", "2026-10-01"),
      session("c", "2026-10-02"),
      session("d", "2026-10-04"),
      session("e", "2026-10-04"),
    ]);
    expect(historySummary(history, orderedRange("2026-09-30", "2026-10-04"))).toEqual({
      minutes: 125,
      days: 4,
      longest: 3,
    });
    expect(historySummary(history, orderedRange("2026-10-03", "2026-10-03"))).toEqual({
      minutes: 0,
      days: 0,
      longest: 0,
    });
  });
});
