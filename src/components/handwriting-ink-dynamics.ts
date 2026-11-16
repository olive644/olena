import type { HandwritingPoint } from "../domain/handwriting";

// Dinâmica do traço para quem escreve sem caneta com pressão (mouse e dedo). Esses dispositivos
// mandam sempre a mesma pressão, então o traço saía com largura uniforme e pontas chapadas, como
// uma linha de régua. Duas regras deixam a tinta com cara de caneta de verdade, no mesmo espírito
// do que se vê no Canva (que usa a biblioteca perfect-freehand): a pressão é deduzida da
// velocidade (rápido afina, devagar engrossa) e as pontas afinam. Aqui há só a conta, sem DOM.
// Nada disto vale para quem tem pressão real: a caneta já faz isso sozinha.

/** Variação de pressão menor que isso entre pontos conta como "sem pressão real". */
const REAL_PRESSURE_SPREAD = 0.02;

/** A caneta informa pressão de verdade se os pontos do traço não têm todos o mesmo valor. */
export function hasRealPressure(points: readonly HandwritingPoint[]): boolean {
  let low = Infinity;
  let high = -Infinity;
  for (const point of points) {
    low = Math.min(low, point.pressure);
    high = Math.max(high, point.pressure);
  }
  return points.length > 0 && high - low > REAL_PRESSURE_SPREAD;
}

// Faixa da pressão simulada. Mais estreita que a da caneta (0 a 1): sem a mão para controlar, uma
// faixa larga deixaria o traço do mouse irregular demais. O meio (0,5) é a pressão antiga.
const SIMULATED_LOW = 0.3;
const SIMULATED_HIGH = 0.8;
// Fração do caminho até a pressão-alvo percorrida a cada ponto, escalada pela velocidade.
const PRESSURE_RATE = 0.275;

/**
 * Pressão simulada de cada ponto. Causal: o valor do ponto `i` só depende dos pontos até `i`,
 * então a ponta do traço ao vivo e o traço já pronto recebem os mesmos números. `size` é a
 * distância (em unidades da folha) entre pontos a partir da qual o traço conta como rápido.
 */
export function simulatedPressures(points: readonly HandwritingPoint[], size: number): number[] {
  const reference = Math.max(1, size);
  const result: number[] = [];
  let pressure = 0.5;
  for (let index = 0; index < points.length; index += 1) {
    if (index > 0) {
      const before = points[index - 1]!;
      const point = points[index]!;
      const speed = Math.min(1, Math.hypot(point.x - before.x, point.y - before.y) / reference);
      // Parado ou devagar (speed perto de 0): vai para a pressão alta. Rápido: vai para a baixa.
      const target = SIMULATED_LOW + (SIMULATED_HIGH - SIMULATED_LOW) * (1 - speed);
      pressure += (target - pressure) * Math.min(1, speed * PRESSURE_RATE + 0.05);
    }
    result.push(pressure);
  }
  return result;
}

// Menor fração da largura que a ponta alcança: a ponta afina, mas não some, para um traço curto
// não virar um fio invisível.
const TAPER_FLOOR = 0.25;

// Curva suave de 0 a 1 (derivada zero nas duas pontas), para a ponta não ter quina.
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Multiplicador da largura em cada ponto: a ponta do começo e a do fim afinam ao longo de
 * `taperLength` (unidades da folha, medidas pelo caminho). Traço mais curto que dois tapers
 * divide o comprimento ao meio. `ends` liga ou desliga cada ponta: o traço em andamento não pode
 * afinar a ponta, porque ela é a posição atual da caneta e não o fim do traço.
 */
export function taperFactors(
  points: readonly HandwritingPoint[],
  taperLength: number,
  ends: { start?: boolean; end?: boolean } = {},
): number[] {
  const { start = true, end = true } = ends;
  const count = points.length;
  if (count < 2 || taperLength <= 0) return points.map(() => 1);
  const along: number[] = [0];
  for (let index = 1; index < count; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    along.push(along[index - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = along[count - 1]!;
  if (total <= 0) return points.map(() => 1);
  const length = Math.min(taperLength, total / 2);
  return along.map((distance) => {
    const edge = Math.min(start ? distance : Infinity, end ? total - distance : Infinity);
    const t = Math.min(1, edge / length);
    return TAPER_FLOOR + (1 - TAPER_FLOOR) * smooth(t);
  });
}

/**
 * O traço é de mouse ou dedo (marcado ao criar), é de caneta e não é tracejado: a largura variável
 * vale. Se o dispositivo mandou pressão real mesmo assim (alguns toques informam força), vale a real.
 * Fineliner e Esferográfica são as canetas de escrever e ficam sempre com largura constante: a
 * largura que muda com a velocidade e as pontas finas dão cara de pincelada, que atrapalha a letra.
 */
export function usesSimulatedWidth(stroke: {
  tool: "pen" | "highlighter";
  brush?: string;
  dash?: "dashed" | "dotted";
  cover?: true;
  dynamics?: "simulated";
  points: readonly HandwritingPoint[];
}): boolean {
  return (
    stroke.dynamics === "simulated" &&
    stroke.tool === "pen" &&
    stroke.brush !== "fine" &&
    stroke.brush !== "ballpoint" &&
    !stroke.cover &&
    !stroke.dash &&
    stroke.points.length >= 2 &&
    !hasRealPressure(stroke.points)
  );
}
