import type { HandwritingDocument } from "./handwriting";

function mergeItems<T extends { id: string }>(
  base: readonly T[],
  local: readonly T[],
  remote: readonly T[],
): T[] {
  const before = new Map(base.map((item) => [item.id, item]));
  const ours = new Map(local.map((item) => [item.id, item]));
  const result = new Map(remote.map((item) => [item.id, item]));
  for (const id of before.keys()) if (!ours.has(id)) result.delete(id);
  for (const item of local) {
    if (JSON.stringify(item) !== JSON.stringify(before.get(item.id))) result.set(item.id, item);
  }
  return [...result.values()];
}

/** Merge changes relative to the sender's last acknowledged snapshot. */
export function mergeHandwriting(
  base: HandwritingDocument,
  local: HandwritingDocument,
  remote: HandwritingDocument,
): HandwritingDocument {
  const changed = Object.fromEntries(
    Object.entries(local).filter(
      ([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(base[key as keyof HandwritingDocument]),
    ),
  );
  return {
    ...remote,
    ...changed,
    strokes: mergeItems(base.strokes, local.strokes, remote.strokes),
    stickies: mergeItems(base.stickies ?? [], local.stickies ?? [], remote.stickies ?? []),
    coordinateSystems: mergeItems(
      base.coordinateSystems ?? [],
      local.coordinateSystems ?? [],
      remote.coordinateSystems ?? [],
    ),
    images: mergeItems(base.images ?? [], local.images ?? [], remote.images ?? []),
  };
}
