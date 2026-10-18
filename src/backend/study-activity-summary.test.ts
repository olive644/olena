import { expect, it } from "vitest";
import { studyActivitySummary } from "./study-activity-summary";
it("publica somente resumos recentes válidos sem conteúdo privado", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const records = [
    { id: "one", completedAt: "2026-10-18T11:00:00Z", answers: 3, title: "segredo" },
    { id: "old", completedAt: "2026-10-01", answers: 4 },
    { id: "future", completedAt: "2027-01-01", answers: 4 },
  ];
  const result = studyActivitySummary(
    JSON.stringify({ practiceActivities: records, notes: ["segredo"] }),
    now,
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ kind: "practice", value: 3 });
  expect(result[0]?.id).toMatch(/^[a-f0-9]{32}$/);
  expect(JSON.stringify(result)).not.toContain("segredo");
  expect(studyActivitySummary("{", now)).toEqual([]);
});
