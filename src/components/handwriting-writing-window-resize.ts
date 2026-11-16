export type WritingResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type WritingResizeBox = { x: number; y: number; width: number; height: number };
export const WRITING_WINDOW_MIN_SIZE = { width: 280, height: 160 };
export const WRITING_WINDOW_MAX_SIZE = { width: 1200, height: 600 };

export function resizeWritingWindow(
  box: WritingResizeBox,
  edge: WritingResizeEdge,
  dx: number,
  dy: number,
  area: WritingResizeBox,
): WritingResizeBox {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const maxWidth = Math.min(WRITING_WINDOW_MAX_SIZE.width, area.width);
  const maxHeight = Math.min(WRITING_WINDOW_MAX_SIZE.height, area.height);
  const minWidth = Math.min(WRITING_WINDOW_MIN_SIZE.width, maxWidth);
  const minHeight = Math.min(WRITING_WINDOW_MIN_SIZE.height, maxHeight);
  let width = clamp(box.width, minWidth, maxWidth);
  let height = clamp(box.height, minHeight, maxHeight);
  let x = clamp(box.x, area.x, area.x + area.width - width);
  let y = clamp(box.y, area.y, area.y + area.height - height);
  if (edge.includes("e"))
    width = clamp(width + dx, minWidth, Math.min(maxWidth, area.x + area.width - x));
  if (edge.includes("s"))
    height = clamp(height + dy, minHeight, Math.min(maxHeight, area.y + area.height - y));
  if (edge.includes("w")) {
    const right = x + width;
    x = clamp(x + dx, Math.max(area.x, right - maxWidth), right - minWidth);
    width = right - x;
  }
  if (edge.includes("n")) {
    const bottom = y + height;
    y = clamp(y + dy, Math.max(area.y, bottom - maxHeight), bottom - minHeight);
    height = bottom - y;
  }
  return { x, y, width, height };
}
