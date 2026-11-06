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

it("publica prática e confirmações das oito partes de Inglês sem misturar Matemática ou duplicar recibos", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  const records = [];
  for (const part of [0, 1, 2, 3, 6, 4, 7, 5]) {
    for (let question = 0; question < 100; question++)
      records.push({
        id: `english:arcade:p${part}:${question}`,
        islandId: "english",
        islandName: "segredo",
        completedAt: new Date(now - 3600000 + records.length * 1000).toISOString(),
        answers: 1,
        correct: 1,
        englishAttempt: {
          curriculum: 4,
          area: "english",
          part,
          mode: "practice",
          questions: [question],
          correctQuestions: [question],
        },
      });
    records.push({
      id: `english:arcade:final${part}`,
      islandId: "english",
      islandName: "segredo",
      completedAt: new Date(now - 3600000 + records.length * 1000).toISOString(),
      answers: 5,
      correct: 5,
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
  const summary = studyActivitySummary(
    JSON.stringify({
      practiceActivities: [
        ...records,
        ...records,
        {
          id: "math",
          islandId: "mathematics:foundations",
          completedAt: new Date(now - 1000).toISOString(),
          answers: 12,
        },
      ],
    }),
    now,
  );
  expect(
    summary
      .filter((item) => item.kind === "module")
      .map((item) => item.level)
      .sort(),
  ).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(summary.find((item) => item.kind === "practice" && item.course === "english")?.value).toBe(
    840,
  );
  expect(summary.find((item) => item.course === "foundations")?.value).toBe(12);
  expect(JSON.stringify(summary)).not.toContain("segredo");
});
it("não inventa avanço por confirmação inglesa inválida, sem domínio ou no futuro", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  const final = {
    id: "final",
    islandId: "english",
    completedAt: new Date(now - 1000).toISOString(),
    answers: 5,
    correct: 5,
    englishAttempt: {
      curriculum: 4,
      area: "english",
      part: 0,
      mode: "final",
      questions: [0, 1, 2, 3, 4],
      correctQuestions: [0, 1, 2, 3, 4],
    },
  };
  expect(
    studyActivitySummary(
      JSON.stringify({
        practiceActivities: [
          final,
          { ...final, id: "future", completedAt: new Date(now + 1000).toISOString() },
          { ...final, id: "forged", answers: 99 },
        ],
      }),
      now,
    ),
  ).toEqual([]);
});
it("mantém o mínimo de dez respostas diárias e o mesmo ID ao acumular prática inglesa", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  const records = Array.from({ length: 20 }, (_, index) => ({
    id: `english:arcade:r:${index}`,
    islandId: "english",
    completedAt: new Date(now - 60000 + index * 1000).toISOString(),
    answers: 1,
    correct: 1,
    languageAttempt: {
      curriculum: 4,
      area: "english",
      part: 0,
      mode: "practice",
      questions: [index],
      correctQuestions: [index],
    },
  }));
  const summary = (count: number) =>
    studyActivitySummary(JSON.stringify({ practiceActivities: records.slice(0, count) }), now);
  expect(summary(9)).toEqual([]);
  expect(summary(10)[0]).toMatchObject({ kind: "practice", course: "english", value: 10 });
  expect(summary(20)[0]).toMatchObject({ id: summary(10)[0]!.id, value: 20 });
});
