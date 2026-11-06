// Scene IDs are append-only. A family groups contexts that exercise the same rule.
const WELCOME_SKILLS = [
  [0, 1, 2, 5, 7, 18],
  [6, 8, 9, 10, 11, 12, 13, 14, 15],
  [3, 4, 20, 25, 26],
  [16, 17, 19, 21, 24],
  [22, 23],
  [27, 28, 29],
] as const;
const SENSE_SKILLS = [
  [0, 1, 2, 3, 4, 5],
  [6, 12, 20, 21, 22, 23, 24, 25],
  [7, 9, 10, 28, 29],
  [8, 13, 14, 15, 16, 18, 19],
  [11, 17, 26, 27],
] as const;
const HABIT_SKILLS = [
  [13, 14, 15, 33, 38, 39, 41], // Questions with do or does and the base verb.
  [11, 12, 40], // Negation with don't or doesn't.
  [16, 17, 18, 19, 28, 34, 35, 37, 42], // Frequency.
  [22, 23, 24, 25, 36, 43], // Actions in progress and contrasts with habits.
  [1, 2, 4, 6, 20, 21, 31], // Clock times and schedules.
  [5, 26, 27, 30], // Sequence with before or after.
  [0, 3, 7, 8, 9, 10, 29, 32], // Routine statements.
] as const;

const MEMORY_SKILLS = [
  [0, 4, 6, 7, 8, 9, 29, 30, 38], // Regular past and completed actions.
  [1, 10, 11, 12, 13, 28, 31, 41], // Irregular past in statements.
  [2, 14, 15, 33, 40], // Negatives with didn't.
  [3, 16, 17, 32, 39], // Questions with did.
  [5, 18, 19, 20, 21, 35], // Was and were.
  [22, 23, 24, 36, 42], // Past actions in progress.
  [25, 26, 27, 34], // Ordering events.
  [37, 43], // Past perfect for the earlier event.
] as const;

const PLAN_SKILLS = [
  [0, 2, 10, 11, 12, 30], // Intentions with going to.
  [1, 5, 6, 8, 9, 27, 31, 42], // Decisions, offers and commitments with will.
  [3, 7, 34], // Predictions based on opinion.
  [13, 35], // Predictions based on evidence.
  [14, 28, 32], // Arrangements with the present continuous.
  [15, 33], // Timetables with the present simple.
  [4, 16, 17, 18, 19, 36, 37], // Invitations and suggestions.
  [20, 38], // Advice with should.
  [21], // Obligation with must.
  [22, 39], // Absence of obligation.
  [23, 24, 40], // Future consequences with if.
  [25, 26, 41], // Uncertain plans.
  [29, 43], // Completion by a future deadline.
] as const;

const IDEA_SKILLS = [
  [3, 8, 30], // Stating a position.
  [6, 31], // Agreement.
  [0, 2, 7, 12, 15, 32], // Acknowledgment and contrast.
  [9, 10, 18, 33], // Giving a reason.
  [11, 22, 34], // Concession with a clause.
  [13, 35], // Giving an example.
  [16, 36], // Asking for clarification.
  [17, 37], // Asking for evidence.
  [14, 19, 38], // Connecting results and conditions.
  [20, 21, 24, 39], // Comparing multiple options.
  [23, 40], // Concession before a noun phrase.
  [25, 41], // Stating a preference.
  [4, 42], // Questioning an inference.
  [1, 5, 28, 43], // Weighing arguments and concluding.
  [26, 27, 29], // Advice and collaborative proposals.
] as const;

const MARKET_SKILLS = [
  [0, 2, 3, 7, 17],
  [1, 5, 15, 16],
  [4, 12, 13, 14],
  [8, 9, 10, 18, 19],
  [11, 20, 21, 22, 23, 24],
  [6],
] as const;
const ARCHIVE_SKILLS = [
  [0, 1, 2, 3, 20, 22],
  [4, 6, 10],
  [5, 7, 8, 9, 19],
  [11, 12, 13, 14, 15, 16],
  [17, 18, 21, 23, 24],
] as const;

export function englishSkill(part: number, scene: number) {
  const families =
    part === 0
      ? WELCOME_SKILLS
      : part === 5
        ? SENSE_SKILLS
        : part === 6
          ? MARKET_SKILLS
          : part === 7
            ? ARCHIVE_SKILLS
            : part === 1
              ? HABIT_SKILLS
              : part === 2
                ? MEMORY_SKILLS
                : part === 3
                  ? PLAN_SKILLS
                  : IDEA_SKILLS;
  return families.findIndex((family) => family.some((member) => member === scene));
}

export function englishContext(part: number, scene: number) {
  // Near-duplicate legacy prompts retain their IDs and share a context.
  if (part === 2 && scene === 6) return 0;
  if (part === 3 && scene === 8) return 5;
  return scene;
}

/** A format is practice evidence, not four independent situations. */
export function englishSkillCoverage(part: number, solved: Iterable<number>) {
  const contexts = new Map<number, Set<number>>();
  for (const id of solved) {
    const scene = Math.floor(id / 4);
    const skill = englishSkill(part, scene);
    if (skill < 0) continue;
    const group = contexts.get(skill) ?? new Set<number>();
    group.add(englishContext(part, scene));
    contexts.set(skill, group);
  }
  return contexts;
}
