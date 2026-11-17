import type { HandwritingPoint } from "../domain/handwriting";

// Rabiscar para apagar: riscar a escrita em zigue-zague com a própria caneta apaga os traços que
// ficam por baixo, como no Apple Notes, no Goodnotes ("Scribble to Erase") e no Notewise. O que
// esses apps e as patentes sobre o gesto têm em comum, e o que vale aqui:
//  - O gesto é um zigue-zague: várias idas e vindas (as patentes contam mudanças de direção).
//  - Só vale se o rabisco cobre tinta que já existe. Num lugar vazio é um traço comum (sombreado,
//    hachura), senão ninguém conseguiria desenhar um zigue-zague.
//  - Apaga o traço inteiro que está por baixo, não só o pedaço tocado.
//  - A queixa mais comum dos usuários é cursiva emendada tomada por rabisco. Por isso o rabisco
//    precisa de idas e vindas LONGAS em relação ao próprio tamanho: laços de letra voltam só um
//    pouco e deixam o traço andando para a frente.
//  - Dá para desligar, e desfazer volta tudo (o editor já guarda o passo antes do traço).

/** Menor diagonal da caixa do rabisco, em unidades da folha (a folha tem 1200 de largura). */
const MIN_DIAGONAL = 36;
/** O caminho percorrido precisa ser pelo menos isto vezes a diagonal: várias passadas. */
const MIN_PATH_RATIO = 3;
/** Voltas de direção ao longo do eixo principal: 4 voltas são 5 passadas. */
const MIN_REVERSALS = 4;
/** A passada mediana precisa cobrir ao menos esta fração da extensão do rabisco. */
const MIN_SWING_FRACTION = 0.5;
/** E ao menos isto em unidades da folha. */
const MIN_SWING = 10;
/** Fração do traço de baixo que precisa estar sob o rabisco para ele sair. */
const MIN_COVERED = 0.6;
const MIN_REACH = 7;
const MAX_REACH = 22;

export type Scribble = {
  /** Distância até a linha do rabisco abaixo da qual a tinta conta como riscada. */
  reach: number;
  /** Quantidade de idas e vindas. */
  reversals: number;
};

function pathLength(points: readonly HandwritingPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1)
    length += Math.hypot(
      points[index]!.x - points[index - 1]!.x,
      points[index]!.y - points[index - 1]!.y,
    );
  return length;
}

/** O traço é um zigue-zague de rabiscar? Não olha o que está por baixo. */
export function recognizeScribble(points: readonly HandwritingPoint[]): Scribble | null {
  if (points.length < 12) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const diagonal = Math.hypot(maxX - minX, maxY - minY);
  if (diagonal < MIN_DIAGONAL) return null;
  if (pathLength(points) < diagonal * MIN_PATH_RATIO) return null;

  // Eixo principal: direção em que os pontos mais se espalham.
  let cx = 0;
  let cy = 0;
  for (const point of points) {
    cx += point.x;
    cy += point.y;
  }
  cx /= points.length;
  cy /= points.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const point of points) {
    const dx = point.x - cx;
    const dy = point.y - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const along = points.map((point) => (point.x - cx) * ux + (point.y - cy) * uy);
  const cross = points.map((point) => -(point.x - cx) * uy + (point.y - cy) * ux);
  const range = Math.max(...along) - Math.min(...along);
  if (range < MIN_DIAGONAL * 0.6) return null;

  // Voltas de direção ao longo do eixo, com histerese: só conta quando a volta passa de um limiar.
  const hysteresis = Math.max(6, range * 0.2);
  const extremes: number[] = [along[0]!];
  let direction = 0;
  let current = along[0]!;
  for (const value of along) {
    if (direction === 0) {
      if (value - current >= hysteresis) {
        direction = 1;
        current = value;
      } else if (current - value >= hysteresis) {
        direction = -1;
        current = value;
      }
    } else if (direction === 1) {
      if (value > current) current = value;
      else if (current - value >= hysteresis) {
        extremes.push(current);
        direction = -1;
        current = value;
      }
    } else if (value < current) current = value;
    else if (value - current >= hysteresis) {
      extremes.push(current);
      direction = 1;
      current = value;
    }
  }
  extremes.push(current);
  const reversals = extremes.length - 2;
  if (reversals < MIN_REVERSALS) return null;
  // Passadas inteiras: as de cada ponta são parciais e não entram na mediana.
  const swings: number[] = [];
  for (let index = 1; index < extremes.length - 2; index += 1)
    swings.push(Math.abs(extremes[index + 1]! - extremes[index]!));
  if (swings.length === 0) return null;
  swings.sort((a, b) => a - b);
  const median = swings[Math.floor(swings.length / 2)]!;
  if (median < Math.max(MIN_SWING, range * MIN_SWING_FRACTION)) return null;

  // Alcance da tinta riscada: perto do espaçamento entre passadas, dentro de limites.
  const crossExtent = Math.max(...cross) - Math.min(...cross);
  const reach = Math.min(MAX_REACH, Math.max(MIN_REACH, (crossExtent / reversals) * 0.75));
  return { reach, reversals };
}

function distanceToPath(x: number, y: number, path: readonly { x: number; y: number }[]): number {
  let best = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1]!;
    const b = path[index]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
    best = Math.min(best, Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)));
  }
  return best;
}

type Inked = { id: string; points: readonly HandwritingPoint[]; cover?: true };

/**
 * Ids dos traços que ficam por baixo do rabisco: aqueles em que pelo menos 60% do comprimento está
 * a menos de `reach` da linha do rabisco. Traço de fundo apagado (`cover`) nunca é alvo. Lista
 * vazia quer dizer que o rabisco não cobriu nada e deve ficar como traço comum.
 */
export function scribbleTargets(
  scribble: readonly HandwritingPoint[],
  strokes: readonly Inked[],
  reach: number,
  ignoreId?: string,
): string[] {
  const xs = scribble.map((point) => point.x);
  const ys = scribble.map((point) => point.y);
  const left = Math.min(...xs) - reach;
  const right = Math.max(...xs) + reach;
  const top = Math.min(...ys) - reach;
  const bottom = Math.max(...ys) + reach;
  const targets: string[] = [];
  for (const stroke of strokes) {
    if (stroke.id === ignoreId || stroke.cover || stroke.points.length === 0) continue;
    // Amostras do traço a cada ~3 unidades, para a fração valer por comprimento e não por ponto.
    const samples: { x: number; y: number }[] = [];
    const points = stroke.points;
    samples.push({ x: points[0]!.x, y: points[0]!.y });
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1]!;
      const b = points[index]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
      for (let step = 1; step <= steps; step += 1)
        samples.push({
          x: a.x + ((b.x - a.x) * step) / steps,
          y: a.y + ((b.y - a.y) * step) / steps,
        });
    }
    if (!samples.some((p) => p.x >= left && p.x <= right && p.y >= top && p.y <= bottom)) continue;
    const covered = samples.filter((p) => distanceToPath(p.x, p.y, scribble) <= reach).length;
    if (covered / samples.length >= MIN_COVERED) targets.push(stroke.id);
  }
  return targets;
}
