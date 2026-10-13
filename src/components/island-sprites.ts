import {
  ISLAND_CYCLE_SECONDS,
  glowPulse,
  groupPose,
  moteState,
  pieceOffset,
  sparkIntensity,
  sweepProgress,
  type IslandModel,
  type FloatingPiece,
} from "../domain/island-motion";
import { movePoint, partPose, type PartModel, type PlaceRig } from "../domain/place-rig";
import { analyzeOffThread, type IslandAnalyzer } from "./island-analyzer";

const TAU = Math.PI * 2;
/** Margem em volta da arte, em fração do lado: cabe o brilho sem cortar. */
const PADDING_RATIO = 0.05;
/** Pivô do flutuar, em fração da arte: perto da base, para a ilha subir e descer inteira. */
const PIVOT = { x: 0.5, y: 0.875 };

export type IslandSprites = {
  model: IslandModel;
  size: number;
  padding: number;
  /** Lado do canvas lógico: arte mais a margem dos dois lados. */
  logicalSize: number;
  main: HTMLCanvasElement;
  pieces: { piece: FloatingPiece; canvas: HTMLCanvasElement }[];
  gold: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  glowPadding: number;
  sweep: HTMLCanvasElement;
  /** Partes móveis recortadas da arte (lugares da ilha), na ordem em que são desenhadas. */
  parts: { part: PartModel; canvas: HTMLCanvasElement }[];
  /** A arte inteira parada, só para o reflexo de luz cobrir também o que se mexe. */
  outline: HTMLCanvasElement | null;
  /** Máscara da água recortada na sua caixa, ou `null`. */
  water: HTMLCanvasElement | null;
  waterBox: { x: number; y: number; w: number; h: number };
  /** Folha onde o reflexo da água é desenhado a cada quadro. */
  shimmer: HTMLCanvasElement | null;
};

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Monta as camadas a partir da arte já decodificada. Devolve `null` se o navegador não desenha em canvas. */
export async function buildIslandSprites(
  image: HTMLImageElement,
  size: number,
  analyze: IslandAnalyzer = analyzeOffThread,
  rig?: PlaceRig,
): Promise<IslandSprites | null> {
  const source = makeCanvas(size, size);
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return null;
  sourceContext.drawImage(image, 0, 0, size, size);
  const rgba = sourceContext.getImageData(0, 0, size, size).data;
  const model = await analyze(rgba, size, rig);
  const place = model.place;

  const paint = (
    label: (value: number, index: number) => boolean,
    box?: { x: number; y: number; w: number; h: number },
  ) => {
    const x0 = box?.x ?? 0;
    const y0 = box?.y ?? 0;
    const w = box?.w ?? size;
    const h = box?.h ?? size;
    const canvas = makeCanvas(w, h);
    const image = new ImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue;
        const k = gy * size + gx;
        if (!label(model.labels[k] ?? -1, k)) continue;
        const from = k * 4;
        const to = (y * w + x) * 4;
        for (let channel = 0; channel < 4; channel++)
          image.data[to + channel] = rgba[from + channel] ?? 0;
      }
    canvas.getContext("2d")?.putImageData(image, 0, 0);
    return canvas;
  };

  const main = paint((label, index) => label === 0 && !place?.partMask[index]);
  if (place) {
    // O que a saída de uma parte revela: o entorno, em cima do recorte que ela deixou.
    const mainContext = main.getContext("2d");
    if (mainContext) {
      const fills = new ImageData(size, size);
      for (let slot = 0; slot < place.fillIndex.length; slot++) {
        const target = (place.fillIndex[slot] ?? 0) * 4;
        for (let channel = 0; channel < 4; channel++)
          fills.data[target + channel] = place.fillColor[slot * 4 + channel] ?? 0;
      }
      const layer = makeCanvas(size, size);
      layer.getContext("2d")?.putImageData(fills, 0, 0);
      mainContext.drawImage(layer, 0, 0);
    }
  }
  const parts = (place?.parts ?? []).map((part, index) => ({
    part,
    canvas: paint(
      (_label, pixel) => place?.partMask[pixel] === index + 1,
      part.area > 0 ? part.box : { x: 0, y: 0, w: 1, h: 1 },
    ),
  }));
  const outline = place ? paint((label) => label === 0) : null;
  let water: HTMLCanvasElement | null = null;
  let waterBox = { x: 0, y: 0, w: 1, h: 1 };
  if (place?.water) {
    let minX = size;
    let minY = size;
    let maxX = 0;
    let maxY = 0;
    for (let k = 0; k < place.water.length; k++) {
      if (!place.water[k]) continue;
      const x = k % size;
      const y = (k - x) / size;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (maxX >= minX) {
      waterBox = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      const mask = new ImageData(waterBox.w, waterBox.h);
      for (let y = 0; y < waterBox.h; y++)
        for (let x = 0; x < waterBox.w; x++)
          if (place.water[(waterBox.y + y) * size + waterBox.x + x])
            mask.data[(y * waterBox.w + x) * 4 + 3] = 255;
      water = makeCanvas(waterBox.w, waterBox.h);
      water.getContext("2d")?.putImageData(mask, 0, 0);
    }
  }
  const pieces = model.pieces.map((piece) => ({
    piece,
    canvas: paint((label) => label === piece.label, piece.box),
  }));

  const goldCanvas = makeCanvas(size, size);
  const goldImage = new ImageData(size, size);
  for (let k = 0; k < model.gold.length; k++) {
    if (!model.gold[k] || place?.partMask[k]) continue;
    const i = k * 4;
    goldImage.data[i] = rgba[i] ?? 0;
    goldImage.data[i + 1] = rgba[i + 1] ?? 0;
    goldImage.data[i + 2] = rgba[i + 2] ?? 0;
    goldImage.data[i + 3] = 255;
  }
  goldCanvas.getContext("2d")?.putImageData(goldImage, 0, 0);

  // Brilho: o ouro desenhado fora da tela, com a sombra (desfoque) caindo dentro dela.
  const glowPadding = Math.round(size * PADDING_RATIO * 0.9);
  const glow = makeCanvas(size + glowPadding * 2, size + glowPadding * 2);
  const glowContext = glow.getContext("2d");
  if (glowContext) {
    const off = 4000;
    glowContext.shadowColor = "rgba(255, 196, 44, 1)";
    glowContext.shadowBlur = (26 * size) / 800;
    glowContext.shadowOffsetX = off;
    for (let pass = 0; pass < 2; pass++)
      glowContext.drawImage(goldCanvas, glowPadding - off, glowPadding);
  }

  const padding = Math.round(size * PADDING_RATIO);
  return {
    model,
    size,
    padding,
    logicalSize: size + padding * 2,
    main,
    pieces,
    gold: goldCanvas,
    glow,
    glowPadding,
    sweep: makeCanvas(size, size),
    parts,
    outline,
    water,
    waterBox,
    shimmer: water ? makeCanvas(waterBox.w, waterBox.h) : null,
  };
}

function drawSparkle(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  g.save();
  g.translate(x, y);
  g.rotate(rotation);
  g.globalAlpha = alpha;
  g.globalCompositeOperation = "lighter";
  const halo = g.createRadialGradient(0, 0, 0, 0, 0, radius * 1.4);
  halo.addColorStop(0, "rgba(255,244,190,0.85)");
  halo.addColorStop(1, "rgba(255,200,60,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(0, 0, radius * 1.4, 0, TAU);
  g.fill();
  g.fillStyle = "#fffbe6";
  for (const angle of [0, Math.PI / 2]) {
    g.save();
    g.rotate(angle);
    g.beginPath();
    g.moveTo(0, -radius);
    g.lineTo(radius * 0.16, 0);
    g.lineTo(0, radius);
    g.lineTo(-radius * 0.16, 0);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.restore();
}

function drawMote(g: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
  if (alpha <= 0.01) return;
  g.save();
  g.translate(x, y);
  g.globalAlpha = alpha;
  g.fillStyle = "#facc15";
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size * 0.7, 0);
  g.lineTo(0, size);
  g.lineTo(-size * 0.7, 0);
  g.closePath();
  g.fill();
  g.fillStyle = "#ffe88d";
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size * 0.7, 0);
  g.lineTo(0, 0);
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * Reflexos que correm pela água: dois jogos de riscos pontilhados em sentidos opostos, cortados
 * pela máscara da água. Os deslocamentos são múltiplos exatos do espaçamento, então o ciclo fecha.
 */
function drawWater(g: CanvasRenderingContext2D, sprites: IslandSprites, t: number, k: number) {
  const { water, shimmer, size, padding, waterBox } = sprites;
  const context = shimmer?.getContext("2d");
  if (!water || !shimmer || !context) return;
  const unit = size / 800;
  const progress =
    (((t % ISLAND_CYCLE_SECONDS) + ISLAND_CYCLE_SECONDS) % ISLAND_CYCLE_SECONDS) /
    ISLAND_CYCLE_SECONDS;
  const gap = 34 * unit;
  const dash = [16 * unit, 20 * unit];
  context.globalCompositeOperation = "source-over";
  context.clearRect(0, 0, waterBox.w, waterBox.h);
  context.lineCap = "round";
  context.lineWidth = 3.2 * unit;
  const lines = (direction: number, drift: number, alpha: number) => {
    context.strokeStyle = `rgba(196, 232, 255, ${alpha})`;
    context.setLineDash(dash);
    context.lineDashOffset = direction * progress * (dash[0]! + dash[1]!);
    const reach = waterBox.w * 0.5 + gap;
    for (let c = -reach - gap; c < waterBox.h + gap; c += gap) {
      const y0 = c + drift * progress * gap;
      context.beginPath();
      context.moveTo(-20, y0 - 10);
      context.lineTo(waterBox.w + 20, y0 + (waterBox.w + 40) * 0.5 - 10);
      context.stroke();
    }
  };
  lines(1, 1, 0.55);
  lines(-1, -1, 0.3);
  context.setLineDash([]);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(water, 0, 0);
  g.save();
  g.globalCompositeOperation = "screen";
  g.globalAlpha = 0.5 * k;
  g.drawImage(shimmer, padding + waterBox.x, padding + waterBox.y);
  g.restore();
}

/**
 * Desenha um quadro. `k` (0 a 1) é o envelope da animação: com 0 o desenho é exatamente a arte
 * parada, e a animação entra e sai por ele, sem saltos. `deviceScale` leva o canvas lógico aos
 * pixels reais da tela.
 */
export function drawIsland(
  g: CanvasRenderingContext2D,
  sprites: IslandSprites,
  t: number,
  k: number,
  deviceScale = 1,
) {
  const { size, padding, logicalSize, model } = sprites;
  const unit = size / 800;
  g.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  g.clearRect(0, 0, logicalSize, logicalSize);
  const pose = model.group ? groupPose(t, k) : { bob: 0, rotation: 0, scale: 1 };
  const px = padding + size * PIVOT.x;
  const py = padding + size * PIVOT.y;
  g.save();
  g.translate(px, py + pose.bob * unit);
  if (pose.rotation) g.rotate(pose.rotation);
  if (pose.scale !== 1) g.scale(pose.scale, pose.scale);
  g.translate(-px, -py);

  // Peças soltas, atrás da ilha, presas ao mesmo flutuar.
  for (const { piece, canvas } of sprites.pieces) {
    const { dx, dy } = pieceOffset(piece, t, k);
    g.drawImage(canvas, padding + piece.box.x + dx, padding + piece.box.y + dy);
  }
  g.drawImage(sprites.main, padding, padding);
  if (sprites.water && sprites.shimmer && k > 0.001) drawWater(g, sprites, t, k);
  for (const { part, canvas } of sprites.parts) {
    if (part.area === 0) continue;
    const pose = partPose(part.motion, t, k);
    g.save();
    g.translate(padding + part.pivot.x + pose.dx * unit, padding + part.pivot.y + pose.dy * unit);
    if (pose.rot) g.rotate(pose.rot);
    if (pose.sx !== 1 || pose.sy !== 1) g.scale(pose.sx, pose.sy);
    g.translate(-part.pivot.x, -part.pivot.y);
    g.drawImage(canvas, part.box.x, part.box.y);
    if (part.glow && k > 0.001) {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = (0.04 + 0.2 * glowPulse(t - part.motion.phase * part.motion.period)) * k;
      g.drawImage(canvas, part.box.x, part.box.y);
    }
    g.restore();
  }

  if (k > 0.001) {
    const pulse = glowPulse(t);
    g.save();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = (0.1 + 0.24 * pulse) * k;
    g.drawImage(sprites.glow, padding - sprites.glowPadding, padding - sprites.glowPadding);
    g.globalAlpha = (0.04 + 0.12 * pulse) * k;
    g.drawImage(sprites.gold, padding, padding);
    g.restore();

    const progress = sweepProgress(t);
    if (progress !== null) {
      const sweep = sprites.sweep.getContext("2d");
      if (sweep) {
        sweep.globalCompositeOperation = "source-over";
        sweep.clearRect(0, 0, size, size);
        const along = (-260 + progress * 1320) * unit;
        const half = 120 * unit;
        const slope = 55 * unit;
        const gradient = sweep.createLinearGradient(
          along - half,
          along - half + slope,
          along + half,
          along + half - slope,
        );
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.5, "rgba(255,250,235,0.62)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        sweep.fillStyle = gradient;
        sweep.fillRect(0, 0, size, size);
        sweep.globalCompositeOperation = "destination-in";
        sweep.drawImage(sprites.outline ?? sprites.main, 0, 0);
        g.save();
        g.globalCompositeOperation = "screen";
        g.globalAlpha = Math.sin(Math.PI * progress) * k;
        g.drawImage(sprites.sweep, padding, padding);
        g.restore();
      }
    }
    for (const spark of model.sparks) {
      const e = sparkIntensity(spark, t);
      // A faísca de uma parte móvel anda junto com ela.
      const carrier = spark.part >= 0 ? sprites.parts[spark.part]?.part : undefined;
      let sx = spark.x;
      let sy = spark.y;
      if (carrier && carrier.area > 0) {
        const pose = partPose(carrier.motion, t, k);
        const moved = movePoint(
          { ...pose, dx: pose.dx * unit, dy: pose.dy * unit },
          carrier.pivot,
          spark.x,
          spark.y,
        );
        sx = moved.x;
        sy = moved.y;
      }
      drawSparkle(
        g,
        padding + sx,
        padding + sy,
        spark.radius * unit * (0.6 + 0.6 * e),
        0.35 * e,
        e * k,
      );
    }
    for (const mote of model.motes) {
      const state = moteState(mote, t);
      drawMote(g, padding + state.x, padding + state.y, mote.size, state.alpha * k);
    }
  }
  g.restore();
}

/** Quanto um ponto da arte (em pixels da arte) se desloca com a pose do grupo: serve ao avatar. */
export function groupDelta(
  t: number,
  k: number,
  size: number,
  x: number,
  y: number,
): { dx: number; dy: number } {
  const pose = groupPose(t, k);
  const unit = size / 800;
  const cx = size * PIVOT.x;
  const cy = size * PIVOT.y;
  const rx = (x - cx) * pose.scale;
  const ry = (y - cy) * pose.scale;
  const cos = Math.cos(pose.rotation);
  const sin = Math.sin(pose.rotation);
  return { dx: cx + rx * cos - ry * sin - x, dy: cy + rx * sin + ry * cos + pose.bob * unit - y };
}
