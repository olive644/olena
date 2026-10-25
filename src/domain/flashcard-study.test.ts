import { describe, expect, it } from "vitest";
import { flashcardsTsv, parseFlashcardsTsv, reviewQueue, reviewSchedule } from "./flashcard-study";
import {
  createInitialWorkspace,
  workspaceReducer,
  dueFlashcards,
  type Flashcard,
} from "./workspace";
import { isWorkspaceState } from "../data/local-workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";

const card: Flashcard = {
  id: "a",
  subjectId: "math",
  front: "2+2",
  back: "4",
  intervalDays: 0,
  nextReview: "2026-10-25",
};
describe("flashcard study", () => {
  it("preserves old cards, grows successful intervals and resets failures to one day", () => {
    let current = card;
    for (let i = 0; i < 12; i++) {
      const next = reviewSchedule(current, "easy");
      expect(next.intervalDays).toBeGreaterThanOrEqual(current.intervalDays);
      expect(next.ease).toBeLessThanOrEqual(3.5);
      current = { ...current, ...next };
    }
    expect(reviewSchedule(current, "again")).toMatchObject({
      intervalDays: 1,
      repetitions: 0,
      lapses: 1,
    });
    expect(reviewSchedule(card, "easy").intervalDays).toBe(3);
  });
  it("limits only new cards and counts first reviews across decks", () => {
    const cards = [
      card,
      { ...card, id: "b" },
      { ...card, id: "c", reviews: 2 },
      { ...card, id: "d", firstReviewedOn: "2026-10-25", nextReview: "2026-10-28" },
    ];
    expect(reviewQueue(cards, "2026-10-25", 2).map((item) => item.id)).toEqual(["a", "c"]);
    expect(reviewQueue(cards, "2026-10-25", 0).map((item) => item.id)).toEqual(["c"]);
    const workspace = createInitialWorkspace();
    expect(
      dueFlashcards(
        {
          ...workspace,
          flashcards: cards,
          studyPreferences: { ...workspace.studyPreferences, flashcardNewLimit: 0 },
        },
        "2026-10-25",
      ).map((item) => item.id),
    ).toEqual(["c"]);
  });
  it("does not count previously studied legacy cards as new on upgrade", () => {
    const state = { ...createInitialWorkspace(), flashcards: [{ ...card, intervalDays: 9 }] };
    const next = workspaceReducer(state, {
      type: "flashcard/reviewed",
      id: card.id,
      rating: "easy",
      reviewedOn: "2026-10-25",
    });
    expect(next.flashcards[0]?.firstReviewedOn).toBeUndefined();
    expect(next.flashcards[0]?.reviews).toBe(1);
  });
  it("round-trips quoted TSV without executing HTML or losing tabs and line breaks", () => {
    const source = [
      { ...card, front: 'a\tb "quoted"\nline', back: "<script>literal</script>", deck: "ENEM" },
    ];
    expect(parseFlashcardsTsv(flashcardsTsv(source))).toEqual([
      { front: source[0]!.front, back: source[0]!.back, deck: "ENEM" },
    ]);
    expect(() => parseFlashcardsTsv('"unfinished\tanswer')).toThrow();
    expect(() => parseFlashcardsTsv("front\t")).toThrow();
  });
  it("edits content without resetting schedule and imports idempotently", () => {
    const initial = { ...createInitialWorkspace(), flashcards: [{ ...card, intervalDays: 9 }] };
    const edited = workspaceReducer(initial, {
      type: "flashcard/updated",
      id: "a",
      changes: { front: "new", back: "answer", subjectId: "math", deck: "Algebra" },
    });
    expect(edited.flashcards[0]?.intervalDays).toBe(9);
    const action = {
      type: "flashcards/imported" as const,
      subjectId: "math",
      createdOn: "2026-10-25",
      cards: [{ front: "x", back: "y", deck: "" }],
    };
    expect(workspaceReducer(workspaceReducer(edited, action), action).flashcards).toHaveLength(2);
    expect(isWorkspaceState(edited)).toBe(true);
    expect(workspaceReducer(edited, { type: "flashcard/removed", id: "a" }).flashcards).toEqual([]);
  });
  it("keeps collections and links through account reconciliation", () => {
    const base = createInitialWorkspace();
    const local = {
      ...base,
      libraryCollections: [{ id: "c", title: "Exam", motif: "book" as const }],
    };
    expect(mergeWorkspaceStates(base, local, base).workspace.libraryCollections).toEqual(
      local.libraryCollections,
    );
  });
  it("links materials without duplicating or losing existing note content", () => {
    let state = createInitialWorkspace();
    state = {
      ...state,
      materials: [
        {
          id: "m",
          title: "Source",
          kind: "text",
          content: "Data",
          subjectId: "math",
          createdAt: "2026-10-25",
        },
      ],
      notes: [
        {
          id: "n",
          title: "Note",
          content: "Keep",
          subjectId: "math",
          updatedAt: "2026-10-25",
          assets: [],
        },
      ],
    };
    const action = {
      type: "library/linked" as const,
      kind: "note" as const,
      id: "n",
      materialId: "m",
    };
    state = workspaceReducer(workspaceReducer(state, action), action);
    expect(state.notes[0]).toMatchObject({ content: "Keep", materialIds: ["m"] });
    expect(isWorkspaceState(state)).toBe(true);
    state = workspaceReducer(state, { ...action, remove: true });
    expect(state.notes[0]?.materialIds).toEqual([]);
  });
});
