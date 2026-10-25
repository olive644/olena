import { describe, expect, it } from "vitest";
import { filterMaterials, safeMaterialUrl, validLibraryMetadata } from "./library";
import { createInitialWorkspace, workspaceReducer, type StudyMaterial } from "./workspace";
import { isWorkspaceState, loadWorkspace, saveWorkspace } from "../data/local-workspace";

const item: StudyMaterial = {
  id: "algebra",
  title: "Álgebra",
  subjectId: "math",
  kind: "text",
  content: "Equações",
  createdAt: "2026-10-24",
  tags: ["ENEM"],
  favorite: true,
  collectionId: "exam",
};
const options = {
  query: "",
  subject: "",
  kind: "",
  collection: "",
  archived: false,
  favorites: false,
  sort: "recent",
};
describe("library", () => {
  it("searches accents, content and tags without changing the original array", () => {
    const materials = [item, { ...item, id: "old", archived: true }];
    expect(
      filterMaterials(materials, {
        ...options,
        query: "algebra",
        subject: "math",
        kind: "text",
        collection: "exam",
        favorites: true,
      }),
    ).toEqual([item]);
    expect(filterMaterials(materials, { ...options, query: "enem" })).toEqual([item]);
    expect(filterMaterials(materials, { ...options, query: "equacoes" })).toEqual([item]);
    expect(filterMaterials(materials, { ...options, archived: true })).toHaveLength(1);
    expect(materials).toHaveLength(2);
  });
  it("never opens executable links", () => {
    for (const value of ["javascript:alert(1)", "data:text/html,x", "file:///secret", "bad"])
      expect(safeMaterialUrl(value)).toBeNull();
    expect(safeMaterialUrl("https://example.org")).toBe("https://example.org/");
  });
  it("preserves old workspaces and round trips all new metadata", () => {
    let state = createInitialWorkspace();
    expect(isWorkspaceState(state)).toBe(true);
    state = workspaceReducer(state, {
      type: "library/collection-saved",
      collection: { id: "exam", title: "ENEM", motif: "moon" },
    });
    state = workspaceReducer(state, { type: "material/added", ...item });
    state = workspaceReducer(state, {
      type: "material/updated",
      id: item.id,
      changes: {
        favorite: true,
        page: 2,
        bookmarks: [2],
        scroll: 400,
        annotations: [{ id: "quote", page: 2, quote: "x+y", note: "Revisar" }],
      },
    });
    saveWorkspace(localStorage, state);
    expect(loadWorkspace(localStorage)).toEqual(state);
    state = workspaceReducer(state, { type: "library/collection-removed", id: "exam" });
    expect(state.materials).toHaveLength(1);
    expect(state.materials[0]?.collectionId).toBeUndefined();
    expect(state.libraryCollections).toEqual([]);
  });
  it("rejects malformed metadata instead of trusting imported values", () => {
    for (const value of [
      { page: -1 },
      { scroll: Infinity },
      { bookmarks: [0] },
      { favorite: "yes" },
      { tags: [4] },
      { annotations: [{ id: "x", page: 1, quote: {}, note: "" }] },
    ])
      expect(validLibraryMetadata(value)).toBe(false);
    expect(validLibraryMetadata({})).toBe(true);
    expect(
      validLibraryMetadata({
        annotations: Array.from({ length: 501 }, (_, index) => ({
          id: String(index),
          page: 1,
          quote: "trecho",
          note: "nota",
        })),
      }),
    ).toBe(true);
    expect(
      isWorkspaceState({
        ...createInitialWorkspace(),
        libraryCollections: [{ id: "x", title: "X", motif: "unknown" }],
      }),
    ).toBe(false);
  });
  it("links reviews and focus history to their source without changing scheduling", () => {
    let state = workspaceReducer(createInitialWorkspace(), {
      type: "flashcard/added",
      front: "x",
      back: "y",
      subjectId: "math",
      createdOn: "2026-10-24",
      materialId: item.id,
      sourcePage: 2,
    });
    const id = state.flashcards[0]!.id;
    state = workspaceReducer(state, {
      type: "flashcard/reviewed",
      id,
      rating: "easy",
      reviewedOn: "2026-10-24",
    });
    expect(state.flashcards[0]).toMatchObject({
      nextReview: "2026-10-27",
      materialId: item.id,
      sourcePage: 2,
    });
    state = workspaceReducer(state, {
      type: "focus/recorded",
      subjectId: "math",
      materialId: item.id,
      durationMinutes: 25,
      completedAt: "2026-10-24",
      mode: "pomodoro",
    });
    expect(state.focusSessions.at(-1)?.materialId).toBe(item.id);
  });
});
