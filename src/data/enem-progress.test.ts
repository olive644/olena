import { expect, it } from "vitest";
import { answerRows } from "./enem-answer-rows";
import { paperProgress, sectionAttempt, sectionProgress, type Attempt } from "./enem-progress";
import { enemSections } from "./enem-sections";

const sections = enemSections(2024, 1);
const languages = sections[0]!;
const humanities = sections[1]!;
const essay = sections[2]!;
function attempt(section = "languages", answers: Record<string, string> = {}): Attempt {
  return { section, answers, seconds: 90, instructions: true };
}

it("resumes each saved area, preferring its entry while retaining legacy histories", () => {
  const legacy = { ...attempt(), language: "spanish" as const };
  const saved = { ...attempt(), seconds: 200 };
  const progress = {
    saved: true,
    attempt: legacy,
    attempts: { languages: saved, humanities: attempt("humanities") },
  };
  expect(sectionAttempt(progress, "languages")).toBe(saved);
  expect(sectionAttempt(progress, "humanities")).toBe(progress.attempts.humanities);
  expect(sectionAttempt({ attempt: legacy }, "languages")).toBe(legacy);
  expect(sectionAttempt(progress, "essay")).toBeUndefined();
  expect(sectionAttempt(undefined, "languages")).toBeUndefined();
  expect(
    sectionAttempt({ attempt: legacy, attempts: { languages: attempt("math") } }, "languages"),
  ).toBe(legacy);
});

it("counts only valid alternatives from the selected language and current area", () => {
  const saved = {
    ...attempt("languages", {
      "languages:spanish:1": "A",
      "languages:spanish:2": "E",
      "languages:english:1": "B",
      "languages:q:6": "C",
      "languages:q:7": "Z",
      "languages:q:8": "a",
      "languages:q:9": "AB",
      "humanities:q:46": "D",
      "languages:q:999": "A",
    }),
    language: "spanish" as const,
  };
  expect(sectionProgress(languages, saved)).toEqual({
    percent: 7,
    answered: 3,
    total: 45,
    submitted: false,
  });
  expect(sectionProgress(languages, { ...saved, language: "english" })).toMatchObject({
    answered: 2,
  });
  expect(sectionProgress(humanities, saved)).toMatchObject({ answered: 0 });
});

it("defaults legacy language to English and keeps partial submission distinct from filling answers", () => {
  const saved = {
    ...attempt("languages", { "languages:english:1": "A", "languages:spanish:2": "B" }),
    submittedAt: "2026-11-23T10:00:00Z",
  };
  expect(sectionProgress(languages, saved)).toEqual({
    percent: 2,
    answered: 1,
    total: 45,
    submitted: true,
  });
  const answers = Object.fromEntries(
    answerRows(languages, "english").map((row) => [`languages:${row.key}`, "A"]),
  );
  expect(sectionProgress(languages, attempt("languages", answers))).toEqual({
    percent: 100,
    answered: 45,
    total: 45,
    submitted: false,
  });
});

it("completes an essay only on submission, including submitted legacy records without text", () => {
  const draft = { ...attempt("essay"), essayText: "Meu rascunho" };
  expect(sectionProgress(essay, draft)).toEqual({
    percent: 0,
    answered: 0,
    total: 1,
    submitted: false,
  });
  expect(sectionProgress(essay, { ...attempt("essay"), submittedAt: "2026-11-23" })).toEqual({
    percent: 100,
    answered: 1,
    total: 1,
    submitted: true,
  });
});

it("averages areas equally, ignores manual completion, and preserves saved data", () => {
  const progress = {
    saved: true,
    completed: true,
    bookmarks: [3],
    attempts: { essay: { ...attempt("essay"), submittedAt: "2026-11-23" } },
  };
  const before = structuredClone(progress);
  const result = paperProgress(2024, 1, progress);
  expect(result.percent).toBe(33);
  expect(result.sections.map((item) => [item.section.id, item.percent])).toEqual([
    ["languages", 0],
    ["humanities", 0],
    ["essay", 100],
  ]);
  expect(paperProgress(2024, 1, { completed: true }).percent).toBe(0);
  expect(paperProgress(2024, 2).sections.map((item) => item.section.id)).toEqual([
    "nature",
    "math",
  ]);
  expect(progress).toEqual(before);
});

it("uses the older day layout and numbering when resuming a language attempt", () => {
  const progress = { attempt: attempt("languages", { "languages:english:91": "E" }) };
  const result = paperProgress(2010, 2, progress);
  expect(result.sections.map((item) => item.section.id)).toEqual(["languages", "math", "essay"]);
  expect(result.sections[0]).toMatchObject({ answered: 1, total: 45, percent: 2 });
});
