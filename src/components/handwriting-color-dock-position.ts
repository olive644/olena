export type ColorDockEdge = "left" | "right" | "top" | "bottom";
export type ColorDockBox = { x: number; y: number; width: number; height: number };

const GAP = 8;
const clamp = (value: number, maximum: number) =>
  Math.max(0, Math.min(value, Math.max(0, maximum)));

export function nearestColorDockEdge(x: number, y: number, area: ColorDockBox): ColorDockEdge {
  const distances: [ColorDockEdge, number][] = [
    ["left", Math.abs(x - area.x)],
    ["right", Math.abs(area.x + area.width - x)],
    ["top", Math.abs(y - area.y)],
    ["bottom", Math.abs(area.y + area.height - y)],
  ];
  return distances.reduce((closest, next) => (next[1] < closest[1] ? next : closest))[0];
}

export function placeColorDock(
  area: ColorDockBox,
  size: { width: number; height: number },
  edge: ColorDockEdge,
  fraction: number,
  obstacle?: ColorDockBox,
) {
  const horizontal = edge === "top" || edge === "bottom";
  const width = Math.min(size.width, Math.max(0, area.width - GAP * 2));
  const height = Math.min(size.height, Math.max(0, area.height - GAP * 2));
  let x =
    area.x + GAP + clamp(fraction * (area.width - width - GAP * 2), area.width - width - GAP * 2);
  let y =
    area.y +
    GAP +
    clamp(fraction * (area.height - height - GAP * 2), area.height - height - GAP * 2);
  if (horizontal) y = edge === "top" ? area.y + GAP : area.y + area.height - height - GAP;
  else x = edge === "left" ? area.x + GAP : area.x + area.width - width - GAP;
  if (
    obstacle &&
    x < obstacle.x + obstacle.width + GAP &&
    x + width + GAP > obstacle.x &&
    y < obstacle.y + obstacle.height + GAP &&
    y + height + GAP > obstacle.y
  ) {
    const before = (horizontal ? obstacle.x - width : obstacle.y - height) - GAP;
    const after = (horizontal ? obstacle.x + obstacle.width : obstacle.y + obstacle.height) + GAP;
    const start = (horizontal ? area.x : area.y) + GAP;
    const end = horizontal
      ? area.x + area.width - width - GAP
      : area.y + area.height - height - GAP;
    const candidates = [before, after].filter((position) => position >= start && position <= end);
    const origin = horizontal ? x : y;
    if (candidates.length) {
      const position = candidates.reduce((a, b) =>
        Math.abs(a - origin) < Math.abs(b - origin) ? a : b,
      );
      if (horizontal) x = position;
      else y = position;
    } else if (!horizontal && edge === "left") {
      x = Math.max(x, obstacle.x + obstacle.width + GAP);
    }
  }
  return { x, y };
}
