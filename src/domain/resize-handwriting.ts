import type { HandwritingDocument, HandwritingPoint } from "./handwriting";

/** Fit existing content when switching to a smaller sheet, without clipping it. */
export function fitHandwriting(
  document: HandwritingDocument,
  width: number,
  height: number,
): HandwritingDocument {
  const previous =
    document.canvasSize ??
    (document.paper === "board" ? { width: 3200, height: 2400 } : { width: 1200, height: 1600 });
  const scale = Math.min(1, width / previous.width, height / previous.height);
  const point = (value: HandwritingPoint) => ({ ...value, x: value.x * scale, y: value.y * scale });
  const frame = (
    value: { x: number; y: number; width: number; height: number },
    minWidth = 1,
    minHeight = 1,
  ) => {
    const w = Math.max(minWidth, value.width * scale);
    const h = Math.max(minHeight, value.height * scale);
    return {
      x: Math.min(value.x * scale, width - w),
      y: Math.min(value.y * scale, height - h),
      width: w,
      height: h,
    };
  };
  return {
    ...document,
    canvasSize: { width, height },
    strokes: document.strokes.map((stroke) => ({
      ...stroke,
      width: stroke.width * scale,
      points: stroke.points.map(point),
    })),
    stickies:
      document.stickies?.map((sticky) => ({
        ...sticky,
        ...frame({ ...sticky, width: sticky.width ?? 220, height: sticky.height ?? 180 }, 160, 120),
      })) ?? [],
    images: document.images?.map((image) => ({ ...image, ...frame(image, 40, 40) })) ?? [],
    coordinateSystems:
      document.coordinateSystems?.map((system) => ({
        ...system,
        origin: point(system.origin),
        end: point(system.end),
      })) ?? [],
    ...(document.backgroundFrame ? { backgroundFrame: frame(document.backgroundFrame) } : {}),
    ...(document.pageTextFrame ? { pageTextFrame: frame(document.pageTextFrame, 120, 60) } : {}),
  };
}
