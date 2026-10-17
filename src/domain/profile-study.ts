import type { WorkspaceState } from "./workspace";

export function profileLevel(points: number) {
  const xp = Number.isSafeInteger(points) && points >= 0 ? points : 0;
  let completed = Math.max(0, Math.floor((Math.sqrt(9 + (8 * xp) / 250) - 3) / 2));
  const threshold = (count: number) => (250 * count * (count + 3)) / 2;
  while (threshold(completed + 1) <= xp) completed++;
  while (threshold(completed) > xp) completed--;
  return {
    xp,
    level: completed + 1,
    current: xp - threshold(completed),
    next: 500 + completed * 250,
  };
}

export function profileNotebook(workspace: WorkspaceState) {
  const books = workspace.notebooks.filter(
    (book) => book.kind !== "folder" && book.kind !== "collection",
  );
  const pages = (ids: string[]) => workspace.notes.filter((page) => ids.includes(page.id));
  const recent = (ids: string[]) =>
    Math.max(0, ...pages(ids).map((page) => Date.parse(page.updatedAt) || 0));
  const notebook = [...books].sort(
    (a, b) =>
      pages(b.pageIds).length - pages(a.pageIds).length ||
      recent(b.pageIds) - recent(a.pageIds) ||
      a.id.localeCompare(b.id),
  )[0];
  if (!notebook) return undefined;
  const entries = pages(notebook.pageIds).sort(
    (a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0),
  );
  const trail: string[] = [];
  const seen = new Set([notebook.id]);
  let parent = notebook.parentId;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const folder = workspace.notebooks.find((item) => item.id === parent);
    if (!folder) break;
    trail.unshift(folder.title);
    parent = folder.parentId;
  }
  return { notebook, page: entries[0], count: entries.length, trail };
}
