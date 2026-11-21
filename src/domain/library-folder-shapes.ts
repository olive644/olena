export const LIBRARY_FOLDER_SHAPES = [
  "tabbed",
  "pocket",
  "envelope",
  "accordion",
  "folio",
  "angled",
] as const;
export type LibraryFolderShape = (typeof LIBRARY_FOLDER_SHAPES)[number];
/** Existing explicit silhouettes win; legacy folders receive a stable, unused silhouette. */
export function libraryFolderShapes(
  folders: readonly { id: string; shape?: LibraryFolderShape | undefined }[],
) {
  const result = new Map<string, LibraryFolderShape>();
  const used = new Set<LibraryFolderShape>();
  const ordered = [...folders].sort((a, b) => a.id.localeCompare(b.id));
  for (const folder of ordered)
    if (folder.shape && !used.has(folder.shape)) {
      result.set(folder.id, folder.shape);
      used.add(folder.shape);
    }
  for (const folder of ordered) {
    if (result.has(folder.id)) continue;
    const hash = [...folder.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
    const options = LIBRARY_FOLDER_SHAPES.filter((shape) => !used.has(shape));
    const shape =
      options[hash % options.length] ?? LIBRARY_FOLDER_SHAPES[hash % LIBRARY_FOLDER_SHAPES.length]!;
    result.set(folder.id, shape);
    used.add(shape);
  }
  return result;
}
