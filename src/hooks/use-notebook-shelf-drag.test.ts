import { act, renderHook } from "@testing-library/react";
import type { PointerEvent } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { StudyNotebook } from "../domain/workspace";
import { useNotebookShelfDrag } from "./use-notebook-shelf-drag";

const originalHitTest = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
afterEach(() => {
  if (originalHitTest) Object.defineProperty(document, "elementFromPoint", originalHitTest);
  else Reflect.deleteProperty(document, "elementFromPoint");
});
const book = (id: string, parentId?: string): StudyNotebook => ({
  id,
  title: id,
  subjectId: "",
  createdAt: "2026-09-27",
  pageIds: [],
  ...(parentId ? { parentId } : {}),
});
function pointer(x: number, pointerType: string) {
  const target = document.createElement("button");
  target.setPointerCapture = vi.fn();
  return {
    button: 0,
    pointerId: 3,
    clientX: x,
    clientY: 100,
    pointerType,
    currentTarget: target,
  } as unknown as PointerEvent<HTMLButtonElement>;
}
function hit(element: Element | null) {
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => element });
}

it.each(["mouse", "pen", "touch"])("guarda por %s e impede que soltar abra o caderno", (kind) => {
  const target = document.createElement("div");
  target.dataset["folderDrop"] = "folder";
  hit(target);
  const store = vi.fn();
  const { result } = renderHook(() =>
    useNotebookShelfDrag([book("one"), { ...book("folder"), kind: "collection" }], store),
  );
  act(() => result.current.handlers("one").onPointerDown(pointer(10, kind)));
  act(() => result.current.handlers("one").onPointerMove(pointer(60, kind)));
  expect(result.current.targetId).toBe("folder");
  act(() => result.current.handlers("one").onPointerUp(pointer(60, kind)));
  expect(store).toHaveBeenCalledWith("one", "folder");
  expect(result.current.consumeClick("one")).toBe(true);
  expect(result.current.consumeClick("one")).toBe(false);
});

it("retira na vitrine, cancela fora dela e recusa pasta cheia", () => {
  const store = vi.fn();
  const items = [book("one", "old"), book("a", "full"), book("b", "full"), book("c", "full")];
  const { result } = renderHook(() => useNotebookShelfDrag(items, store));
  function dragTo(element: Element | null) {
    hit(element);
    act(() => result.current.handlers("one").onPointerDown(pointer(10, "touch")));
    act(() => result.current.handlers("one").onPointerMove(pointer(60, "touch")));
    act(() => result.current.handlers("one").onPointerUp(pointer(60, "touch")));
  }
  dragTo(null);
  expect(store).not.toHaveBeenCalled();
  const full = document.createElement("div");
  full.dataset["folderDrop"] = "full";
  dragTo(full);
  expect(store).not.toHaveBeenCalled();
  expect(result.current.message).toContain("três cadernos");
  const shelf = document.createElement("section");
  shelf.className = "notebooks-showcase";
  dragTo(shelf);
  expect(store).toHaveBeenCalledExactlyOnceWith("one", null);
});
