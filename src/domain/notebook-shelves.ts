import type { StudyNotebook } from "./workspace";

export const SHELF_CAPACITY = 4;
export const SHELF_FOLDER_CAPACITY = 3;

// A mesma distribuição vale para dados antigos, criação e retirada de uma pasta.
export function notebookShelves(notebooks: StudyNotebook[]): StudyNotebook[][] {
  const shelves: StudyNotebook[][] = [[]];
  for (const folder of notebooks.filter((item) => item.kind === "collection" && !item.parentId)) {
    let index = Math.max(0, Math.floor(folder.shelf ?? 0));
    while (shelves.length <= index) shelves.push([]);
    while (shelves[index]!.length >= SHELF_FOLDER_CAPACITY) {
      index++;
      if (!shelves[index]) shelves.push([]);
    }
    shelves[index]!.push(folder);
  }
  for (const item of notebooks.filter((entry) => !entry.parentId && entry.kind !== "collection")) {
    let shelf = shelves.find((items) => items.length < SHELF_CAPACITY);
    if (!shelf) {
      shelf = [];
      shelves.push(shelf);
    }
    shelf.push(item);
  }
  return shelves;
}
