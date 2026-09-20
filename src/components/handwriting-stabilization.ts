import type { HandwritingPoint } from "../domain/handwriting";

export type { HandwritingPoint } from "../domain/handwriting";

function rotatePoint(
  point: HandwritingPoint,
  center: HandwritingPoint,
  angle: number,
): HandwritingPoint {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;
  return {
    ...point,
    x: center.x + offsetX * cosine - offsetY * sine,
    y: center.y + offsetX * sine + offsetY * cosine,
  };
}

function smoothPass(points: readonly HandwritingPoint[]): HandwritingPoint[] {
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return { ...point };
    const previous = points[index - 1] ?? point;
    const next = points[index + 1] ?? point;
    return {
      x: previous.x * 0.25 + point.x * 0.5 + next.x * 0.25,
      y: previous.y * 0.25 + point.y * 0.5 + next.y * 0.25,
      pressure: previous.pressure * 0.2 + point.pressure * 0.6 + next.pressure * 0.2,
    };
  });
}

export function stabilizeHandwriting(points: readonly HandwritingPoint[]): HandwritingPoint[] {
  if (points.length < 3) return [...points];
  const smoothed = smoothPass(smoothPass(points));
  const first = smoothed[0];
  const last = smoothed.at(-1);
  if (!first || !last) return smoothed;
  const width = Math.abs(last.x - first.x);
  const angle = Math.atan2(last.y - first.y, last.x - first.x);
  const maxCorrection = (12 * Math.PI) / 180;
  if (width < 80 || Math.abs(angle) > maxCorrection) return smoothed;
  const height = last.y - first.y;
  const length = Math.hypot(width, height);
  const maxDeviation = smoothed.reduce((max, point) => {
    const deviation = Math.abs(
      (height * (point.x - first.x) - (last.x - first.x) * (point.y - first.y)) / length,
    );
    return Math.max(max, deviation);
  }, 0);
  if (maxDeviation > 10) return smoothed;
  const center = smoothed[Math.floor(smoothed.length / 2)] ?? first;
  return smoothed.map((point) => rotatePoint(point, center, -angle * 0.88));
}
