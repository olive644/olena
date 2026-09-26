import type { HandwritingPoint } from "../domain/handwriting";

// Reconhecimento de formas para o "segurar para acertar": quando a caneta para no fim de um
// traço, uma reta, uma elipse, um retângulo ou um triângulo feitos à mão livre viram a forma
// perfeita. Só a regra fica aqui; o editor decide quando chamar.

export type ShapeKind = "line" | "ellipse" | "rectangle" | "triangle";
export type RecognizedShape = { kind: ShapeKind; points: HandwritingPoint[] };

// Comprimento mínimo do traço (unidades da folha) para valer como forma. Abaixo disso é letra.
const MIN_PATH = 90;
// Espaçamento das amostras do traço gerado, para a tinta ficar lisa como a de um traço normal.
const SPACING = 6;

type Vec = { x: number; y: number };

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

function pathLength(points: readonly Vec[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1)
    total += dist(points[index - 1]!, points[index]!);
  return total;
}

function boundsOf(points: readonly Vec[]) {
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
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function distanceToSegment(point: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return dist(point, a);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return dist(point, { x: a.x + t * dx, y: a.y + t * dy });
}

// Distância média (e máxima) dos pontos a uma linha poligonal.
function polylineResidual(points: readonly Vec[], polyline: readonly Vec[]) {
  let sum = 0;
  let max = 0;
  for (const point of points) {
    let best = Infinity;
    for (let index = 1; index < polyline.length; index += 1) {
      best = Math.min(best, distanceToSegment(point, polyline[index - 1]!, polyline[index]!));
    }
    sum += best;
    max = Math.max(max, best);
  }
  return { mean: sum / points.length, max };
}

// Simplificação de Douglas-Peucker.
function simplify(points: readonly Vec[], epsilon: number): Vec[] {
  if (points.length < 3) return [...points];
  const first = points[0]!;
  const last = points.at(-1)!;
  let index = 0;
  let farthest = 0;
  for (let cursor = 1; cursor < points.length - 1; cursor += 1) {
    const d = distanceToSegment(points[cursor]!, first, last);
    if (d > farthest) {
      farthest = d;
      index = cursor;
    }
  }
  if (farthest <= epsilon) return [first, last];
  const left = simplify(points.slice(0, index + 1), epsilon);
  const right = simplify(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

function densify(vertices: readonly Vec[], pressure: number, closed: boolean): HandwritingPoint[] {
  const path = closed ? [...vertices, vertices[0]!] : [...vertices];
  const result: HandwritingPoint[] = [];
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]!;
    const to = path[index]!;
    const steps = Math.max(1, Math.round(dist(from, to) / SPACING));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      result.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, pressure });
    }
  }
  const end = path.at(-1)!;
  result.push({ x: end.x, y: end.y, pressure });
  return result;
}

function averagePressure(points: readonly HandwritingPoint[]): number {
  return points.reduce((sum, point) => sum + point.pressure, 0) / points.length || 0.5;
}

export function recognizeShape(points: readonly HandwritingPoint[]): RecognizedShape | null {
  if (points.length < 8) return null;
  const length = pathLength(points);
  if (length < MIN_PATH) return null;
  const first = points[0]!;
  const last = points.at(-1)!;
  const box = boundsOf(points);
  const diagonal = Math.hypot(box.width, box.height);
  const pressure = averagePressure(points);

  // Reta: o traço quase não se afasta da corda entre os extremos.
  const chord = dist(first, last);
  if (chord >= MIN_PATH && chord / length > 0.9) {
    const deviation = polylineResidual(points, [first, last]);
    if (deviation.max <= chord * 0.07) {
      return { kind: "line", points: densify([first, last], pressure, false) };
    }
  }

  // Formas fechadas: o fim volta perto do começo.
  if (chord > diagonal * 0.3) return null;
  if (box.width < 40 || box.height < 40) return null;

  const candidates: { kind: ShapeKind; vertices: Vec[]; score: number }[] = [];
  const perimeter = pathLength([...points, first]);

  // Retângulo: os pontos ficam sobre o contorno da caixa.
  const rectangle: Vec[] = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY },
    { x: box.minX, y: box.minY },
  ];
  const rectangleFit = polylineResidual(points, rectangle);
  const rectangleScore = rectangleFit.mean / Math.min(box.width, box.height);
  if (rectangleFit.mean <= Math.min(box.width, box.height) * 0.07) {
    candidates.push({ kind: "rectangle", vertices: rectangle.slice(0, 4), score: rectangleScore });
  }

  // Triângulo: três vértices que descrevem o contorno.
  const closedPath = [...points, first];
  const triangle = simplify(closedPath, diagonal * 0.09);
  if (triangle.length === 4) {
    const vertices = triangle.slice(0, 3);
    const fit = polylineResidual(points, [...vertices, vertices[0]!]);
    if (fit.mean <= diagonal * 0.035) {
      candidates.push({ kind: "triangle", vertices, score: fit.mean / diagonal });
    }
  }

  // Elipse: cada ponto tem "raio normalizado" perto de 1 em relação à caixa.
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const rx = box.width / 2;
  const ry = box.height / 2;
  let ellipseError = 0;
  for (const point of points) {
    ellipseError += Math.abs(Math.hypot((point.x - cx) / rx, (point.y - cy) / ry) - 1);
  }
  ellipseError /= points.length;
  // Um contorno de elipse tem comprimento parecido com o perímetro de Ramanujan.
  const expected = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const lengthRatio = perimeter / expected;
  if (ellipseError <= 0.09 && lengthRatio > 0.8 && lengthRatio < 1.25) {
    const ring: Vec[] = Array.from({ length: 72 }, (_, index) => {
      const angle = (index / 72) * Math.PI * 2;
      return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
    });
    candidates.push({ kind: "ellipse", vertices: ring, score: ellipseError * 0.6 });
  }

  const best = candidates.sort((a, b) => a.score - b.score)[0];
  if (!best) return null;
  return { kind: best.kind, points: densify(best.vertices, pressure, true) };
}
