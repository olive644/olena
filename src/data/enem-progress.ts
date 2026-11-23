import { answerRows } from "./enem-answer-rows";
import { enemSections, type EnemSection } from "./enem-sections";
import type { EnemLanguage } from "./enem-tri";

export type Attempt = {
  language?: EnemLanguage;
  submittedAt?: string;
  section: string;
  seconds: number;
  instructions: boolean;
  answers: Record<string, string>;
  essayText?: string;
};

export type Progress = {
  saved?: boolean;
  opened?: boolean;
  completed?: boolean;
  variant?: string;
  page?: number;
  answerPage?: number;
  bookmarks?: number[];
  /** Last active attempt, retained for existing saved histories. */
  attempt?: Attempt;
  attempts?: Record<string, Attempt>;
};

export function sectionAttempt(
  progress: Progress | undefined,
  sectionId: string,
): Attempt | undefined {
  const attempt = progress?.attempts?.[sectionId];
  if (attempt?.section === sectionId) return attempt;
  return progress?.attempt?.section === sectionId ? progress.attempt : undefined;
}

export function sectionProgress(section: EnemSection, attempt?: Attempt) {
  const current = attempt?.section === section.id ? attempt : undefined;
  const submitted = !!current?.submittedAt;
  // An essay has no fixed answer count: only submission completes its single unit.
  if (section.id === "essay")
    return { percent: submitted ? 100 : 0, submitted, answered: submitted ? 1 : 0, total: 1 };
  const rows = answerRows(section, current?.language ?? "english");
  const answered = rows.filter((row) =>
    /^[A-E]$/.test(current?.answers[`${section.id}:${row.key}`] ?? ""),
  ).length;
  // Objective progress measures valid answers, independently of submission or manual completion.
  return {
    percent: rows.length ? Math.round((answered / rows.length) * 100) : 0,
    submitted,
    answered,
    total: rows.length,
  };
}

export function paperProgress(year: number, day: number, progress?: Progress) {
  const sections = enemSections(year, day).map((section) => ({
    section,
    ...sectionProgress(section, sectionAttempt(progress, section.id)),
  }));
  return {
    // Each area contributes equally; the essay is one area rather than one objective question.
    percent: sections.length
      ? Math.round(sections.reduce((sum, item) => sum + item.percent, 0) / sections.length)
      : 0,
    sections,
  };
}
