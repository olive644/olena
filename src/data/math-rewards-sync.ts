import {
  chestCards,
  parseMathRewards,
  type MathChest,
  type MathPlaceRewards,
} from "./math-place-rewards";

/** Receipts identify rounds across devices; chest deadlines and reveals only advance. */
export function mergeMathRewards(baseRaw: string | undefined, localRaw: string, remoteRaw: string) {
  const base = parseMathRewards(baseRaw ?? "{}");
  const local = parseMathRewards(localRaw);
  const remote = parseMathRewards(remoteRaw);
  let conflict = false;
  // Invalid snapshots must be backed up by the caller, never silently replaced with empty data.
  for (const raw of [baseRaw, localRaw, remoteRaw]) {
    if (!raw) continue;
    try {
      if (JSON.stringify(parseMathRewards(raw)) !== JSON.stringify(JSON.parse(raw)))
        conflict = true;
    } catch {
      conflict = true;
    }
  }
  if (conflict) return { value: localRaw, conflict };
  const result: Record<string, MathPlaceRewards> = {};
  const legacy = (value?: MathPlaceRewards) =>
    (value?.points ?? 0) -
    Object.values(value?.rounds ?? {}).reduce((sum, points) => sum + points, 0);
  for (const course of [...new Set([...Object.keys(local), ...Object.keys(remote)])].sort()) {
    const key = course as keyof typeof local;
    const left = local[key];
    const right = remote[key];
    if (!left || !right) {
      result[course] = (left ?? right)!;
      continue;
    }
    const rounds = { ...right.rounds, ...left.rounds };
    for (const [id, points] of Object.entries(left.rounds ?? {}))
      if (right.rounds?.[id] !== undefined && right.rounds[id] !== points) conflict = true;
    const untracked = (value?: MathPlaceRewards) =>
      Math.max(
        0,
        legacy(value) -
          Object.entries(rounds).reduce(
            (sum, [id, amount]) =>
              sum + (value?.receipts.includes(id) && value.rounds?.[id] === undefined ? amount : 0),
            0,
          ),
      );
    const oldLeft = untracked(left),
      oldRight = untracked(right),
      oldBase = untracked(base[key]);
    if (oldLeft !== oldBase && oldRight !== oldBase && oldLeft !== oldRight) conflict = true;
    const oldPoints =
      oldLeft === oldBase ? oldRight : oldRight === oldBase ? oldLeft : Math.max(oldLeft, oldRight);
    const points = oldPoints + Object.values(rounds).reduce((sum, amount) => sum + amount, 0);
    if (!Number.isSafeInteger(points)) return { value: localRaw, conflict: true };
    const chests = new Map<string, MathChest>();
    for (const chest of [...right.chests, ...left.chests]) {
      const previous = chests.get(chest.id);
      if (!previous) {
        chests.set(chest.id, chest);
        continue;
      }
      const differentKind = (previous.kind ?? "common") !== (chest.kind ?? "common");
      if (differentKind) conflict = true;
      const differentLoot =
        previous.cards &&
        chest.cards &&
        JSON.stringify(previous.cards) !== JSON.stringify(chest.cards);
      if (differentLoot) conflict = true;
      const selected = chest.arcana
        ? chest
        : previous.arcana
          ? previous
          : chest.cards
            ? chest
            : previous.cards
              ? previous
              : chest;
      const deadlines = [previous.unlockAt, chest.unlockAt].filter(
        (time): time is number => time !== null,
      );
      chests.set(chest.id, {
        ...selected,
        opened: previous.opened || chest.opened,
        unlockAt: deadlines.length ? Math.min(...deadlines) : null,
        ...(chestCards(selected).length
          ? {
              revealed: differentLoot
                ? selected.revealed
                : Math.max(previous.revealed ?? 0, chest.revealed ?? 0),
            }
          : {}),
      });
    }
    result[course] = {
      points,
      receipts: [...new Set([...left.receipts, ...right.receipts])].sort(),
      rounds: Object.fromEntries(Object.entries(rounds).sort(([a], [b]) => a.localeCompare(b))),
      chests: [...chests.values()].sort((a, b) => a.id.localeCompare(b.id)),
    };
  }
  return { value: JSON.stringify(result), conflict };
}
