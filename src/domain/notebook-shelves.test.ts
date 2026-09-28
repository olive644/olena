import { expect, it } from "vitest";
import { notebookShelves } from "./notebook-shelves";
import type { StudyNotebook } from "./workspace";

it("distribui pastas, Notes e cadernos sem passar de quatro objetos nem perder itens antigos", () => {
  const items: StudyNotebook[] = Array.from({ length: 12 }, (_, index) => ({
    id: String(index),
    title: `Item ${index}`,
    subjectId: "",
    pageIds: [],
    createdAt: "2026-09-28",
    ...(index < 4
      ? { kind: "collection" as const, shelf: 0 }
      : index % 2
        ? { kind: "note" as const }
        : {}),
  }));
  items.push({ ...items[4]!, id: "stored", parentId: "0" });
  const shelves = notebookShelves(items);
  expect(shelves.flat()).toHaveLength(12);
  expect(new Set(shelves.flat().map((item) => item.id)).size).toBe(12);
  for (const shelf of shelves) {
    expect(shelf.length).toBeLessThanOrEqual(4);
    expect(shelf.filter((item) => item.kind === "collection").length).toBeLessThanOrEqual(3);
  }
});
