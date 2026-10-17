import type { HandwritingPoint } from "../domain/handwriting";

// Ferramenta de curva: a pessoa marca pontos de controle e a curva passa por todos eles. Só a
// regra de gerar o traço fica aqui; o editor cuida do gesto, da prévia e de gravar.
//
// A curva é uma Catmull-Rom centrípeta: passa pelos pontos de controle, não faz laços nem pontas
// quando dois pontos ficam muito próximos ou muito distantes, e o primeiro e o último segmento
// terminam suaves (os extremos são espelhados).
type Vec = { x: number; y: number };

// Distância entre amostras do traço gerado, como em `densify` das formas.
const SPACING = 6;
// Teto de pontos de controle: o traço final precisa caber no limite de pontos por traço (5000).
export const MAX_CONTROL_POINTS = 200;
// Pontos de controle mais próximos que isso (unidades da folha) contam como o mesmo ponto.
const MIN_GAP = 2;

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export function dedupeControls(controls: readonly Vec[]): Vec[] {
  const out: Vec[] = [];
  for (const control of controls) {
    const last = out.at(-1);
    if (!last || dist(last, control) > MIN_GAP) out.push({ x: control.x, y: control.y });
  }
  return out;
}

// Um segmento Catmull-Rom centrípeto entre p1 e p2, com p0 e p3 como vizinhos (formulação de
// Barry e Goldman, que é estável com espaçamento irregular).
function segment(p0: Vec, p1: Vec, p2: Vec, p3: Vec, steps: number): Vec[] {
  const t0 = 0;
  const t1 = t0 + Math.sqrt(dist(p0, p1));
  const t2 = t1 + Math.sqrt(dist(p1, p2));
  const t3 = t2 + Math.sqrt(dist(p2, p3));
  const mix = (a: Vec, b: Vec, ta: number, tb: number, t: number): Vec => {
    const span = tb - ta;
    if (span === 0) return a;
    const w = (t - ta) / span;
    return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
  };
  const out: Vec[] = [];
  for (let step = 0; step < steps; step += 1) {
    const t = t1 + ((t2 - t1) * step) / steps;
    const a1 = mix(p0, p1, t0, t1, t);
    const a2 = mix(p1, p2, t1, t2, t);
    const a3 = mix(p2, p3, t2, t3, t);
    const b1 = mix(a1, a2, t0, t2, t);
    const b2 = mix(a2, a3, t1, t3, t);
    out.push(mix(b1, b2, t1, t2, t));
  }
  return out;
}

// A curva por todos os pontos de controle, em pontos da folha com a pressão dada. Menos de dois
// pontos de controle distintos não formam curva.
export function splinePoints(
  controls: readonly Vec[],
  pressure = 0.5,
  page?: { width: number; height: number },
): HandwritingPoint[] {
  const points = dedupeControls(controls).slice(0, MAX_CONTROL_POINTS);
  if (points.length < 2) return [];
  const first = points[0]!;
  const last = points.at(-1)!;
  // Espelhar o primeiro e o último ponto dá a eles uma tangente natural, sem curvar para fora.
  const head = { x: 2 * first.x - points[1]!.x, y: 2 * first.y - points[1]!.y };
  const tail = {
    x: 2 * last.x - points.at(-2)!.x,
    y: 2 * last.y - points.at(-2)!.y,
  };
  const padded = [head, ...points, tail];
  const out: Vec[] = [];
  for (let index = 1; index < padded.length - 2; index += 1) {
    const p1 = padded[index]!;
    const p2 = padded[index + 1]!;
    const steps = Math.max(2, Math.round(dist(p1, p2) / SPACING));
    out.push(...segment(padded[index - 1]!, p1, p2, padded[index + 2]!, steps));
  }
  out.push(last);
  return out.map((point) => ({
    x: page ? Math.max(0, Math.min(page.width, point.x)) : point.x,
    y: page ? Math.max(0, Math.min(page.height, point.y)) : point.y,
    pressure,
  }));
}
