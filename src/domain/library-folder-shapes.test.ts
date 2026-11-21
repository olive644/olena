import { expect, it } from "vitest";
import { libraryFolderShapes, LIBRARY_FOLDER_SHAPES } from "./library-folder-shapes";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { loadWorkspace, saveWorkspace, isWorkspaceState } from "../data/local-workspace";
it("assigns distinct silhouettes to legacy folders independent of list order", () => {
  const folders = ["a", "b", "c"].map((id) => ({ id }));
  const shapes = libraryFolderShapes(folders);
  expect(new Set(shapes.values()).size).toBe(3);
  expect([...shapes]).toEqual([...libraryFolderShapes([...folders].reverse())]);
});
it("keeps saved shapes across edits, deletion, replacement and storage", () => {
  let state = createInitialWorkspace();
  for (const id of ["a", "b", "c"])
    state = workspaceReducer(state, {
      type: "library/collection-saved",
      collection: { id, title: id, motif: "book" },
    });
  const original = state.libraryCollections!;
  expect(new Set(original.map((f) => f.shape)).size).toBe(3);
  state = workspaceReducer(state, {
    type: "library/collection-saved",
    collection: { ...original[0]!, title: "Renamed", style: "pride" },
  });
  expect(state.libraryCollections!.find((f) => f.id === "a")!.shape).toBe(original[0]!.shape);
  const full = state;
  state = workspaceReducer(state, {
    type: "library/collection-saved",
    collection: { id: "four", title: "four", motif: "book" },
  });
  expect(state).toBe(full);
  state = workspaceReducer(state, { type: "library/collection-removed", id: "b" });
  state = workspaceReducer(state, {
    type: "library/collection-saved",
    collection: { id: "new", title: "New", motif: "book" },
  });
  expect(new Set(state.libraryCollections!.map((f) => f.shape)).size).toBe(3);
  expect(state.libraryCollections!.find((f) => f.id === "c")!.shape).toBe(original[2]!.shape);
  saveWorkspace(localStorage, state);
  expect(loadWorkspace(localStorage)).toEqual(state);
});
it("validates every silhouette and rejects arbitrary imported shapes", () => {
  for (const shape of LIBRARY_FOLDER_SHAPES)
    expect(
      isWorkspaceState({
        ...createInitialWorkspace(),
        libraryCollections: [{ id: "a", title: "A", motif: "book", shape }],
      }),
    ).toBe(true);
  expect(
    isWorkspaceState({
      ...createInitialWorkspace(),
      libraryCollections: [{ id: "a", title: "A", motif: "book", shape: "unknown" }],
    }),
  ).toBe(false);
});

it("permite três pastas e somente uma máquina independente", () => {
  let state = createInitialWorkspace();
  for (const id of ["a", "b", "c"])
    state = workspaceReducer(state, {
      type: "library/collection-saved",
      collection: { id, title: id, motif: "book" },
    });
  state = workspaceReducer(state, {
    type: "library/collection-saved",
    collection: { id: "machine", title: "Redação", motif: "book", kind: "typewriter" },
  });
  expect(state.libraryCollections).toHaveLength(4);
  const full = state;
  state = workspaceReducer(state, {
    type: "library/collection-saved",
    collection: { id: "machine2", title: "Outra", motif: "book", kind: "typewriter" },
  });
  expect(state).toBe(full);
  state = workspaceReducer(state, {
    type: "library/collection-saved",
    collection: { id: "folder4", title: "Outra", motif: "book" },
  });
  expect(state).toBe(full);
  saveWorkspace(localStorage, state);
  expect(loadWorkspace(localStorage)).toEqual(state);
});
