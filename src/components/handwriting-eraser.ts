import type { HandwritingPoint } from "../domain/handwriting";
import type { Stroke } from "./handwriting-types";
import { strokeRadii } from "./handwriting-ink";

type Interval = [number, number];
const EPSILON = 1e-7;

function interpolate(a: HandwritingPoint, b: HandwritingPoint, t: number): HandwritingPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    pressure: a.pressure + (b.pressure - a.pressure) * t,
    ...(a.tiltX === undefined && b.tiltX === undefined
      ? {}
      : { tiltX: (a.tiltX ?? 0) + ((b.tiltX ?? 0) - (a.tiltX ?? 0)) * t }),
    ...(a.tiltY === undefined && b.tiltY === undefined
      ? {}
      : { tiltY: (a.tiltY ?? 0) + ((b.tiltY ?? 0) - (a.tiltY ?? 0)) * t }),
  };
}

function circle(
  a: HandwritingPoint,
  b: HandwritingPoint,
  c: HandwritingPoint,
  r: number,
): Interval[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const x = a.x - c.x;
  const y = a.y - c.y;
  if (length < EPSILON) return x * x + y * y < r * r ? [[0, 1]] : [];
  const dot = x * dx + y * dy;
  const discriminant = dot * dot - length * (x * x + y * y - r * r);
  if (discriminant <= 0) return [];
  const root = Math.sqrt(discriminant);
  const from = Math.max(0, (-dot - root) / length);
  const to = Math.min(1, (-dot + root) / length);
  return to - from > EPSILON ? [[from, to]] : [];
}

// Intersecta o segmento de tinta com a cápsula varrida pela borracha. Incluir o
// caminho entre eventos evita saltar tinta em movimentos rápidos ou amostras esparsas.
function capsule(
  a: HandwritingPoint,
  b: HandwritingPoint,
  c: HandwritingPoint,
  d: HandwritingPoint,
  r: number,
): Interval[] {
  const intervals = [...circle(a, b, c, r), ...circle(a, b, d, r)];
  const length = Math.hypot(d.x - c.x, d.y - c.y);
  if (length < EPSILON) return intervals;
  const ux = (d.x - c.x) / length;
  const uy = (d.y - c.y) / length;
  let from = 0;
  let to = 1;
  for (const [position, delta, min, max] of [
    [(a.x - c.x) * ux + (a.y - c.y) * uy, (b.x - a.x) * ux + (b.y - a.y) * uy, 0, length],
    [-(a.x - c.x) * uy + (a.y - c.y) * ux, -(b.x - a.x) * uy + (b.y - a.y) * ux, -r, r],
  ] as const) {
    if (Math.abs(delta) < EPSILON) {
      if (position < min || position > max) return intervals;
    } else {
      const t1 = (min - position) / delta;
      const t2 = (max - position) / delta;
      from = Math.max(from, Math.min(t1, t2));
      to = Math.min(to, Math.max(t1, t2));
    }
  }
  if (to - from > EPSILON) intervals.push([from, to]);
  return intervals;
}

export function eraseStrokeArea(
  stroke: Stroke,
  path: readonly HandwritingPoint[],
  radius: number,
  nextId: () => string,
): Stroke[] {
  if (path.length === 0 || stroke.points.length === 0) return [stroke];
  const radii =
    stroke.tool === "highlighter"
      ? stroke.points.map(() => stroke.width / 2)
      : stroke.brush === "fine"
        ? stroke.points.map(() => (stroke.width * 0.65) / 2)
        : strokeRadii(stroke, stroke.points);
  const fragments: HandwritingPoint[][] = [];
  let active: HandwritingPoint[] = [];
  let changed = false;
  const flush = () => {
    if (active.length) fragments.push(active);
    active = [];
  };
  const count = Math.max(1, stroke.points.length - 1);
  for (let index = 0; index < count; index++) {
    const a = stroke.points[index]!;
    const b = stroke.points[index + 1] ?? a;
    const cuts: Interval[] = [];
    const reach = radius + Math.max(radii[index]!, radii[index + 1] ?? radii[index]!);
    for (let step = 0; step < Math.max(1, path.length - 1); step++)
      cuts.push(...capsule(a, b, path[step]!, path[step + 1] ?? path[step]!, reach));
    cuts.sort((left, right) => left[0] - right[0]);
    let cursor = 0;
    const keep = (from: number, to: number) => {
      if (active.length === 0) active.push(interpolate(a, b, from));
      active.push(interpolate(a, b, to));
    };
    for (const [from, to] of cuts) {
      if (to <= cursor) continue;
      changed = true;
      if (from > cursor) keep(cursor, from);
      flush();
      cursor = Math.max(cursor, to);
    }
    if (cursor < 1) keep(cursor, 1);
  }
  if (!changed) return [stroke];
  flush();
  return fragments.map((points) => ({ ...stroke, id: nextId(), points }));
}

export function eraseInkArea(
  strokes: Stroke[],
  path: readonly HandwritingPoint[],
  radius: number,
  nextId: () => string,
): Stroke[] {
  let changed = false;
  const result = strokes.flatMap((stroke) => {
    const fragments = eraseStrokeArea(stroke, path, radius, nextId);
    if (fragments.length !== 1 || fragments[0] !== stroke) changed = true;
    return fragments;
  });
  return changed ? result : strokes;
}
