import type { HandwritingPoint } from "../domain/handwriting";
import type { Stroke } from "./handwriting-types";

// Animação dos traços de um colega: em vez de aparecerem de uma vez, eles são
// "escritos" na folha ao longo do próprio caminho, um depois do outro, na ordem em
// que foram feitos. Tudo aqui é conta pura; o desenho fica no editor.

export type RevealingStroke = { stroke: Stroke; start: number; duration: number };

// Unidades da folha por milissegundo: cerca de 2200 por segundo, rápido o bastante
// para não atrasar quem está olhando e devagar o bastante para ler como escrita.
const REVEAL_SPEED = 2.2;
const MIN_STROKE_MS = 140;
const MAX_STROKE_MS = 650;
// Um lote grande de traços (uma página colada, por exemplo) não deve virar um
// espetáculo: a duração total é limitada e passa de certo tamanho não anima.
const MAX_TOTAL_MS = 1400;
const MIN_SCALED_STROKE_MS = 70;
const MAX_REVEALED_STROKES = 16;
// Cada traço começa quando o anterior está a esta fração do fim: fluxo contínuo.
const OVERLAP = 0.85;

function pathLength(points: readonly HandwritingPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index]!.x - points[index - 1]!.x,
      points[index]!.y - points[index - 1]!.y,
    );
  }
  return length;
}

export function revealDuration(stroke: Pick<Stroke, "points">): number {
  const wanted = pathLength(stroke.points) / REVEAL_SPEED;
  return Math.min(MAX_STROKE_MS, Math.max(MIN_STROKE_MS, wanted));
}

// Só anima quando é uma atualização pequena e ao vivo.
export function shouldReveal(strokes: readonly unknown[]): boolean {
  return strokes.length > 0 && strokes.length <= MAX_REVEALED_STROKES;
}

export function planReveal(strokes: readonly Stroke[], startedAt: number): RevealingStroke[] {
  const durations = strokes.map((stroke) => revealDuration(stroke));
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  const scale = total > MAX_TOTAL_MS ? MAX_TOTAL_MS / total : 1;
  let cursor = startedAt;
  return strokes.map((stroke, index) => {
    const duration = Math.max(MIN_SCALED_STROKE_MS, durations[index]! * scale);
    const reveal = { stroke, start: cursor, duration };
    cursor += duration * OVERLAP;
    return reveal;
  });
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

// 0 antes de começar, 1 ao terminar; suave no início e no fim do traço.
export function revealProgress(reveal: RevealingStroke, now: number): number {
  const linear = (now - reveal.start) / reveal.duration;
  if (linear <= 0) return 0;
  if (linear >= 1) return 1;
  return smoothstep(linear);
}

// O traço até `progress` do seu comprimento, com o último ponto interpolado.
export function partialStroke(stroke: Stroke, progress: number): Stroke {
  const points = stroke.points;
  if (progress >= 1 || points.length < 2) return stroke;
  const wanted = pathLength(points) * Math.max(0, progress);
  const kept: HandwritingPoint[] = [points[0]!];
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const segment = Math.hypot(to.x - from.x, to.y - from.y);
    if (walked + segment <= wanted) {
      kept.push(to);
      walked += segment;
      continue;
    }
    const along = segment > 0 ? (wanted - walked) / segment : 0;
    if (along > 0) {
      kept.push({
        ...to,
        x: from.x + (to.x - from.x) * along,
        y: from.y + (to.y - from.y) * along,
        pressure: from.pressure + (to.pressure - from.pressure) * along,
      });
    }
    break;
  }
  return { ...stroke, points: kept };
}

// Decide o que fazer com os traços de uma atualização remota.
// - O traço que esta pessoa está fazendo agora não pode sumir: sem ele na lista, a
//   folha o apagaria no meio do gesto. Se a atualização não o traz, ele é mantido.
// - Traços que a folha ainda não conhecia são os "novos": só eles são animados.
export function applyRemoteStrokes(input: {
  remote: readonly Stroke[];
  known: ReadonlySet<string>;
  drawing: Stroke | null;
}): { strokes: Stroke[]; incoming: Stroke[] } {
  const { remote, known, drawing } = input;
  const keepDrawing = drawing !== null && !remote.some((stroke) => stroke.id === drawing.id);
  return {
    strokes: keepDrawing ? [...remote, drawing] : [...remote],
    incoming: remote.filter((stroke) => !known.has(stroke.id)),
  };
}
