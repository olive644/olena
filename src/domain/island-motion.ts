/**
 * Movimento da ilha de Matemática (Picos dos Padrões).
 *
 * O corpo da ilha nunca é cortado nem deformado: ele só flutua inteiro. O que já está solto na
 * arte (separado por transparência) vira peça independente, e o brilho, o reflexo, as faíscas e
 * as partículas são camadas por cima. Este módulo só calcula: nada aqui desenha ou toca o DOM.
 */

import { analyzePlace, type PlaceModel, type PlaceRig } from "./place-rig";

export const ISLAND_CYCLE_SECONDS = 6;
const TAU = Math.PI * 2;
/** Acima disto um pixel conta como "visível" para separar peças. */
const SOLID_ALPHA = 8;
const MIN_PIECE_AREA = 12;
const MAX_FREE_SHIFT = 14;
const TRAJECTORY_SAMPLES = 180;
/** Fatores de amplitude que precisam continuar sem invadir a ilha (a animação entra e sai com eles). */
const ENVELOPE_CHECKS = [1, 0.75, 0.5, 0.25] as const;

export type IslandBox = { x: number; y: number; w: number; h: number };

export type FloatingPiece = {
  /** Rótulo da peça em `IslandModel.labels` (1 ou mais; 0 é a ilha). */
  label: number;
  box: IslandBox;
  period: number;
  phase: number;
  offsetX: number;
  amplitudeX: number;
  offsetY: number;
  amplitudeY: number;
  /** 1 quando cabe inteira; menor quando o trajeto precisou encolher para não invadir a ilha. */
  scale: number;
  /** Espaço livre medido contra a ilha, em pixels, em cada direção. */
  free: { up: number; down: number; left: number; right: number };
};

export type Spark = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  period: number;
  /** Índice da parte móvel que carrega a faísca (ouro que anda junto), ou -1 se ela fica parada. */
  part: number;
};
export type Mote = {
  x: number;
  y: number;
  size: number;
  phase: number;
  sway: number;
  rise: number;
};

export type IslandModel = {
  size: number;
  /** Por pixel: -1 vazio, 0 a ilha, 1 ou mais as peças soltas. */
  labels: Int32Array;
  pieces: FloatingPiece[];
  /** Máscara (0 ou 1) do ouro da ilha: ponte, diamantes, compasso e janelas. */
  gold: Uint8Array;
  sparks: Spark[];
  motes: Mote[];
  /** Partes móveis recortadas da arte (lugares da ilha), ou `null` na ilha das disciplinas. */
  place: PlaceModel | null;
  /** Se o conjunto todo flutua junto (a ilha das disciplinas) ou só as partes se mexem. */
  group: boolean;
};

type Component = { pixels: Int32Array; area: number };

function byteAt(data: Uint8ClampedArray | Uint8Array, index: number): number {
  return data[index] ?? 0;
}

/** Componentes conexos (8 vizinhos) de uma máscara, do maior para o menor. */
function connectedComponents(mask: Uint8Array, size: number, minArea = 1): Component[] {
  const total = size * size;
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  const found: Component[] = [];
  for (let start = 0; start < total; start++) {
    if (!mask[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const collected: number[] = [];
    while (top > 0) {
      const current = stack[--top] ?? 0;
      collected.push(current);
      const cx = current % size;
      const cy = (current - cx) / size;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= size) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          if (nx < 0 || nx >= size) continue;
          const next = ny * size + nx;
          if (mask[next] && !seen[next]) {
            seen[next] = 1;
            stack[top++] = next;
          }
        }
      }
    }
    if (collected.length >= minArea)
      found.push({ pixels: Int32Array.from(collected), area: collected.length });
  }
  return found.sort((a, b) => b.area - a.area);
}

/** Rótulos por pixel: a maior peça é a ilha (0); pixels quase invisíveis seguem o vizinho mais próximo. */
function labelPixels(
  rgba: Uint8ClampedArray,
  size: number,
): { labels: Int32Array; solid: Uint8Array; count: number } {
  const total = size * size;
  const solid = new Uint8Array(total);
  for (let k = 0; k < total; k++) if (byteAt(rgba, k * 4 + 3) > SOLID_ALPHA) solid[k] = 1;
  const labels = new Int32Array(total).fill(-1);
  const components = connectedComponents(solid, size);

  // Pontinhos de poucos pixels não valem uma peça: ficam parados, com a ilha.
  let next = 0;
  components.forEach((component, order) => {
    const label = order === 0 || component.area < MIN_PIECE_AREA ? 0 : ++next;
    for (const pixel of component.pixels) labels[pixel] = label;
  });

  // Pixels com opacidade de 1 a 8 acompanham o vizinho visível mais próximo.
  let frontier: number[] = [];
  for (let k = 0; k < total; k++) if ((labels[k] ?? -1) >= 0) frontier.push(k);
  while (frontier.length > 0) {
    const grown: number[] = [];
    for (const pixel of frontier) {
      const px = pixel % size;
      const py = (pixel - px) / size;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const near = ny * size + nx;
          if ((labels[near] ?? 0) < 0 && byteAt(rgba, near * 4 + 3) > 0) {
            labels[near] = labels[pixel] ?? 0;
            grown.push(near);
          }
        }
    }
    frontier = grown;
  }
  // O que sobrar (neblina isolada) vai para a peça mais próxima, até 24 pixels de distância.
  const orphans: number[] = [];
  for (let k = 0; k < total; k++)
    if ((labels[k] ?? -1) < 0 && byteAt(rgba, k * 4 + 3) > 0) orphans.push(k);
  const resolved = orphans.map((pixel) => {
    const px = pixel % size;
    const py = (pixel - px) / size;
    let best = 0;
    let bestDistance = Infinity;
    for (let ring = 1; ring <= 24 && bestDistance === Infinity; ring++) {
      for (let dy = -ring; dy <= ring; dy++)
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const label = labels[ny * size + nx] ?? -1;
          if (label < 0) continue;
          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = label;
          }
        }
    }
    return best;
  });
  orphans.forEach((pixel, index) => {
    labels[pixel] = resolved[index] ?? 0;
  });
  return { labels, solid, count: next };
}

/** Quantos pixels a peça anda em (dx, dy) antes de encostar na ilha (ou sair da imagem). */
function freeShift(
  pixels: Int32Array,
  solidMain: Uint8Array,
  size: number,
  dx: number,
  dy: number,
): number {
  for (let step = 1; step <= MAX_FREE_SHIFT; step++) {
    for (const pixel of pixels) {
      const x = (pixel % size) + dx * step;
      const y = Math.floor(pixel / size) + dy * step;
      if (x < 0 || y < 0 || x >= size || y >= size) return step - 1;
      if (solidMain[y * size + x]) return step - 1;
    }
  }
  return MAX_FREE_SHIFT;
}

/** Onda centrada no espaço livre: de -cima até +baixo, inteira e suave, sem trechos parados. */
function fitWave(low: number, high: number, cap: number): { offset: number; amplitude: number } {
  const amplitude = Math.min((low + high) / 2, cap);
  const offset = Math.max(-low + amplitude, Math.min(high - amplitude, (high - low) / 2));
  return { offset, amplitude };
}

/** Deslocamento da peça no instante `t` (segundos), já multiplicado pelo envelope `k` de 0 a 1. */
export function pieceOffset(piece: FloatingPiece, t: number, k = 1): { dx: number; dy: number } {
  const angle = (TAU * t) / piece.period + piece.phase;
  return {
    dx: k * piece.scale * (piece.offsetX + piece.amplitudeX * Math.sin(angle + 1.3)),
    dy: k * piece.scale * (piece.offsetY + piece.amplitudeY * Math.sin(angle)),
  };
}

/** Maior deslocamento inteiro (em cada eixo) que a tabela de invasão cobre. */
const SHIFT_RANGE = 12;
const SHIFT_SIDE = SHIFT_RANGE * 2 + 1;

/**
 * Para cada deslocamento inteiro, diz se a peça encostaria na ilha. É calculada uma vez por peça:
 * checar o trajeto depois vira só consulta, o que mantém a análise rápida.
 */
export type InvasionTable = Uint8Array;

export function buildInvasionTable(
  pixels: Int32Array,
  solidMain: Uint8Array,
  size: number,
): InvasionTable {
  const table = new Uint8Array(SHIFT_SIDE * SHIFT_SIDE);
  for (let sy = -SHIFT_RANGE; sy <= SHIFT_RANGE; sy++) {
    for (let sx = -SHIFT_RANGE; sx <= SHIFT_RANGE; sx++) {
      let hit = false;
      for (const pixel of pixels) {
        const x = (pixel % size) + sx;
        const y = Math.floor(pixel / size) + sy;
        if (x < 0 || y < 0 || x >= size || y >= size || solidMain[y * size + x]) {
          hit = true;
          break;
        }
      }
      table[(sy + SHIFT_RANGE) * SHIFT_SIDE + sx + SHIFT_RANGE] = hit ? 1 : 0;
    }
  }
  return table;
}

function invades(table: InvasionTable, ox: number, oy: number): boolean {
  // A posição de sub-pixel fica entre os inteiros vizinhos: os quatro precisam estar livres.
  for (const fx of [Math.floor(ox), Math.ceil(ox)])
    for (const fy of [Math.floor(oy), Math.ceil(oy)]) {
      if (Math.abs(fx) > SHIFT_RANGE || Math.abs(fy) > SHIFT_RANGE) return true;
      if (table[(fy + SHIFT_RANGE) * SHIFT_SIDE + fx + SHIFT_RANGE]) return true;
    }
  return false;
}

/** Quantos instantes do ciclo (com posições de sub-pixel e vários envelopes) a peça invade a ilha. */
export function countInvasions(
  piece: FloatingPiece,
  table: InvasionTable,
  samples = TRAJECTORY_SAMPLES,
): number {
  let count = 0;
  for (let sample = 0; sample < samples; sample++) {
    const t = (sample / samples) * ISLAND_CYCLE_SECONDS;
    for (const k of ENVELOPE_CHECKS) {
      const { dx, dy } = pieceOffset(piece, t, k);
      if (invades(table, dx, dy)) {
        count++;
        break;
      }
    }
  }
  return count;
}

function goldMask(rgba: Uint8ClampedArray, labels: Int32Array): Uint8Array {
  const gold = new Uint8Array(labels.length);
  for (let k = 0; k < labels.length; k++) {
    if (labels[k] !== 0) continue;
    const i = k * 4;
    const r = byteAt(rgba, i);
    const g = byteAt(rgba, i + 1);
    const b = byteAt(rgba, i + 2);
    if (byteAt(rgba, i + 3) > 200 && r > 205 && g > 150 && b < 130 && g - b > 70) gold[k] = 1;
  }
  return gold;
}

function sparksFrom(gold: Uint8Array, size: number): Spark[] {
  return connectedComponents(gold, size, 28)
    .slice(0, 10)
    .map((component, index) => {
      let sx = 0;
      let sy = 0;
      for (const pixel of component.pixels) {
        sx += pixel % size;
        sy += Math.floor(pixel / size);
      }
      const cx = sx / component.area;
      const cy = sy / component.area;
      let best = component.pixels[0] ?? 0;
      let bestDistance = Infinity;
      for (const pixel of component.pixels) {
        const distance = ((pixel % size) - cx) ** 2 + (Math.floor(pixel / size) - cy) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = pixel;
        }
      }
      return {
        x: best % size,
        y: Math.floor(best / size),
        radius: Math.max(9, Math.min(20, Math.sqrt(component.area) * 0.9)),
        phase: (index * 0.173) % 1,
        period: index % 3 === 2 ? 6 : 3,
        part: -1,
      };
    });
}

function motesFrom(labels: Int32Array, size: number): Mote[] {
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const scale = size / 800;
  const motes: Mote[] = [];
  let attempts = 0;
  while (motes.length < 14 && attempts++ < 4000) {
    const x = (90 + random() * 620) * scale;
    const y = (230 + random() * 460) * scale;
    if (labels[Math.floor(y) * size + Math.floor(x)] !== 0) continue;
    motes.push({
      x,
      y,
      size: (4 + random() * 4.5) * scale,
      phase: random(),
      sway: (5 + random() * 9) * scale,
      rise: (110 + random() * 90) * scale,
    });
  }
  return motes;
}

/** Analisa a arte (RGBA quadrado) e devolve tudo o que a animação precisa. */
export function analyzeIsland(rgba: Uint8ClampedArray, size: number, rig?: PlaceRig): IslandModel {
  const { labels, solid, count } = labelPixels(rgba, size);
  const total = size * size;
  const solidMain = new Uint8Array(total);
  for (let k = 0; k < total; k++) if (labels[k] === 0 && solid[k]) solidMain[k] = 1;

  const buckets = new Map<
    number,
    { visible: number[]; minX: number; minY: number; maxX: number; maxY: number }
  >();
  for (let k = 0; k < total; k++) {
    const label = labels[k] ?? -1;
    if (label < 1) continue;
    const x = k % size;
    const y = (k - x) / size;
    const bucket = buckets.get(label) ?? { visible: [], minX: size, minY: size, maxX: 0, maxY: 0 };
    if (solid[k]) bucket.visible.push(k);
    if (x < bucket.minX) bucket.minX = x;
    if (x > bucket.maxX) bucket.maxX = x;
    if (y < bucket.minY) bucket.minY = y;
    if (y > bucket.maxY) bucket.maxY = y;
    buckets.set(label, bucket);
  }

  const room = (value: number) => Math.max(0, Math.min(10, value - 2));
  const periods = [6, 3, 2, 6, 3];
  const pieces: FloatingPiece[] = [];
  for (let label = 1; label <= count; label++) {
    const bucket = buckets.get(label);
    if (!bucket || bucket.visible.length === 0) continue;
    const pixels = Int32Array.from(bucket.visible);
    const free = {
      up: freeShift(pixels, solidMain, size, 0, -1),
      down: freeShift(pixels, solidMain, size, 0, 1),
      left: freeShift(pixels, solidMain, size, -1, 0),
      right: freeShift(pixels, solidMain, size, 1, 0),
    };
    const vertical = fitWave(room(free.up), room(free.down), 7);
    const horizontal = fitWave(Math.min(3, room(free.left)), Math.min(3, room(free.right)), 3);
    const index = label - 1;
    const piece: FloatingPiece = {
      label,
      box: {
        x: bucket.minX - 1,
        y: bucket.minY - 1,
        w: bucket.maxX - bucket.minX + 3,
        h: bucket.maxY - bucket.minY + 3,
      },
      period: periods[index % periods.length] ?? 6,
      phase: ((index * 0.37) % 1) * TAU,
      offsetX: horizontal.offset,
      amplitudeX: horizontal.amplitude,
      offsetY: vertical.offset,
      amplitudeY: vertical.amplitude,
      scale: 1,
      free,
    };
    const table = buildInvasionTable(pixels, solidMain, size);
    while (piece.scale > 0.05 && countInvasions(piece, table) > 0) piece.scale *= 0.92;
    if (countInvasions(piece, table) > 0) piece.scale = 0;
    pieces.push(piece);
  }

  const gold = goldMask(rgba, labels);
  const place = rig ? analyzePlace(rgba, size, rig) : null;
  const sparks = sparksFrom(gold, size);
  if (place)
    for (const spark of sparks) spark.part = (place.partMask[spark.y * size + spark.x] ?? 0) - 1;
  return {
    size,
    labels,
    pieces,
    gold,
    sparks,
    motes: motesFrom(labels, size),
    place,
    group: rig?.group !== false,
  };
}

/** Pose do grupo da ilha (corpo, brilho, reflexo, faíscas e partículas), com envelope `k`. */
export function groupPose(t: number, k = 1): { bob: number; rotation: number; scale: number } {
  return {
    bob: -9 * k * Math.sin((TAU * t) / ISLAND_CYCLE_SECONDS),
    rotation: 0.0035 * k * Math.sin((TAU * t) / ISLAND_CYCLE_SECONDS + 1.2),
    scale: 1 + 0.004 * k * Math.sin((TAU * t) / 3),
  };
}

/** Pulso do brilho dourado, de 0 a 1, a cada 3 s. */
export function glowPulse(t: number): number {
  return 0.5 - 0.5 * Math.cos((TAU * t) / 3);
}

/** Progresso do reflexo de luz (0 a 1) ou `null` fora da janela em que ele passa. */
export function sweepProgress(t: number): number | null {
  const u =
    (((t % ISLAND_CYCLE_SECONDS) + ISLAND_CYCLE_SECONDS) % ISLAND_CYCLE_SECONDS) /
    ISLAND_CYCLE_SECONDS;
  const start = 0.5;
  const end = 0.78;
  if (u <= start || u >= end) return null;
  const k = (u - start) / (end - start);
  return k * k * (3 - 2 * k);
}

/** Intensidade (0 a 1) da faísca no instante `t`. */
export function sparkIntensity(spark: Spark, t: number): number {
  return Math.pow(Math.max(0, Math.sin(TAU * (t / spark.period + spark.phase))), 8);
}

/** Posição e opacidade da partícula; some nas pontas do ciclo, então o ciclo fecha sem emenda. */
export function moteState(mote: Mote, t: number): { x: number; y: number; alpha: number } {
  const u = (((t / ISLAND_CYCLE_SECONDS + mote.phase) % 1) + 1) % 1;
  return {
    x: mote.x + mote.sway * Math.sin(TAU * (u * 1.5 + mote.phase)),
    y: mote.y - mote.rise * u,
    alpha: Math.pow(Math.sin(Math.PI * u), 1.4) * 0.95,
  };
}

/** Envelope de 0 a 1 que sobe quando a ilha está ativa e desce quando sai, sem saltos. */
export function stepEnvelope(current: number, active: boolean, deltaSeconds: number): number {
  const target = active ? 1 : 0;
  const rate = active ? 1 / 0.7 : 1 / 0.45;
  const next = current + Math.sign(target - current) * rate * deltaSeconds;
  return Math.abs(target - next) < rate * deltaSeconds ? target : Math.max(0, Math.min(1, next));
}
