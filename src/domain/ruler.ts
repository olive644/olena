import type { HandwritingPoint } from "./handwriting";

export type RulerUnit = "px" | "cm" | "in";
export type RulerKind =
  "straight" | "triangle-45" | "triangle-30" | "protractor" | "circle" | "curve";

function pointAt(start: HandwritingPoint, distance: number, angle: number): HandwritingPoint {
  return {
    ...start,
    x: start.x + Math.cos(angle) * distance,
    y: start.y + Math.sin(angle) * distance,
  };
}

function snappedEnd(start: HandwritingPoint, end: HandwritingPoint, increment: number) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  return pointAt(start, distance, Math.round(angle / increment) * increment);
}

export function rulerPoints(
  start: HandwritingPoint,
  end: HandwritingPoint,
  kind: RulerKind,
): HandwritingPoint[] {
  if (kind === "triangle-45") return [start, snappedEnd(start, end, Math.PI / 4)];
  if (kind === "triangle-30") return [start, snappedEnd(start, end, Math.PI / 6)];
  if (kind === "protractor") return [start, snappedEnd(start, end, Math.PI / 12)];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (kind === "circle") {
    return Array.from({ length: 49 }, (_, index) =>
      pointAt(start, distance, (index / 48) * Math.PI * 2),
    );
  }
  if (kind === "curve") {
    const normalX = distance === 0 ? 0 : -dy / distance;
    const normalY = distance === 0 ? 0 : dx / distance;
    return Array.from({ length: 33 }, (_, index) => {
      const progress = index / 32;
      const bend = Math.sin(progress * Math.PI) * distance * 0.24;
      return {
        ...start,
        x: start.x + dx * progress + normalX * bend,
        y: start.y + dy * progress + normalY * bend,
      };
    });
  }
  return [start, end];
}

export function rulerMeasurement(pixels: number, unit: RulerUnit, kind: RulerKind) {
  const converted =
    unit === "px" ? Math.round(pixels) : (pixels * 21) / 1200 / (unit === "in" ? 2.54 : 1);
  const value = unit === "px" ? String(converted) : converted.toFixed(2);
  return `${kind === "circle" ? "⌀ " : ""}${value} ${unit}`;
}
