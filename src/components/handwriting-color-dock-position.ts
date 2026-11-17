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
  obstacle?: ColorDockBox | readonly ColorDockBox[],
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
  const obstacles: readonly ColorDockBox[] = !obstacle
    ? []
    : Array.isArray(obstacle)
      ? obstacle
      : [obstacle as ColorDockBox];
  const overlaps = (px: number, py: number, box: ColorDockBox) =>
    px < box.x + box.width + GAP &&
    px + width + GAP > box.x &&
    py < box.y + box.height + GAP &&
    py + height + GAP > box.y;
  if (obstacles.some((box) => overlaps(x, y, box))) {
    const start = (horizontal ? area.x : area.y) + GAP;
    const end = horizontal
      ? area.x + area.width - width - GAP
      : area.y + area.height - height - GAP;
    const origin = horizontal ? x : y;
    const candidates = obstacles
      .flatMap((box) => [
        (horizontal ? box.x - width : box.y - height) - GAP,
        (horizontal ? box.x + box.width : box.y + box.height) + GAP,
      ])
      .filter(
        (value) =>
          value >= start &&
          value <= end &&
          !obstacles.some((box) => overlaps(horizontal ? value : x, horizontal ? y : value, box)),
      );
    if (candidates.length) {
      const value = candidates.reduce((a, b) =>
        Math.abs(a - origin) < Math.abs(b - origin) ? a : b,
      );
      if (horizontal) x = value;
      else y = value;
    } else {
      const colliding = obstacles.filter((box) => overlaps(x, y, box));
      if (edge === "left") x = Math.max(x, ...colliding.map((box) => box.x + box.width + GAP));
      if (edge === "right") x = Math.min(x, ...colliding.map((box) => box.x - width - GAP));
      if (edge === "top") y = Math.max(y, ...colliding.map((box) => box.y + box.height + GAP));
      if (edge === "bottom") y = Math.min(y, ...colliding.map((box) => box.y - height - GAP));
    }
  }
  return { x, y };
}
