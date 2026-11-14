import type { SelectionBox } from "./handwriting-types";

export type AlignmentGuide = { axis: "x" | "y"; value: number; start: number; end: number };

export function snapSelection(
  moving: SelectionBox,
  others: readonly SelectionBox[],
  threshold: number,
): { dx: number; dy: number; guides: AlignmentGuide[] } {
  const guides: AlignmentGuide[] = [];
  let dx = 0;
  let dy = 0;
  for (const axis of ["x", "y"] as const) {
    const size = axis === "x" ? "width" : "height";
    const cross = axis === "x" ? "y" : "x";
    const crossSize = axis === "x" ? "height" : "width";
    let nearest = Infinity;
    let guide: AlignmentGuide | undefined;
    for (const other of others) {
      for (const origin of [0, 0.5, 1]) {
        for (const target of [0, 0.5, 1]) {
          const value = other[axis] + other[size] * target;
          const delta = value - moving[axis] - moving[size] * origin;
          if (Math.abs(delta) > threshold || Math.abs(delta) >= nearest) continue;
          nearest = Math.abs(delta);
          if (axis === "x") dx = delta;
          else dy = delta;
          guide = {
            axis,
            value,
            start: Math.min(moving[cross], other[cross]),
            end: Math.max(moving[cross] + moving[crossSize], other[cross] + other[crossSize]),
          };
        }
      }
    }
    if (guide) guides.push(guide);
  }
  return { dx, dy, guides };
}

export function selectionToolbarPosition(
  selection: SelectionBox,
  viewport: SelectionBox,
  toolbar: { width: number; height: number },
) {
  const margin = 8;
  const below = selection.y - toolbar.height - margin < viewport.y;
  const maxX = Math.max(viewport.x + margin, viewport.x + viewport.width - toolbar.width - margin);
  return {
    x: Math.max(
      viewport.x + margin,
      Math.min(maxX, selection.x + (selection.width - toolbar.width) / 2),
    ),
    y: Math.max(
      viewport.y + margin,
      Math.min(
        viewport.y + viewport.height - toolbar.height - margin,
        below ? selection.y + selection.height + margin : selection.y - toolbar.height - margin,
      ),
    ),
    below,
  };
}
