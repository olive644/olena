import type { HandwritingPoint } from "../domain/handwriting";

export type { HandwritingPoint } from "../domain/handwriting";

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

// Reta de verdade. Um traço feito à mão que quase não sai da corda entre o começo e o fim vira uma
// reta perfeita, em qualquer direção. Antes só se corrigia a inclinação de traços quase horizontais
// (88% do ângulo) e o tremor ficava: a linha saía torta e com falhas. Cada ponto é projetado na
// reta, então a quantidade de pontos, a ordem e a pressão ficam como estavam (e a borracha continua
// apagando só o trecho tocado). Letras e riscos curtos, curvas e arcos passam intactos.
/** Corda mínima (unidades da folha, que tem 1200 de largura): abaixo disso é letra, não reta. */
const MIN_STRAIGHT_LENGTH = 100;
/** O caminho percorrido não pode passar de 3% da corda (senão há curva ou vai e volta). */
const MAX_PATH_RATIO = 1.03;
/** Maior afastamento da corda aceito: 2% dela, mas nunca menos que 3 unidades de tremor. */
const MAX_SAG_FRACTION = 0.02;
const MIN_SAG = 3;
/**
 * Perto de um eixo a reta vira exatamente horizontal ou vertical. A horizontal vale até 12 graus,
 * como já valia (sublinhado, barra de fração e linha de tabela saem tortos e a pessoa quer plano).
 * A vertical vale até 3 graus: ela antes nunca era corrigida, e uma reta inclinada de propósito
 * não pode ficar em pé.
 */
const HORIZONTAL_SNAP = (12 * Math.PI) / 180;
const VERTICAL_SNAP = (3 * Math.PI) / 180;

export function straightenStroke(points: readonly HandwritingPoint[]): HandwritingPoint[] {
  if (points.length < 3) return [...points];
  const first = points[0]!;
  const last = points.at(-1)!;
  const chord = Math.hypot(last.x - first.x, last.y - first.y);
  if (chord < MIN_STRAIGHT_LENGTH) return [...points];
  const ux = (last.x - first.x) / chord;
  const uy = (last.y - first.y) / chord;
  let pathLength = 0;
  let sag = 0;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    const before = points[index - 1]!;
    pathLength += Math.hypot(point.x - before.x, point.y - before.y);
    sag = Math.max(sag, Math.abs(uy * (point.x - first.x) - ux * (point.y - first.y)));
  }
  if (pathLength > chord * MAX_PATH_RATIO || sag > Math.max(MIN_SAG, chord * MAX_SAG_FRACTION))
    return [...points];

  let dirX = ux;
  let dirY = uy;
  const angle = Math.atan2(uy, ux);
  const axis = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
  const horizontal = axis === 0 || Math.abs(axis) === Math.PI;
  if (Math.abs(angle - axis) <= (horizontal ? HORIZONTAL_SNAP : VERTICAL_SNAP)) {
    dirX = Math.cos(axis);
    dirY = Math.sin(axis);
  }
  // A reta passa pelo meio da corda: os extremos se mexem o mínimo possível.
  const startX = (first.x + last.x) / 2 - (dirX * chord) / 2;
  const startY = (first.y + last.y) / 2 - (dirY * chord) / 2;
  let along = 0;
  return points.map((point, index) => {
    if (index === 0) along = 0;
    else if (index === points.length - 1) along = chord;
    else {
      const t = (point.x - startX) * dirX + (point.y - startY) * dirY;
      // nunca volta: o tremor não pode dobrar a reta sobre si mesma
      along = Math.min(chord, Math.max(along, t));
    }
    return { ...point, x: startX + dirX * along, y: startY + dirY * along };
  });
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
  /** Distância máxima entre a tinta filtrada e a amostra real, em unidades da folha. */
  maxLag: number;
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
  maxLag: 4,
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
  let renderedX = start.x;
  let renderedY = start.y;
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
          renderedX = x;
          renderedY = y;
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
        // O filtro começa sem velocidade. Limitar a distância evita a cauda lenta
        // no arranque, nas curvas e depois de uma pausa, inclusive sob zoom.
        const lag = Math.hypot(sample.x - x, sample.y - y);
        renderedX = x;
        renderedY = y;
        if (lag > options.maxLag) {
          const fraction = options.maxLag / lag;
          renderedX = sample.x + (x - sample.x) * fraction;
          renderedY = sample.y + (y - sample.y) * fraction;
        }
        pressure += pressureAlpha * (sample.pressure - pressure);
        lastRaw = sample;
        anchor = sample;
        filtered.push({ ...sample, x: renderedX, y: renderedY, pressure });
      });
      return filtered;
    },
    finish() {
      x = renderedX;
      y = renderedY;
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
      renderedX = x;
      renderedY = y;
      return tail;
    },
  };
}
