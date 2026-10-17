import type { HandwritingPoint } from "../domain/handwriting";

// Reconhecimento de formas para o "segurar para acertar": quando a caneta para no fim de um
// traço, uma reta, uma elipse, um retângulo ou um triângulo feitos à mão livre viram a forma
// perfeita. Só a regra fica aqui; o editor decide quando chamar.

export type ShapeKind = "line" | "ellipse" | "rectangle" | "triangle" | "polygon" | "arrow";
export type RecognizedShape = { kind: ShapeKind; points: HandwritingPoint[] };

// Comprimento mínimo do traço (unidades da folha) para valer como forma. Abaixo disso é letra.
const MIN_PATH = 90;
// Espaçamento das amostras do traço gerado, para a tinta ficar lisa como a de um traço normal.
const SPACING = 6;
// Uma reta, o cabo de uma seta ou um retângulo que fogem do eixo por menos que isso (em graus)
// são tidos como horizontais ou verticais, que é o que a mão quis fazer.
const AXIS_SNAP_DEGREES = 5;
const AXIS_SNAP = (AXIS_SNAP_DEGREES * Math.PI) / 180;

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

function cross(origin: Vec, a: Vec, b: Vec): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function segmentsCross(a: Vec, b: Vec, c: Vec, d: Vec): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0;
}

// Descarta vértices quase colados um no outro (inclui o ponto de fechamento, que raramente
// cai bem em cima do início): sem isso um cantinho de nada vira lado, e um lado curtíssimo
// perto do fechamento pode até parecer, por erro numérico, um cruzamento com outro lado.
function dedupeVertices(vertices: readonly Vec[], tolerance: number): Vec[] {
  const out: Vec[] = [];
  for (const vertex of vertices) {
    const last = out.at(-1);
    if (!last || dist(last, vertex) > tolerance) out.push(vertex);
  }
  if (out.length > 1 && dist(out[0]!, out.at(-1)!) <= tolerance) out.pop();
  return out;
}

// Um polígono de verdade não cruza os próprios lados; um rabisco em zigue-zague, sim.
function isSimplePolygon(vertices: readonly Vec[]): boolean {
  const count = vertices.length;
  for (let i = 0; i < count; i += 1) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % count]!;
    for (let j = i + 1; j < count; j += 1) {
      if (j === i || j === i + 1 || (j + 1) % count === i) continue;
      if (segmentsCross(a, b, vertices[j]!, vertices[(j + 1) % count]!)) return false;
    }
  }
  return true;
}

// Encaixa `to` no eixo mais próximo em torno de `from`, mantendo o comprimento, quando o desvio é
// de até AXIS_SNAP. O ponto de partida é o que a pessoa escolheu, por isso é ele o pivô. Fora da
// tolerância devolve o próprio `to`, sem tocar (a igualdade de referência diz se houve encaixe).
function snapToAxis(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return to;
  const angle = Math.atan2(dy, dx);
  const quarter = Math.PI / 2;
  const nearest = Math.round(angle / quarter) * quarter;
  if (Math.abs(angle - nearest) > AXIS_SNAP) return to;
  return {
    x: from.x + Math.round(Math.cos(nearest)) * length,
    y: from.y + Math.round(Math.sin(nearest)) * length,
  };
}

// Menor retângulo (por área) que contém os pontos, em qualquer ângulo. `tilt` é o desvio, em
// graus, do eixo mais próximo (0 a 45).
function orientedRectangle(points: readonly Vec[]) {
  let best = { area: Infinity, degrees: 0 };
  for (let degrees = 0; degrees < 90; degrees += 0.5) {
    const radians = (degrees * Math.PI) / 180;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const point of points) {
      const u = point.x * c + point.y * s;
      const v = -point.x * s + point.y * c;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const area = (maxU - minU) * (maxV - minV);
    if (area < best.area) best = { area, degrees };
  }
  const radians = (best.degrees * Math.PI) / 180;
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const point of points) {
    const u = point.x * c + point.y * s;
    const v = -point.x * s + point.y * c;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }
  const corner = (u: number, v: number): Vec => ({ x: u * c - v * s, y: u * s + v * c });
  return {
    corners: [corner(minU, minV), corner(maxU, minV), corner(maxU, maxV), corner(minU, maxV)],
    width: maxU - minU,
    height: maxV - minV,
    tilt: Math.min(best.degrees, 90 - best.degrees),
  };
}

// Menor diferença angular entre dois ângulos (em radianos, sempre entre 0 e π).
function angleDelta(a: number, b: number): number {
  const delta = Math.abs(a - b) % (Math.PI * 2);
  return delta > Math.PI ? Math.PI * 2 - delta : delta;
}

// Seta: cabo reto até a ponta e, sem levantar a caneta, duas farpas em V voltando da
// ponta. É o jeito natural de desenhar uma seta à mão: ida, farpa de um lado, volta à
// ponta, farpa do outro lado.
function recognizeArrow(
  points: readonly HandwritingPoint[],
  length: number,
): RecognizedShape | null {
  const epsilon = Math.max(8, length * 0.035);
  const simplified = simplify(points, epsilon);
  if (simplified.length !== 5) return null;
  const [tail, headA, barbA, headB, barbB] = simplified as [Vec, Vec, Vec, Vec, Vec];
  const shaftLength = dist(tail, headA);
  if (shaftLength < MIN_PATH * 0.6 || dist(headA, headB) > shaftLength * 0.2) return null;
  const barbALength = dist(headA, barbA);
  const barbBLength = dist(headB, barbB);
  const shortestBarb = Math.min(barbALength, barbBLength);
  const longestBarb = Math.max(barbALength, barbBLength);
  if (shortestBarb < shaftLength * 0.1 || longestBarb > shaftLength * 0.8) return null;
  if (longestBarb / shortestBarb > 2.6) return null;
  const shaftAngle = Math.atan2(headA.y - tail.y, headA.x - tail.x);
  const back = shaftAngle + Math.PI;
  const angleA = Math.atan2(barbA.y - headA.y, barbA.x - headA.x);
  const angleB = Math.atan2(barbB.y - headB.y, barbB.x - headB.x);
  const diffA = angleDelta(angleA, back);
  const diffB = angleDelta(angleB, back);
  if (diffA < 0.2 || diffA > 1.4 || diffB < 0.2 || diffB > 1.4) return null;
  const side = (angle: number) => Math.sign(Math.sin(angle - shaftAngle));
  if (side(angleA) === side(angleB)) return null;
  const fit = polylineResidual(points, [tail, headA, barbA, headA, barbB]);
  if (fit.mean > length * 0.055) return null;
  const pressure = averagePressure(points);
  const drawnHead = { x: (headA.x + headB.x) / 2, y: (headA.y + headB.y) / 2 };
  // Cabo quase horizontal ou vertical vira exatamente horizontal ou vertical, com as farpas
  // acompanhando.
  const head = snapToAxis(tail, drawnHead);
  const outAngle = head === drawnHead ? shaftAngle : Math.atan2(head.y - tail.y, head.x - tail.x);
  const barbLength = Math.min(shaftLength * 0.24, Math.max(20, (barbALength + barbBLength) / 2));
  const barbAngle = (Math.PI * 28) / 180;
  const tip1 = {
    x: head.x + Math.cos(outAngle + Math.PI - barbAngle) * barbLength,
    y: head.y + Math.sin(outAngle + Math.PI - barbAngle) * barbLength,
  };
  const tip2 = {
    x: head.x + Math.cos(outAngle + Math.PI + barbAngle) * barbLength,
    y: head.y + Math.sin(outAngle + Math.PI + barbAngle) * barbLength,
  };
  return { kind: "arrow", points: densify([tail, head, tip1, head, tip2], pressure, false) };
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
      return { kind: "line", points: densify([first, snapToAxis(first, last)], pressure, false) };
    }
  }

  // Seta: cabo reto com uma ponta em V, sem voltar perto do início.
  const arrow = recognizeArrow(points, length);
  if (arrow) return arrow;

  // Formas fechadas: o fim volta perto do começo.
  if (chord > diagonal * 0.3) return null;
  if (box.width < 40 || box.height < 40) return null;

  const candidates: { kind: ShapeKind; vertices: Vec[]; score: number }[] = [];
  const perimeter = pathLength([...points, first]);

  // Retângulo: os pontos ficam sobre o contorno de um retângulo. Perto do eixo (até
  // AXIS_SNAP_DEGREES) vale a caixa alinhada aos eixos; mais inclinado, o menor retângulo girado
  // que os envolve. Assim um retângulo desenhado de lado também é reconhecido.
  const rectangle: Vec[] = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY },
    { x: box.minX, y: box.minY },
  ];
  const rectangleFit = polylineResidual(points, rectangle);
  const tilted = orientedRectangle(points);
  const minSide = Math.min(box.width, box.height);
  if (tilted.tilt <= AXIS_SNAP_DEGREES && rectangleFit.mean <= minSide * 0.07) {
    candidates.push({
      kind: "rectangle",
      vertices: rectangle.slice(0, 4),
      score: rectangleFit.mean / minSide,
    });
  } else if (Math.min(tilted.width, tilted.height) >= 40) {
    const turned = [...tilted.corners, tilted.corners[0]!];
    const turnedFit = polylineResidual(points, turned);
    const turnedSide = Math.min(tilted.width, tilted.height);
    // Uma elipse inclinada também cabe justa em um retângulo girado, mas não tem tinta nos
    // cantos: um retângulo de verdade tem, mesmo com os cantos arredondados.
    const cornerGap = Math.max(
      ...tilted.corners.map((corner) => Math.min(...points.map((point) => dist(point, corner)))),
    );
    if (turnedFit.mean <= turnedSide * 0.07 && cornerGap <= turnedSide * 0.22) {
      candidates.push({
        kind: "rectangle",
        vertices: [...tilted.corners],
        score: turnedFit.mean / turnedSide,
      });
    }
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

  // Polígono (pentágono, hexágono...): mesma ideia do triângulo, com mais lados, mas com
  // uma tolerância bem mais apertada: uma curva de verdade (elipse) só cabe em poucos
  // segmentos retos se a tolerância for larga, então aqui ela precisa ser estreita o
  // bastante para que só cantos retos de verdade sobrevivam à simplificação.
  const polygonVertices = dedupeVertices(simplify(closedPath, diagonal * 0.022), diagonal * 0.06);
  const sides = polygonVertices.length;
  if (sides >= 5 && sides <= 8) {
    const fit = polylineResidual(points, [...polygonVertices, polygonVertices[0]!]);
    if (fit.mean <= diagonal * 0.016 && isSimplePolygon(polygonVertices)) {
      candidates.push({ kind: "polygon", vertices: polygonVertices, score: fit.mean / diagonal });
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

// Formas com vários traços: depois de acertar uma reta, ela pode fechar um triângulo, um
// retângulo ou um quadrilátero com as retas acertadas logo antes. `lines` são as retas na ordem
// em que foram feitas, a última sendo a mais nova, e a forma sempre inclui a mais nova.
export type LineSegment = { a: Vec; b: Vec };
export type ClosedFromLines = {
  kind: "triangle" | "rectangle" | "polygon";
  // Índices (em `lines`) das retas que a forma substitui.
  used: number[];
  points: HandwritingPoint[];
};

// Lado mínimo (unidades da folha) para valer como lado de uma forma.
const MIN_EDGE = 40;
// Retas mais paralelas que isso (graus entre elas) nunca formam canto.
const MIN_CORNER_DEGREES = 20;
// Quanto cada reta pode estar fora do lado que lhe cabe (soma das folgas nos dois cantos, ou
// do que passou do canto) em fração do lado, e a média entre os lados.
const EDGE_GAP = 0.35;
const MEAN_GAP = 0.2;
// Desvio de cada canto de um retângulo em relação ao ângulo reto, em graus.
const RIGHT_ANGLE_TOLERANCE = 15;

function intersectLines(a: LineSegment, b: LineSegment): Vec | null {
  const d1 = { x: a.b.x - a.a.x, y: a.b.y - a.a.y };
  const d2 = { x: b.b.x - b.a.x, y: b.b.y - b.a.y };
  const l1 = Math.hypot(d1.x, d1.y);
  const l2 = Math.hypot(d2.x, d2.y);
  if (l1 === 0 || l2 === 0) return null;
  const det = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(det) / (l1 * l2) < Math.sin((MIN_CORNER_DEGREES * Math.PI) / 180)) return null;
  const t = ((b.a.x - a.a.x) * d2.y - (b.a.y - a.a.y) * d2.x) / det;
  return { x: a.a.x + d1.x * t, y: a.a.y + d1.y * t };
}

// Os cantos de um polígono formado por estas retas, em ordem cíclica, ou null se elas não o
// fecham: cada lado tem de ficar perto da reta que o desenhou.
function closePolygon(segments: readonly LineSegment[]): { vertices: Vec[]; score: number } | null {
  const count = segments.length;
  const vertices: Vec[] = [];
  for (let index = 0; index < count; index += 1) {
    const corner = intersectLines(segments[index]!, segments[(index + 1) % count]!);
    if (!corner) return null;
    vertices.push(corner);
  }
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const from = vertices[(index + count - 1) % count]!;
    const to = vertices[index]!;
    const length = dist(from, to);
    if (length < MIN_EDGE) return null;
    const { a, b } = segments[index]!;
    const gap = Math.min(dist(a, from) + dist(b, to), dist(a, to) + dist(b, from));
    if (gap > length * EDGE_GAP) return null;
    total += gap / length;
  }
  const score = total / count;
  if (score > MEAN_GAP || !isSimplePolygon(vertices)) return null;
  return { vertices, score };
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
      item,
      ...rest,
    ]),
  );
}

function combinations(count: number, size: number): number[][] {
  if (size === 0) return [[]];
  const out: number[][] = [];
  for (let first = 0; first <= count - size; first += 1)
    for (const rest of combinations(count - first - 1, size - 1))
      out.push([first, ...rest.map((value) => value + first + 1)]);
  return out;
}

// Um quadrilátero com cantos quase retos vira um retângulo exato, alinhado ao eixo quando está a
// até AXIS_SNAP_DEGREES dele.
function rectangleFrom(vertices: readonly Vec[]): Vec[] | null {
  for (let index = 0; index < 4; index += 1) {
    const corner = vertices[index]!;
    const before = vertices[(index + 3) % 4]!;
    const after = vertices[(index + 1) % 4]!;
    const ux = before.x - corner.x;
    const uy = before.y - corner.y;
    const vx = after.x - corner.x;
    const vy = after.y - corner.y;
    const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    const degrees = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    if (Math.abs(degrees - 90) > RIGHT_ANGLE_TOLERANCE) return null;
  }
  const [v0, v1, v2, v3] = vertices as [Vec, Vec, Vec, Vec];
  let dx = v1.x - v0.x + (v2.x - v3.x);
  let dy = v1.y - v0.y + (v2.y - v3.y);
  const norm = Math.hypot(dx, dy);
  dx /= norm;
  dy /= norm;
  const angle = Math.atan2(dy, dx);
  const quarter = Math.PI / 2;
  const nearest = Math.round(angle / quarter) * quarter;
  if (Math.abs(angle - nearest) <= AXIS_SNAP) {
    dx = Math.round(Math.cos(nearest));
    dy = Math.round(Math.sin(nearest));
  }
  const width = (dist(v0, v1) + dist(v3, v2)) / 2;
  const height = (dist(v1, v2) + dist(v0, v3)) / 2;
  const cx = (v0.x + v1.x + v2.x + v3.x) / 4;
  const cy = (v0.y + v1.y + v2.y + v3.y) / 4;
  const corner = (u: number, v: number): Vec => ({
    x: cx + dx * u - dy * v,
    y: cy + dy * u + dx * v,
  });
  return [
    corner(-width / 2, -height / 2),
    corner(width / 2, -height / 2),
    corner(width / 2, height / 2),
    corner(-width / 2, height / 2),
  ];
}

export function closeLines(lines: readonly LineSegment[], pressure = 0.5): ClosedFromLines | null {
  const newest = lines.length - 1;
  if (newest < 2) return null;
  // Triângulo primeiro (a mais nova e outras duas), depois quadrilátero (a mais nova e outras três).
  for (const sides of [3, 4]) {
    let best: { vertices: Vec[]; score: number; used: number[] } | null = null;
    for (const picked of combinations(newest, sides - 1)) {
      for (const order of permutations(picked)) {
        const used = [newest, ...order];
        const closed = closePolygon(used.map((index) => lines[index]!));
        if (closed && (!best || closed.score < best.score)) best = { ...closed, used };
      }
    }
    if (!best) continue;
    if (sides === 3)
      return {
        kind: "triangle",
        used: best.used,
        points: densify(best.vertices, pressure, true),
      };
    const rectangle = rectangleFrom(best.vertices);
    return {
      kind: rectangle ? "rectangle" : "polygon",
      used: best.used,
      points: densify(rectangle ?? best.vertices, pressure, true),
    };
  }
  return null;
}

// Alternativa por teclado ao "segurar para acertar": desenhar a mão livre é, por natureza,
// um gesto de ponteiro. Quem não usa ponteiro insere a forma pronta direto, do tamanho e na
// posição pedidos, e ajusta depois com o que já é acessível por teclado (mover a seleção,
// girar, redimensionar). Só o polígono usa um número fixo de lados (hexágono), por não ter
// um "padrão" natural como as outras formas.
export function canonicalShape(
  kind: ShapeKind,
  box: { x: number; y: number; width: number; height: number },
  pressure = 0.5,
): HandwritingPoint[] {
  const { x, y, width, height } = box;
  const cx = x + width / 2;
  const cy = y + height / 2;
  if (kind === "line")
    return densify(
      [
        { x, y: cy },
        { x: x + width, y: cy },
      ],
      pressure,
      false,
    );
  if (kind === "ellipse") {
    const rx = width / 2;
    const ry = height / 2;
    const ring = Array.from({ length: 72 }, (_, index) => {
      const angle = (index / 72) * Math.PI * 2;
      return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
    });
    return densify(ring, pressure, true);
  }
  if (kind === "rectangle") {
    return densify(
      [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
      pressure,
      true,
    );
  }
  if (kind === "triangle") {
    return densify(
      [
        { x: cx, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
      pressure,
      true,
    );
  }
  if (kind === "polygon") {
    const sides = 6;
    const radius = Math.min(width, height) / 2;
    const vertices = Array.from({ length: sides }, (_, index) => {
      const angle = -Math.PI / 2 + (index / sides) * Math.PI * 2;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
    return densify(vertices, pressure, true);
  }
  // arrow
  const tail = { x, y: cy };
  const head = { x: x + width, y: cy };
  const barbLength = Math.min(width * 0.24, Math.max(20, width * 0.18));
  const barbAngle = (28 * Math.PI) / 180;
  const tip1 = {
    x: head.x + Math.cos(Math.PI - barbAngle) * barbLength,
    y: head.y + Math.sin(Math.PI - barbAngle) * barbLength,
  };
  const tip2 = {
    x: head.x + Math.cos(Math.PI + barbAngle) * barbLength,
    y: head.y + Math.sin(Math.PI + barbAngle) * barbLength,
  };
  return densify([tail, head, tip1, head, tip2], pressure, false);
}
