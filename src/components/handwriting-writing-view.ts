import { WRITING_WINDOW_WIDTH, WRITING_WINDOW_HEIGHT } from "./handwriting-types";

export type WritingView = { x: number; y: number; zoom: number; aspect?: number };
export type WritingPageSize = { width: number; height: number };

export function writingViewSize(
  zoom: number,
  aspect = WRITING_WINDOW_WIDTH / WRITING_WINDOW_HEIGHT,
) {
  return { width: WRITING_WINDOW_WIDTH / zoom, height: WRITING_WINDOW_WIDTH / zoom / aspect };
}

export function navigateWritingView(
  view: WritingView,
  page: WritingPageSize,
  from: { x: number; y: number },
  to: { x: number; y: number },
  nextZoom: number,
  aspect = view.aspect ?? WRITING_WINDOW_WIDTH / WRITING_WINDOW_HEIGHT,
): WritingView {
  const minimum = Math.max(
    0.5,
    WRITING_WINDOW_WIDTH / page.width,
    WRITING_WINDOW_WIDTH / aspect / page.height,
  );
  const zoom = Math.max(minimum, Math.min(4, nextZoom));
  const before = writingViewSize(view.zoom, view.aspect);
  const after = writingViewSize(zoom, aspect);
  return {
    aspect,
    x: Math.max(
      0,
      Math.min(page.width - after.width, view.x + from.x * before.width - to.x * after.width),
    ),
    y: Math.max(
      0,
      Math.min(page.height - after.height, view.y + from.y * before.height - to.y * after.height),
    ),
    zoom,
  };
}
