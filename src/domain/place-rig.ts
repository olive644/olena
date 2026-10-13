/**
 * Partes móveis dos lugares da ilha de Matemática (Pátio, Oficina, Torre, Ponte, Porto, Mirante).
 *
 * Cada lugar é uma arte única, sem camadas. Aqui cada parte (um diamante, um barco, o braço do
 * transferidor) é recortada da própria arte por cor e região, ganha um movimento próprio e deixa no
 * lugar de onde saiu só o que ficaria atrás dela: o entorno é preenchido com a cor vizinha e o que
 * era ar continua transparente. Este módulo só calcula: nada aqui desenha ou toca o DOM.
 */
import type { IslandBox } from "./island-motion";

export const PLACE_CYCLE_SECONDS = 6;
const TAU = Math.PI * 2;
/** Acima disto um pixel conta como sólido (miolo da arte, sem a borda suavizada). */
const SOLID_ALPHA = 200;
const EDGE_ALPHA = 8;
const FLOOD_LIMIT = 60000;
const RAY_LENGTH = 36;
const EXPOSURE_TIMES = 24;
const EXPOSURE_ENVELOPES = [1, 0.6, 0.3] as const;

export type ColorClass = "gold" | "blue" | "green" | "cream" | "water" | "notwater" | "any";

export type PartSeed = { x: number; y: number; color: ColorClass };

/** Onda de um eixo: `amp` em pixels da arte (ou radianos, ou fração de escala). */
export type Wave = {
  amp: number;
  /** Só sobe (ou só avança): a onda vai de 0 a `amp` e volta, sem passar para o outro lado. */
  oneSided?: boolean;
  /** Defasagem em voltas, somada à da parte. */
  shift?: number;
};

export type PartMotion = {
  /** Segundos de uma volta. Precisa dividir o ciclo de 6 s, para o movimento fechar sem emenda. */
  period: number;
  /** Defasagem da parte em voltas (0 a 1). */
  phase: number;
  dx?: Wave;
  dy?: Wave;
  rot?: Wave;
  scaleX?: Wave;
  scaleY?: Wave;
  /** Ponto fixo da rotação e da escala: o meio, a base ou o topo da parte, ou um ponto da arte. */
  pivot?: "center" | "base" | "top" | readonly [number, number];
};

export type PartFill = "auto" | "solid" | "air";

export type PartSpec = {
  id: string;
  seeds: readonly PartSeed[];
  /** Região (retângulo x0, y0, x1, y1) em que a parte pode crescer a partir das sementes. */
  box?: readonly [number, number, number, number];
  /** Região poligonal, mais precisa que o retângulo. */
  polygon?: readonly (readonly [number, number])[];
  motion: PartMotion;
  /** O que fica atrás da parte quando ela sai do lugar: o entorno, ar, ou decidido pela vizinhança. */
  fill?: PartFill;
  /** A parte pulsa mais clara (ouro): é desenhada de novo, por cima, com brilho. */
  glow?: boolean;
  /** Pixels a mais em volta, de qualquer cor: leva junto o reflexo ou a sombra colada na parte. */
  margin?: number;
};

export type WaterSpec = {
  seeds: readonly PartSeed[];
  box?: readonly [number, number, number, number];
  polygon?: readonly (readonly [number, number])[];
};

export type PlaceRig = {
  parts: readonly PartSpec[];
  /** Superfície de água que recebe o reflexo ondulante, se o lugar tiver. */
  water?: WaterSpec;
  /** Quando falso, o lugar não balança inteiro (o avatar fica parado) e só as partes se mexem. */
  group?: boolean;
};

export type PartModel = {
  id: string;
  /** Retângulo da parte na arte (já com a borda suavizada). */
  box: IslandBox;
  motion: PartMotion;
  pivot: { x: number; y: number };
  glow: boolean;
  area: number;
};

export type PlaceModel = {
  parts: PartModel[];
  /** Por pixel: 0 sem parte, ou o índice da parte mais um. */
  partMask: Int16Array;
  /** Pixels (índices) do fundo que a saída de uma parte revela, e a cor que passam a ter. */
  fillIndex: Int32Array;
  fillColor: Uint8ClampedArray;
  /** Pixels que deixam de existir no fundo (a parte saiu e ali havia ar). */
  clearIndex: Int32Array;
  /** Máscara (0 ou 1) da água, ou `null`. */
  water: Uint8Array | null;
  /** Especificações que não acharam a parte na arte (a análise ignora, o teste reprova). */
  missing: string[];
};

function byteAt(data: Uint8ClampedArray | Uint8Array, index: number): number {
  return data[index] ?? 0;
}

/**
 * Diz se a cor pertence a uma classe da paleta da ilha. A versão estrita separa peças que se tocam
 * (contas do ábaco, arbustos vizinhos); a frouxa também aceita o contorno escuro e os tons de sombra,
 * e só serve para levar a borda junto com a parte.
 */
export function matchesColor(
  color: ColorClass,
  r: number,
  g: number,
  b: number,
  loose = false,
): boolean {
  switch (color) {
    case "gold":
      return loose
        ? r >= 160 && g >= 100 && b <= 110 && r - b >= 100 && g - b >= 55 && r >= g
        : r >= 185 && g >= 120 && b <= 120 && r - b >= 100 && g - b >= 60 && r >= g;
    case "blue":
      return loose ? b >= 60 && b - r >= 50 && b - g >= 30 : b >= 110 && r <= 90 && b - g >= 40;
    case "green":
      return loose ? g - b >= 40 && g >= r + 15 && g >= 60 : g - b >= 60 && g >= r + 15;
    case "cream":
      return r >= 140 && g >= 115 && b >= 70 && r >= g && g >= b && r - b <= 100;
    case "water":
      return r <= 60 && g >= 78 && g <= 160 && b >= 150 && b - g >= 45 && b - g <= 112;
    case "notwater":
      return !matchesColor("water", r, g, b);
    case "any":
      return true;
  }
}

function insidePolygon(x: number, y: number, polygon: readonly (readonly [number, number])[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}

type Region = {
  box?: readonly [number, number, number, number] | undefined;
  polygon?: readonly (readonly [number, number])[] | undefined;
};

function inRegion(region: Region, x: number, y: number): boolean {
  if (region.box) {
    const [x0, y0, x1, y1] = region.box;
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  }
  if (region.polygon && !insidePolygon(x + 0.5, y + 0.5, region.polygon)) return false;
  return true;
}

/** Cresce uma região conexa (8 vizinhos) a partir das sementes, só por pixels da classe e da região. */
function flood(
  rgba: Uint8ClampedArray,
  size: number,
  seeds: readonly PartSeed[],
  region: Region,
  blocked: (pixel: number) => boolean,
): number[] {
  const found: number[] = [];
  const seen = new Uint8Array(size * size);
  const stack: number[] = [];
  const accepts = (color: ColorClass, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return false;
    const pixel = y * size + x;
    if (seen[pixel] || blocked(pixel)) return false;
    const i = pixel * 4;
    if (byteAt(rgba, i + 3) < SOLID_ALPHA) return false;
    return (
      inRegion(region, x, y) &&
      matchesColor(color, byteAt(rgba, i), byteAt(rgba, i + 1), byteAt(rgba, i + 2))
    );
  };
  for (const seed of seeds) {
    // A semente cai às vezes numa borda: procura o pixel da classe mais próximo, até 6 pixels.
    let start = -1;
    for (let ring = 0; ring <= 6 && start < 0; ring++)
      for (let dy = -ring; dy <= ring && start < 0; dy++)
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          if (accepts(seed.color, seed.x + dx, seed.y + dy)) {
            start = (seed.y + dy) * size + seed.x + dx;
            break;
          }
        }
    if (start < 0) continue;
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0 && found.length < FLOOD_LIMIT) {
      const current = stack.pop() ?? 0;
      found.push(current);
      const cx = current % size;
      const cy = (current - cx) / size;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (accepts(seed.color, cx + dx, cy + dy)) {
            const next = (cy + dy) * size + cx + dx;
            seen[next] = 1;
            stack.push(next);
          }
        }
    }
  }
  return found;
}

/** A borda suave cai um ou dois pixels fora da região: vale quem está a até 3 pixels dela. */
function nearRegion(region: Region, x: number, y: number): boolean {
  for (const [dx, dy] of NEAR_OFFSETS) if (inRegion(region, x + dx, y + dy)) return true;
  return false;
}

const NEAR_OFFSETS: readonly (readonly [number, number])[] = [
  [0, 0],
  [3, 0],
  [-3, 0],
  [0, 3],
  [0, -3],
  [2, 2],
  [-2, 2],
  [2, -2],
  [-2, -2],
];

function pivotOf(motion: PartMotion, box: IslandBox): { x: number; y: number } {
  const pivot = motion.pivot ?? "center";
  if (typeof pivot !== "string") return { x: pivot[0], y: pivot[1] };
  const x = box.x + box.w / 2;
  if (pivot === "base") return { x, y: box.y + box.h };
  if (pivot === "top") return { x, y: box.y };
  return { x, y: box.y + box.h / 2 };
}

function waveValue(wave: Wave | undefined, turns: number): number {
  if (!wave) return 0;
  const angle = TAU * (turns + (wave.shift ?? 0));
  const unit = wave.oneSided ? (1 - Math.cos(angle)) / 2 : Math.sin(angle);
  return wave.amp * unit;
}

export type PartPose = { dx: number; dy: number; rot: number; sx: number; sy: number };

/** Pose da parte no instante `t` (s), com o envelope `k` de 0 a 1. Com `k` 0 é a arte parada. */
export function partPose(motion: PartMotion, t: number, k = 1): PartPose {
  const turns = t / motion.period + motion.phase;
  return {
    dx: k * waveValue(motion.dx, turns),
    dy: k * waveValue(motion.dy, turns),
    rot: k * waveValue(motion.rot, turns),
    sx: 1 + k * waveValue(motion.scaleX, turns),
    sy: 1 + k * waveValue(motion.scaleY, turns),
  };
}

/** Onde um pixel da arte vai parar com uma pose (a mesma conta que o desenho faz). */
export function movePoint(
  pose: PartPose,
  pivot: { x: number; y: number },
  x: number,
  y: number,
): { x: number; y: number } {
  const ux = (x - pivot.x) * pose.sx;
  const uy = (y - pivot.y) * pose.sy;
  const cos = Math.cos(pose.rot);
  const sin = Math.sin(pose.rot);
  return {
    x: pivot.x + pose.dx + ux * cos - uy * sin,
    y: pivot.y + pose.dy + ux * sin + uy * cos,
  };
}

type Footprint = {
  pixels: Int32Array;
  box: IslandBox;
};

/** Pixels da parte mais a borda suavizada em volta, sem tomar o que já é de outra parte. */
function withEdges(
  raw: number[],
  rgba: Uint8ClampedArray,
  size: number,
  owner: Int16Array,
  index: number,
  classes: readonly ColorClass[],
  margin: number,
  region: Region,
): number[] {
  const all = raw.slice();
  const mine = new Set(raw);
  // Cor média da parte: o que fica entre ela e o vizinho (mistura da borda) também vai junto.
  let mr = 0;
  let mg = 0;
  let mb = 0;
  for (const pixel of raw) {
    mr += byteAt(rgba, pixel * 4);
    mg += byteAt(rgba, pixel * 4 + 1);
    mb += byteAt(rgba, pixel * 4 + 2);
  }
  const count = Math.max(1, raw.length);
  mr /= count;
  mg /= count;
  mb /= count;
  let frontier = raw;
  for (let ring = 0; ring < 3 + margin; ring++) {
    const next: number[] = [];
    for (const pixel of frontier) {
      const px = pixel % size;
      const py = (pixel - px) / size;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const near = ny * size + nx;
          if (mine.has(near) || owner[near] !== 0 || !nearRegion(region, nx, ny)) continue;
          const i = near * 4;
          const alpha = byteAt(rgba, i + 3);
          if (alpha <= EDGE_ALPHA) continue;
          // Entra a borda suave, o contorno escuro e as variações de cor da própria parte.
          const r = byteAt(rgba, i);
          const g = byteAt(rgba, i + 1);
          const b = byteAt(rgba, i + 2);
          const dark = 0.3 * r + 0.59 * g + 0.11 * b < 120;
          const same = classes.some(
            (color) =>
              color !== "any" && color !== "notwater" && matchesColor(color, r, g, b, true),
          );
          const blend = Math.hypot(r - mr, g - mg, b - mb) < 85;
          if (ring < 3) {
            if (alpha >= 250 && !dark && !same && !blend) continue;
            if (ring === 2 && alpha >= 250 && !dark && !blend) continue;
          }
          mine.add(near);
          owner[near] = index + 1;
          next.push(near);
          all.push(near);
        }
    }
    frontier = next;
  }
  return all;
}

function footprintOf(pixels: number[], size: number): Footprint {
  let minX = size;
  let minY = size;
  let maxX = 0;
  let maxY = 0;
  for (const pixel of pixels) {
    const x = pixel % size;
    const y = (pixel - x) / size;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    pixels: Int32Array.from(pixels),
    box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
  };
}

/** Pixels da parte que algum instante do movimento deixa de cobrir (e que o fundo precisa preencher). */
function exposedPixels(
  part: Footprint,
  pivot: { x: number; y: number },
  motion: PartMotion,
  owner: Int16Array,
  index: number,
  size: number,
): Uint8Array {
  const exposed = new Uint8Array(part.pixels.length);
  const slots = new Map<number, number>();
  part.pixels.forEach((pixel, slot) => slots.set(pixel, slot));
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && owner[y * size + x] === index + 1;
  for (const k of EXPOSURE_ENVELOPES) {
    for (let step = 0; step < EXPOSURE_TIMES; step++) {
      const t = (step / EXPOSURE_TIMES) * PLACE_CYCLE_SECONDS;
      const pose = partPose(motion, t, k);
      const cos = Math.cos(-pose.rot);
      const sin = Math.sin(-pose.rot);
      part.pixels.forEach((pixel, slot) => {
        if (exposed[slot]) return;
        const x = (pixel % size) + 0.5;
        const y = Math.floor(pixel / size) + 0.5;
        // Inversa da pose: de onde, na arte, vem o que agora está neste pixel.
        const ux = x - pivot.x - pose.dx;
        const uy = y - pivot.y - pose.dy;
        const qx = pivot.x + (ux * cos - uy * sin) / pose.sx;
        const qy = pivot.y + (ux * sin + uy * cos) / pose.sy;
        const fx = Math.floor(qx - 0.5);
        const fy = Math.floor(qy - 0.5);
        const covered =
          inside(fx, fy) && inside(fx + 1, fy) && inside(fx, fy + 1) && inside(fx + 1, fy + 1);
        if (!covered) exposed[slot] = 1;
      });
    }
  }
  // Uma folga de um pixel evita frestas na borda entre um instante e outro.
  const grown = exposed.slice();
  part.pixels.forEach((pixel, slot) => {
    if (!exposed[slot]) return;
    const px = pixel % size;
    const py = (pixel - px) / size;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const near = slots.get((py + dy) * size + px + dx);
        if (near !== undefined) grown[near] = 1;
      }
  });
  return grown;
}

const RAYS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

/** Quantas das 8 direções encontram arte sólida (que não é desta parte) antes do ar. */
function solidRays(
  rgba: Uint8ClampedArray,
  owner: Int16Array,
  index: number,
  size: number,
  x: number,
  y: number,
): number {
  let hits = 0;
  for (const [rx, ry] of RAYS) {
    for (let step = 1; step <= RAY_LENGTH; step++) {
      const nx = x + rx * step;
      const ny = y + ry * step;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) break;
      const near = ny * size + nx;
      if (owner[near] === index + 1) continue;
      if (byteAt(rgba, near * 4 + 3) >= SOLID_ALPHA) {
        hits++;
        break;
      }
    }
  }
  return hits;
}

/** Cor do entorno para cada pixel da parte: a do vizinho sólido mais próximo, em onda a partir da borda. */
function surroundingColors(
  part: Footprint,
  rgba: Uint8ClampedArray,
  owner: Int16Array,
  index: number,
  size: number,
): Map<number, [number, number, number]> {
  const colors = new Map<number, [number, number, number]>();
  const mine = new Set<number>(part.pixels);
  let frontier: number[] = [];
  const claim = (pixel: number, color: [number, number, number]) => {
    colors.set(pixel, color);
    frontier.push(pixel);
  };
  for (const pixel of part.pixels) {
    const px = pixel % size;
    const py = (pixel - px) / size;
    let best: [number, number, number] | null = null;
    for (let dy = -1; dy <= 1 && !best; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const near = ny * size + nx;
        if (mine.has(near) || owner[near] !== 0 || byteAt(rgba, near * 4 + 3) < SOLID_ALPHA)
          continue;
        best = [byteAt(rgba, near * 4), byteAt(rgba, near * 4 + 1), byteAt(rgba, near * 4 + 2)];
        break;
      }
    if (best) claim(pixel, best);
  }
  while (frontier.length > 0) {
    const grown: number[] = [];
    for (const pixel of frontier) {
      const color = colors.get(pixel);
      if (!color) continue;
      const px = pixel % size;
      const py = (pixel - px) / size;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const near = (py + dy) * size + px + dx;
          if (mine.has(near) && !colors.has(near)) {
            colors.set(near, color);
            grown.push(near);
          }
        }
    }
    frontier = grown;
  }
  return colors;
}

/** Recorta as partes da arte e calcula o que o fundo mostra quando elas saem do lugar. */
export function analyzePlace(rgba: Uint8ClampedArray, size: number, rig: PlaceRig): PlaceModel {
  const owner = new Int16Array(size * size);
  const missing: string[] = [];
  const raws: number[][] = [];
  rig.parts.forEach((spec, index) => {
    const raw = flood(rgba, size, spec.seeds, spec, (pixel) => owner[pixel] !== 0);
    for (const pixel of raw) owner[pixel] = index + 1;
    if (raw.length === 0) missing.push(spec.id);
    raws.push(raw);
  });

  const parts: PartModel[] = [];
  const footprints: Footprint[] = [];
  rig.parts.forEach((spec, index) => {
    const raw = raws[index] ?? [];
    if (raw.length === 0) {
      footprints.push({ pixels: new Int32Array(0), box: { x: 0, y: 0, w: 0, h: 0 } });
      parts.push({
        id: spec.id,
        box: { x: 0, y: 0, w: 0, h: 0 },
        motion: spec.motion,
        pivot: { x: 0, y: 0 },
        glow: false,
        area: 0,
      });
      return;
    }
    const classes = spec.seeds.map((seed) => seed.color);
    const footprint = footprintOf(
      withEdges(raw, rgba, size, owner, index, classes, spec.margin ?? 0, spec),
      size,
    );
    footprints.push(footprint);
    parts.push({
      id: spec.id,
      box: footprint.box,
      motion: spec.motion,
      pivot: pivotOf(spec.motion, footprint.box),
      glow: spec.glow === true,
      area: raw.length,
    });
  });

  const fillIndex: number[] = [];
  const fillColor: number[] = [];
  const clearIndex: number[] = [];
  rig.parts.forEach((spec, index) => {
    const footprint = footprints[index];
    const part = parts[index];
    if (!footprint || !part || footprint.pixels.length === 0) return;
    const exposed = exposedPixels(footprint, part.pivot, spec.motion, owner, index, size);
    const colors = surroundingColors(footprint, rgba, owner, index, size);
    const mode = spec.fill ?? "auto";
    footprint.pixels.forEach((pixel, slot) => {
      if (!exposed[slot]) {
        // Sempre coberto: sai do fundo (a parte desenha o seu lugar inteiro).
        clearIndex.push(pixel);
        return;
      }
      const x = pixel % size;
      const y = (pixel - x) / size;
      const color = colors.get(pixel);
      const solid =
        mode === "solid" || (mode === "auto" && solidRays(rgba, owner, index, size, x, y) >= 5);
      if (solid && color) {
        fillIndex.push(pixel);
        fillColor.push(color[0], color[1], color[2], 255);
      } else {
        clearIndex.push(pixel);
      }
    });
  });

  let water: Uint8Array | null = null;
  if (rig.water) {
    const pixels = flood(rgba, size, rig.water.seeds, rig.water, () => false);
    if (pixels.length === 0) missing.push("water");
    water = new Uint8Array(size * size);
    for (const pixel of pixels) water[pixel] = 1;
    // A borda suave também reflete: um pixel de folga em volta, só onde ainda há arte.
    for (const pixel of pixels) {
      const px = pixel % size;
      const py = (pixel - px) / size;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const near = ny * size + nx;
          if (!water[near] && owner[near] === 0 && byteAt(rgba, near * 4 + 3) > 200) {
            const i = near * 4;
            if (matchesColor("water", byteAt(rgba, i), byteAt(rgba, i + 1), byteAt(rgba, i + 2)))
              water[near] = 1;
          }
        }
    }
  }

  return {
    parts,
    partMask: owner,
    fillIndex: Int32Array.from(fillIndex),
    fillColor: Uint8ClampedArray.from(fillColor),
    clearIndex: Int32Array.from(clearIndex),
    water,
    missing,
  };
}
