import type { HandwritingPoint } from "../domain/handwriting";
import type { Stroke } from "./handwriting-types";
import { strokeRadii } from "./handwriting-ink";

type Interval = [number, number];
const EPSILON = 1e-7;
const boundsCache = new WeakMap<
  Stroke,
  { left: number; right: number; top: number; bottom: number }
>();
function bounds(stroke: Stroke) {
  const cached = boundsCache.get(stroke);
  if (cached) return cached;
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  for (const point of stroke.points) {
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }
  const box = { left, right, top, bottom };
  boundsCache.set(stroke, box);
  return box;
}

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
  const box = bounds(stroke);
  const padding = radius + stroke.width * 2;
  let touches = false;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[i + 1] ?? a;
    if (
      Math.max(a.x, b.x) + padding >= box.left &&
      Math.min(a.x, b.x) - padding <= box.right &&
      Math.max(a.y, b.y) + padding >= box.top &&
      Math.min(a.y, b.y) - padding <= box.bottom
    ) {
      touches = true;
      break;
    }
  }
  if (!touches) return [stroke];
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
    for (let step = 0; step < Math.max(1, path.length - 1); step++) {
      const c = path[step]!;
      const d = path[step + 1] ?? c;
      if (
        Math.max(a.x, b.x) < Math.min(c.x, d.x) - reach ||
        Math.min(a.x, b.x) > Math.max(c.x, d.x) + reach ||
        Math.max(a.y, b.y) < Math.min(c.y, d.y) - reach ||
        Math.min(a.y, b.y) > Math.max(c.y, d.y) + reach
      )
        continue;
      cuts.push(...capsule(a, b, c, d, reach));
    }
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

// Só diz se a borracha encostou no traço, sem cortar nada: usado no modo "traço inteiro".
function strokeIntersectsErase(
  stroke: Stroke,
  path: readonly HandwritingPoint[],
  radius: number,
): boolean {
  if (path.length === 0 || stroke.points.length === 0) return false;
  const box = bounds(stroke);
  const padding = radius + stroke.width * 2;
  let touches = false;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[i + 1] ?? a;
    if (
      Math.max(a.x, b.x) + padding >= box.left &&
      Math.min(a.x, b.x) - padding <= box.right &&
      Math.max(a.y, b.y) + padding >= box.top &&
      Math.min(a.y, b.y) - padding <= box.bottom
    ) {
      touches = true;
      break;
    }
  }
  if (!touches) return false;
  const radii =
    stroke.tool === "highlighter"
      ? stroke.points.map(() => stroke.width / 2)
      : stroke.brush === "fine"
        ? stroke.points.map(() => (stroke.width * 0.65) / 2)
        : strokeRadii(stroke, stroke.points);
  const count = Math.max(1, stroke.points.length - 1);
  for (let index = 0; index < count; index++) {
    const a = stroke.points[index]!;
    const b = stroke.points[index + 1] ?? a;
    const reach = radius + Math.max(radii[index]!, radii[index + 1] ?? radii[index]!);
    for (let step = 0; step < Math.max(1, path.length - 1); step++) {
      const c = path[step]!;
      const d = path[step + 1] ?? c;
      if (
        Math.max(a.x, b.x) < Math.min(c.x, d.x) - reach ||
        Math.min(a.x, b.x) > Math.max(c.x, d.x) + reach ||
        Math.max(a.y, b.y) < Math.min(c.y, d.y) - reach ||
        Math.min(a.y, b.y) > Math.max(c.y, d.y) + reach
      )
        continue;
      if (capsule(a, b, c, d, reach).length > 0) return true;
    }
  }
  return false;
}

// Modo "traço inteiro": em vez de recortar só o pedaço tocado, remove o traço todo que a
// borracha encostou, como apagar uma linha inteira de um quadro branco.
export function eraseWholeStrokes(
  strokes: Stroke[],
  path: readonly HandwritingPoint[],
  radius: number,
): Stroke[] {
  if (path.length === 0) return strokes;
  let changed = false;
  const kept = strokes.filter((stroke) => {
    const hit = strokeIntersectsErase(stroke, path, radius);
    if (hit) changed = true;
    return !hit;
  });
  return changed ? kept : strokes;
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
