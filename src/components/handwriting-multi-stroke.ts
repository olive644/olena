import { closeLines, type LineSegment } from "./handwriting-shapes";
import type { Stroke } from "./handwriting-types";

// Formas com vários traços: as retas que o "segurar para acertar" acabou de endireitar ficam
// numa lista curta. Quando uma nova reta fecha um triângulo, um retângulo ou um quadrilátero com
// elas, as retas viram um único traço fechado. Só entram retas acertadas de propósito, então
// quem escreve ou desenha livremente nunca tem os traços juntados sem querer.
export type RecentLine = { id: string; time: number };

// Por quanto tempo uma reta acertada continua valendo para fechar uma forma.
export const RECENT_LINE_WINDOW_MS = 15000;
// Retas lembradas: o bastante para as três de um quadrilátero e uma perdida no meio.
export const MAX_RECENT_LINES = 5;
// Reta mais curta que isso (unidades da folha) nunca entra.
const MIN_LINE = 40;

const sameStyle = (a: Stroke, b: Stroke) =>
  a.tool === b.tool &&
  a.color === b.color &&
  a.width === b.width &&
  a.brush === b.brush &&
  a.dash === b.dash &&
  !a.cover &&
  !b.cover;

function segmentOf(stroke: Stroke): LineSegment | null {
  const a = stroke.points[0];
  const b = stroke.points.at(-1);
  if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) < MIN_LINE) return null;
  return { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } };
}

// Tira da lista o que venceu, o que foi apagado (ou desfeito) e o que passa do limite.
export function pruneRecentLines(
  recent: readonly RecentLine[],
  now: number,
  strokes: readonly Stroke[],
): RecentLine[] {
  const present = new Set(strokes.map((stroke) => stroke.id));
  return recent
    .filter((line) => now - line.time <= RECENT_LINE_WINDOW_MS && present.has(line.id))
    .slice(-MAX_RECENT_LINES);
}

// Se a reta nova fecha uma forma com as recentes, devolve o que sai e o traço fechado que entra.
export function combineWithRecentLines(
  strokes: readonly Stroke[],
  recent: readonly RecentLine[],
  latest: Stroke,
  newId: () => string,
): { remove: string[]; stroke: Stroke } | null {
  const newestSegment = segmentOf(latest);
  if (!newestSegment) return null;
  const candidates: { id: string; segment: LineSegment }[] = [];
  for (const line of recent) {
    const stroke = strokes.find((candidate) => candidate.id === line.id);
    const segment = stroke && sameStyle(stroke, latest) ? segmentOf(stroke) : null;
    if (stroke && segment) candidates.push({ id: stroke.id, segment });
  }
  if (candidates.length < 2) return null;
  const pressure =
    latest.points.reduce((sum, point) => sum + point.pressure, 0) / latest.points.length || 0.5;
  const closed = closeLines([...candidates.map((item) => item.segment), newestSegment], pressure);
  if (!closed) return null;
  const newest = candidates.length;
  const remove = closed.used
    .filter((index) => index !== newest)
    .map((index) => candidates[index]!.id);
  return { remove, stroke: { ...latest, id: newId(), points: closed.points } };
}
