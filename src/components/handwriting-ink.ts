import type { HandwritingPoint } from "../domain/handwriting";
import type { Stroke } from "./handwriting-types";

// Motor de traço: transforma os pontos da caneta em um contorno de largura
// variável desenhado com um único preenchimento. Desenhar cada segmento com seu
// próprio stroke() deixa degraus de espessura, contas nas juntas e escurece as
// tintas translúcidas onde os segmentos se sobrepõem. Um contorno único não tem
// nada disso e é o mesmo desenho ao vivo e depois de salvo.

type Vec = { x: number; y: number };
export type InkDisc = { x: number; y: number; r: number };
export type StrokeOutline = { left: Vec[]; right: Vec[]; discs: InkDisc[] };
type InkStroke = Pick<Stroke, "tool" | "brush" | "width">;

// Distância (em unidades da folha) em que a largura alcança ~63% do alvo. Suaviza
// degraus de pressão e de ângulo sem borrar a diferença entre traço fino e grosso.
const WIDTH_SMOOTHING = 5;
// Curva acima da qual a junta ganha um disco, para não abrir cunha no lado externo.
const CORNER_COSINE = Math.cos((40 * Math.PI) / 180);

export function tiltShading(point: HandwritingPoint): number {
  // Inclinacao da caneta (graus, -90 a 90) simula uma ponta caligrafica: mais
  // deitada = traco mais largo, em pe = mais fino. Mouse/toque nao reportam
  // tilt, entao o efeito fica neutro (1) para esses dispositivos.
  const tiltX = point.tiltX ?? 0;
  const tiltY = point.tiltY ?? 0;
  const magnitude = Math.min(1, Math.hypot(tiltX, tiltY) / 90);
  return 1 + magnitude * 0.6;
}

// Diâmetro que o pincel pede para um ponto, antes da suavização ao longo do traço.
function targetDiameter(stroke: InkStroke, point: HandwritingPoint, direction: number): number {
  const pressure = stroke.tool === "pen" ? point.pressure : 0.7;
  if (stroke.brush === "ink") {
    return (
      stroke.width *
      (0.5 + pressure * 3) *
      (0.35 + 0.65 * Math.abs(Math.sin(direction - Math.PI / 4))) *
      tiltShading(point)
    );
  }
  if (stroke.brush === "soft") return stroke.width * (2 + pressure * 4);
  return stroke.width * (0.72 + pressure * 0.55);
}

// Raio em cada ponto. Só depende dos pontos até o vizinho seguinte, então a ponta
// do traço ao vivo e o traço já pronto usam exatamente a mesma conta.
export function strokeRadii(stroke: InkStroke, points: readonly HandwritingPoint[]): number[] {
  const radii: number[] = [];
  let previous = 0;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const before = points[index - 1] ?? point;
    const after = points[index + 1] ?? point;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const direction = dx === 0 && dy === 0 ? Math.PI / 4 : Math.atan2(dy, dx);
    const target = targetDiameter(stroke, point, direction) / 2;
    let radius = target;
    if (index > 0) {
      const gap = Math.hypot(point.x - before.x, point.y - before.y);
      radius = previous + (target - previous) * (1 - Math.exp(-gap / WIDTH_SMOOTHING));
    }
    radii.push(radius);
    previous = radius;
  }
  return radii;
}

export function strokeOutline(
  points: readonly HandwritingPoint[],
  radii: readonly number[],
): StrokeOutline {
  const left: Vec[] = [];
  const right: Vec[] = [];
  const discs: InkDisc[] = [];
  const count = points.length;
  if (count === 0) return { left, right, discs };
  const first = points[0]!;
  if (count === 1) {
    discs.push({ x: first.x, y: first.y, r: radii[0]! });
    return { left, right, discs };
  }
  let tangentX = 1;
  let tangentY = 0;
  for (let index = 0; index < count; index += 1) {
    const point = points[index]!;
    const before = points[Math.max(0, index - 1)]!;
    const after = points[Math.min(count - 1, index + 1)]!;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy);
    if (length > 1e-6) {
      tangentX = dx / length;
      tangentY = dy / length;
    }
    // Normal escolhida para que o contorno tenha a mesma orientação dos arcos do
    // canvas: a regra "nonzero" une as sobreposições em vez de abrir buracos.
    const normalX = tangentY;
    const normalY = -tangentX;
    const radius = radii[index]!;
    left.push({ x: point.x + normalX * radius, y: point.y + normalY * radius });
    right.push({ x: point.x - normalX * radius, y: point.y - normalY * radius });
  }
  const last = points[count - 1]!;
  discs.push({ x: first.x, y: first.y, r: radii[0]! });
  discs.push({ x: last.x, y: last.y, r: radii[count - 1]! });
  for (let index = 1; index < count - 1; index += 1) {
    const point = points[index]!;
    const before = points[index - 1]!;
    const after = points[index + 1]!;
    const ax = point.x - before.x;
    const ay = point.y - before.y;
    const bx = after.x - point.x;
    const by = after.y - point.y;
    const lengths = Math.hypot(ax, ay) * Math.hypot(bx, by);
    if (lengths > 1e-6 && (ax * bx + ay * by) / lengths < CORNER_COSINE) {
      // Nunca maior que os vizinhos: a largura da ponta caligráfica muda com o
      // ângulo e um disco maior que o traço aparece como uma conta no canto.
      const r = Math.min(radii[index - 1]!, radii[index]!, radii[index + 1]!);
      discs.push({ x: point.x, y: point.y, r });
    }
  }
  return { left, right, discs };
}

function curveThrough(context: CanvasRenderingContext2D, points: readonly Vec[]) {
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]!;
    const next = points[index + 1]!;
    context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  const last = points.at(-1)!;
  context.lineTo(last.x, last.y);
}

// Monta o caminho do contorno no contexto. Quem chama decide preencher.
export function traceOutline(context: CanvasRenderingContext2D, outline: StrokeOutline) {
  const { left, right, discs } = outline;
  context.beginPath();
  if (left.length >= 2) {
    context.moveTo(left[0]!.x, left[0]!.y);
    curveThrough(context, left);
    const back = [...right].reverse();
    context.lineTo(back[0]!.x, back[0]!.y);
    curveThrough(context, back);
    context.closePath();
  }
  for (const disc of discs) {
    context.moveTo(disc.x + disc.r, disc.y);
    context.arc(disc.x, disc.y, disc.r, 0, Math.PI * 2);
  }
}

// Fios do pincel macio: linhas finas que acompanham o traço em posições fixas da
// largura, cada uma em um único caminho (sem contas nas juntas).
export function bristleLines(
  points: readonly HandwritingPoint[],
  outline: StrokeOutline,
  offsets: readonly number[],
): Vec[][] {
  if (points.length < 2) return [];
  return offsets.map((fraction) =>
    points.map((_, index) => {
      const a = outline.left[index]!;
      const b = outline.right[index]!;
      const t = (fraction + 1) / 2;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }),
  );
}

export function strokeSmoothPath(context: CanvasRenderingContext2D, points: readonly Vec[]) {
  const first = points[0];
  if (!first) return;
  context.moveTo(first.x, first.y);
  curveThrough(context, points);
}

// Ponta prevista: estende o último segmento por um passo para cobrir o atraso do
// filtro e do quadro. Só vale para desenho ao vivo (nunca entra no traço salvo) e
// é omitida quando a mão parou ou fez uma curva fechada, onde a previsão erraria.
const PREDICTION_MAX_DISTANCE = 18;
const PREDICTION_MIN_SEGMENT = 0.75;
const PREDICTION_TURN_COSINE = 0.3;

export function predictedTip(
  points: readonly HandwritingPoint[],
  lookahead = 1,
): HandwritingPoint | undefined {
  const count = points.length;
  if (count < 3) return undefined;
  const last = points[count - 1]!;
  const previous = points[count - 2]!;
  const earlier = points[count - 3]!;
  const dx = last.x - previous.x;
  const dy = last.y - previous.y;
  const length = Math.hypot(dx, dy);
  if (length < PREDICTION_MIN_SEGMENT) return undefined;
  const backX = previous.x - earlier.x;
  const backY = previous.y - earlier.y;
  const backLength = Math.hypot(backX, backY);
  const cosine = backLength > 1e-6 ? (dx * backX + dy * backY) / (length * backLength) : 1;
  if (cosine < PREDICTION_TURN_COSINE) return undefined;
  const scale = Math.min(lookahead, PREDICTION_MAX_DISTANCE / length);
  return { ...last, x: last.x + dx * scale, y: last.y + dy * scale };
}
