import { expect, it } from "vitest";
import { studyActivitySummary } from "./study-activity-summary";
it("publica somente resumos recentes válidos sem conteúdo privado", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const records = [
    {
      id: "one",
      completedAt: "2026-10-18T11:00:00Z",
      answers: 12,
      title: "segredo",
      islandId: "mathematics:foundations",
    },
    { id: "old", completedAt: "2026-10-01", answers: 4 },
    { id: "future", completedAt: "2027-01-01", answers: 4 },
  ];
  const result = studyActivitySummary(
    JSON.stringify({ practiceActivities: records, notes: ["segredo"] }),
    now,
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ kind: "practice", value: 12 });
  expect(result[0]?.id).toMatch(/^[a-f0-9]{32}$/);
  expect(JSON.stringify(result)).not.toContain("segredo");
  expect(studyActivitySummary("{", now)).toEqual([]);
});
it("agrega respostas em uma conquista estável e reconhece módulo oficial", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const records = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    answers: 1,
    correct: 1,
    islandId: "mathematics:foundations",
    completedAt: new Date(now - (20 - i) * 1000).toISOString(),
  }));
  const summary = (items: unknown[]) =>
    studyActivitySummary(JSON.stringify({ practiceActivities: items }), now);
  expect(summary(records.slice(0, 1))).toEqual([]);
  const first = summary(records.slice(0, 10));
  const next = summary(records);
  expect(first[0]?.id).toBe(next[0]?.id);
  expect(next).toHaveLength(1);
  expect(next[0]?.value).toBe(20);
  const module = summary([{ ...records[0], moduleLevel: 0 }]);
  expect(module).toHaveLength(1);
  expect(module[0]).toMatchObject({ kind: "module", course: "foundations", level: 0 });
  expect(summary([{ ...records[0], moduleLevel: 99 }])).toEqual([]);
  expect(summary([{ ...records[0], moduleLevel: 0, islandId: "segredo" }])).toEqual([]);
});
