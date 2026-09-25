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
      ...point,
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
  /** Frequência de corte mínima, em Hz: quanto menor, mais o tremor lento é suavizado. */
  minCutoff: number;
  /** Quanto o corte sobe com a velocidade: quanto maior, menos suavização em traços rápidos. */
  beta: number;
  /** Distância mínima, em unidades da folha, para aceitar uma nova amostra. */
  deadzone: number;
  /** Suavização da pressão de 0 a 1: quanto maior, mais rápido ela acompanha a caneta. */
  pressureResponse: number;
};

// Filtro 1€ (Casiez, Roussel e Vogel, 2012) sobre um preditor de velocidade
// (filtro alfa-beta). O 1€ escolhe a força da suavização pela velocidade: devagar,
// o corte baixo remove o tremor; rápido, o corte alto deixa a tinta acompanhar. O
// preditor tira o atraso de um passa-baixa simples: em movimento uniforme a tinta
// fica exatamente sob a caneta, então dá para suavizar bem mais sem ela ficar para
// trás. Velocidades em unidades da folha por segundo (a folha tem 1200 de largura).
export const DEFAULT_LIVE_STABILIZER: LiveStabilizerOptions = {
  minCutoff: 0.9,
  beta: 0.02,
  deadzone: 0.5,
  pressureResponse: 0.45,
};

const DEFAULT_SAMPLE_INTERVAL_MS = 8;
const MIN_INTERVAL_S = 0.001;
const MAX_INTERVAL_S = 0.1;
// Canto: a direção vira mais de ~78° num passo maior que o ruído e com a mão em
// movimento. Ali a tinta não pode arredondar: trava no ponto real da caneta.
const CORNER_MIN_STEP = 4;
const CORNER_MIN_SPEED = 150;
const CORNER_COSINE = 0.2;
const SETTLE_DISTANCE = 0.5;
const MAX_SETTLE_STEPS = 12;
const SETTLE_RESPONSE = 0.55;

export type LiveStabilizer = {
  /** Filtra amostras novas. `times` são os timestamps (ms) de cada uma; sem eles, assume 125 Hz. */
  push: (samples: readonly HandwritingPoint[], times?: readonly number[]) => HandwritingPoint[];
  /** Pontos finais que levam a tinta até onde a caneta realmente parou. */
  finish: () => HandwritingPoint[];
};

function lowPassAlpha(cutoff: number, interval: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / interval);
}

// Só posição e pressão são filtradas; inclinação e o resto vêm da amostra real.
export function createLiveStabilizer(
  start: HandwritingPoint,
  options: LiveStabilizerOptions = DEFAULT_LIVE_STABILIZER,
): LiveStabilizer {
  let anchor = start;
  let x = start.x;
  let y = start.y;
  let pressure = start.pressure;
  let velocityX = 0;
  let velocityY = 0;
  let lastRaw = start;
  let lastTime: number | undefined;

  return {
    push(samples, times) {
      const filtered: HandwritingPoint[] = [];
      samples.forEach((sample, index) => {
        if (
          Math.hypot(sample.x - anchor.x, sample.y - anchor.y) < options.deadzone &&
          Math.abs(sample.pressure - pressure) < 0.015
        )
          return;
        const time = times?.[index] ?? (lastTime ?? 0) + DEFAULT_SAMPLE_INTERVAL_MS;
        const interval = Math.min(
          MAX_INTERVAL_S,
          Math.max(MIN_INTERVAL_S, (time - (lastTime ?? time - DEFAULT_SAMPLE_INTERVAL_MS)) / 1000),
        );
        lastTime = time;
        // A mesma resposta por segundo em canetas de 60, 125 ou 240 Hz.
        const pressureAlpha = 1 - Math.pow(1 - options.pressureResponse, interval / 0.008);
        const stepX = sample.x - lastRaw.x;
        const stepY = sample.y - lastRaw.y;
        const step = Math.hypot(stepX, stepY);
        const speed = Math.hypot(velocityX, velocityY);
        if (
          step >= CORNER_MIN_STEP &&
          speed >= CORNER_MIN_SPEED &&
          (stepX * velocityX + stepY * velocityY) / (step * speed) < CORNER_COSINE
        ) {
          x = sample.x;
          y = sample.y;
          velocityX = 0;
          velocityY = 0;
          pressure += pressureAlpha * (sample.pressure - pressure);
          lastRaw = sample;
          anchor = sample;
          filtered.push({ ...sample, x, y, pressure });
          return;
        }
        const predictedX = x + velocityX * interval;
        const predictedY = y + velocityY * interval;
        const errorX = sample.x - predictedX;
        const errorY = sample.y - predictedY;
        const cutoff = options.minCutoff + options.beta * Math.hypot(velocityX, velocityY);
        const alpha = lowPassAlpha(cutoff, interval);
        // Ganho de velocidade com amortecimento crítico para esse alfa.
        const velocityGain = (alpha * alpha) / (2 - alpha) / interval;
        x = predictedX + alpha * errorX;
        y = predictedY + alpha * errorY;
        velocityX += velocityGain * errorX;
        velocityY += velocityGain * errorY;
        pressure += pressureAlpha * (sample.pressure - pressure);
        lastRaw = sample;
        anchor = sample;
        filtered.push({ ...sample, x, y, pressure });
      });
      return filtered;
    },
    finish() {
      const tail: HandwritingPoint[] = [];
      for (let index = 0; index < MAX_SETTLE_STEPS; index += 1) {
        if (Math.hypot(anchor.x - x, anchor.y - y) <= SETTLE_DISTANCE) break;
        x += (anchor.x - x) * SETTLE_RESPONSE;
        y += (anchor.y - y) * SETTLE_RESPONSE;
        tail.push({ ...anchor, x, y, pressure });
      }
      if (x !== anchor.x || y !== anchor.y) {
        x = anchor.x;
        y = anchor.y;
        tail.push({ ...anchor, pressure });
      }
      return tail;
    },
  };
}
