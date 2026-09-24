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
  return straightenStroke(smoothPass(smoothPass(points)));
}

// Endireita traços quase retos (uma linha feita à mão livre, quase horizontal),
// sem suavizar o desenho. Curvas e traços curtos passam intactos.
export function straightenStroke(points: readonly HandwritingPoint[]): HandwritingPoint[] {
  if (points.length < 3) return [...points];
  const smoothed = [...points];
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

export type LiveStabilizerOptions = {
  /** Distância mínima, em pixels da folha, para aceitar uma nova amostra da caneta. */
  deadzone: number;
  /** Massa da caneta virtual: quanto maior, mais ela demora para acompanhar a mão. */
  mass: number;
  /** Amortecimento de 0 a 1: quanto maior, menos a caneta virtual balança. */
  drag: number;
};

// Resposta mais próxima da ponta: a configuração anterior atrasava o traço
// visivelmente, sobretudo com amostras esparsas de mouse e toque.
export const DEFAULT_LIVE_STABILIZER: LiveStabilizerOptions = {
  deadzone: 1,
  mass: 1,
  drag: 0.25,
};

const SETTLE_DISTANCE = 0.75;
const MAX_SETTLE_STEPS = 40;

export type LiveStabilizer = {
  push: (samples: readonly HandwritingPoint[]) => HandwritingPoint[];
  finish: () => HandwritingPoint[];
};

// Estabilização em tempo real, inspirada nas opções de suavização do Xournal++.
// A zona morta ignora tremores menores que o raio. A resposta exponencial
// acompanha a mão sem oscilar nem acumular atraso a cada amostra.
// Pressão e inclinação vêm da amostra real; só a posição é filtrada.
export function createLiveStabilizer(
  start: HandwritingPoint,
  options: LiveStabilizerOptions = DEFAULT_LIVE_STABILIZER,
): LiveStabilizer {
  let anchor = start;
  let x = start.x;
  let y = start.y;
  function step(target: HandwritingPoint) {
    const response = Math.min(1, Math.max(0.05, (1 - options.drag) / options.mass));
    x += (target.x - x) * response;
    y += (target.y - y) * response;
  }

  return {
    push(samples) {
      const filtered: HandwritingPoint[] = [];
      for (const sample of samples) {
        if (Math.hypot(sample.x - anchor.x, sample.y - anchor.y) < options.deadzone) continue;
        anchor = sample;
        step(sample);
        filtered.push({ ...sample, x, y });
      }
      return filtered;
    },
    finish() {
      const tail: HandwritingPoint[] = [];
      for (let index = 0; index < MAX_SETTLE_STEPS; index += 1) {
        if (Math.hypot(anchor.x - x, anchor.y - y) <= SETTLE_DISTANCE) break;
        step(anchor);
        tail.push({ ...anchor, x, y });
      }
      if (x !== anchor.x || y !== anchor.y) {
        x = anchor.x;
        y = anchor.y;
        tail.push({ ...anchor });
      }
      return tail;
    },
  };
}
