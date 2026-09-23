import type { HandwritingCoordinateSystem } from "./handwriting";

export type CoordinateStats = {
  deltaX: number;
  deltaY: number;
  distance: number;
  slope: number | null;
  angle: number;
};

export function coordinateStats(
  system: Pick<HandwritingCoordinateSystem, "origin" | "end" | "step">,
  tickPixels = 48,
): CoordinateStats {
  const deltaX = ((system.end.x - system.origin.x) / tickPixels) * system.step;
  const deltaY = ((system.origin.y - system.end.y) / tickPixels) * system.step;
  return {
    deltaX,
    deltaY,
    distance: Math.hypot(deltaX, deltaY),
    slope: Math.abs(deltaX) < Number.EPSILON ? null : deltaY / deltaX,
    angle: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
  };
}

export function formatCoordinateNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
