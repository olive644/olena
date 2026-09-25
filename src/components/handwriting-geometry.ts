import { pageTextLines } from "../domain/handwriting";
import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingPoint,
  HandwritingSticky,
} from "../domain/handwriting";
import {
  STICKY_MAX_HEIGHT,
  STICKY_MAX_WIDTH,
  STICKY_MIN_HEIGHT,
  STICKY_MIN_WIDTH,
  type SelectionBox,
  type Stroke,
} from "./handwriting-types";

export function stickyColor(color: HandwritingSticky["color"]): string {
  return color === "blue" ? "#d9ecf4" : color === "lilac" ? "#e9ddfb" : "#fff0b5";
}

export function stickyWidth(sticky: HandwritingSticky): number {
  return Math.max(STICKY_MIN_WIDTH, Math.min(STICKY_MAX_WIDTH, sticky.width ?? 260));
}

export function stickyHeight(sticky: HandwritingSticky): number {
  return Math.max(STICKY_MIN_HEIGHT, Math.min(STICKY_MAX_HEIGHT, sticky.height ?? 220));
}

export function pointDistance(first: HandwritingPoint, second: HandwritingPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function strokeBounds(stroke: Stroke): SelectionBox {
  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function coordinateBounds(system: HandwritingCoordinateSystem): SelectionBox {
  return {
    x: Math.min(system.origin.x, system.end.x),
    y: Math.min(system.origin.y, system.end.y),
    width: Math.abs(system.end.x - system.origin.x),
    height: Math.abs(system.end.y - system.origin.y),
  };
}

export function stickyBounds(sticky: HandwritingSticky): SelectionBox {
  return { x: sticky.x, y: sticky.y, width: stickyWidth(sticky), height: stickyHeight(sticky) };
}

export function importedImageBounds(image: HandwritingImage): SelectionBox {
  return { x: image.x, y: image.y, width: image.width, height: image.height };
}

export function pageTextBounds(
  text: string,
  size: number,
  frame: SelectionBox = { x: 112, y: 80, width: 980, height: 1440 },
): SelectionBox {
  const lineHeight = size * (40 / 28);
  const height = Math.min(
    frame.height,
    Math.max(lineHeight, pageTextLines(text, size, frame.width).length * lineHeight),
  );
  return { ...frame, height };
}

export function overlaps(first: SelectionBox, second: SelectionBox): boolean {
  return (
    first.x <= second.x + second.width &&
    first.x + first.width >= second.x &&
    first.y <= second.y + second.height &&
    first.y + first.height >= second.y
  );
}

export function pointInPolygon(
  point: HandwritingPoint,
  polygon: readonly HandwritingPoint[],
): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!current || !prior) continue;
    const intersects =
      current.y > point.y !== prior.y > point.y &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function unionBounds(boxes: readonly SelectionBox[]): SelectionBox | null {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}

export function distanceToSegment(
  point: HandwritingPoint,
  start: HandwritingPoint,
  end: HandwritingPoint,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) return pointDistance(point, start);
  const ratio = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared),
  );
  return Math.hypot(point.x - (start.x + ratio * segmentX), point.y - (start.y + ratio * segmentY));
}

export function strokeTouches(stroke: Stroke, point: HandwritingPoint, radius: number): boolean {
  if (stroke.points.length === 1) {
    const first = stroke.points[0];
    return first ? pointDistance(first, point) <= radius : false;
  }
  return stroke.points.some((current, index) => {
    const next = stroke.points[index + 1];
    return next ? distanceToSegment(point, current, next) <= radius : false;
  });
}
