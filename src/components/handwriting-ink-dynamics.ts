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
/**
 * Faixa da pressão simulada por pincel. Nos pincéis cuja largura cresce muito com a pressão (a
 * Caneta-tinteiro triplica), a faixa larga fazia o traço empoçar em gota onde a mão desacelera
 * (pontas de laço, começo do traço). Eles ganham uma faixa estreita em torno do 0,5 de sempre.
 */
export function simulatedPressureRange(brush: string | undefined): readonly [number, number] {
  if (brush === "ink") return [0.45, 0.58];
  if (brush === "soft") return [0.4, 0.65];
  if (brush === "pencil") return [0.4, 0.7];
  return [SIMULATED_LOW, SIMULATED_HIGH];
}

// Fração do caminho até a pressão-alvo percorrida a cada ponto, escalada pela velocidade.
const PRESSURE_RATE = 0.275;

/**
 * Pressão simulada de cada ponto. Causal: o valor do ponto `i` só depende dos pontos até `i`,
 * então a ponta do traço ao vivo e o traço já pronto recebem os mesmos números. `size` é a
 * distância (em unidades da folha) entre pontos a partir da qual o traço conta como rápido.
 */
export function simulatedPressures(
  points: readonly HandwritingPoint[],
  size: number,
  range: readonly [low: number, high: number] = [SIMULATED_LOW, SIMULATED_HIGH],
): number[] {
  const reference = Math.max(1, size);
  const result: number[] = [];
  let pressure = 0.5;
  for (let index = 0; index < points.length; index += 1) {
    if (index > 0) {
      const before = points[index - 1]!;
      const point = points[index]!;
      const speed = Math.min(1, Math.hypot(point.x - before.x, point.y - before.y) / reference);
      // Parado ou devagar (speed perto de 0): vai para a pressão alta. Rápido: vai para a baixa.
      const target = range[0] + (range[1] - range[0]) * (1 - speed);
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
  ends: { start?: boolean; end?: boolean; floor?: number } = {},
): number[] {
  const { start = true, end = true, floor = TAPER_FLOOR } = ends;
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
    return floor + (1 - floor) * smooth(t);
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
  dynamics?: "simulated" | "pen";
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

// ---------------------------------------------------------------------------------------------
// Caneta e mesa digitalizadora. Pressão de verdade vinha crua para a largura: o primeiro ponto já
// chegava com pressão alta (borrão no começo), a leitura do hardware tremia de um ponto ao outro
// (largura serrilhada) e a ponta final saía chapada. O mouse ganhou pressão suavizada e pontas
// finas; a caneta passa a ter o equivalente, mas partindo da pressão que ela informa.

// Distância (unidades da folha) em que a pressão alcança ~63% do alvo. Independe da taxa de
// amostragem: 60, 125 ou 240 Hz dão a mesma curva ao longo do traço.
const PEN_PRESSURE_DISTANCE = 6;
// A tinta nasce leve e cresce, em vez de abrir já na pressão do primeiro ponto.
const PEN_START_PRESSURE = 0.3;
// Curva que levanta os toques leves (expoente menor que 1): a pressão 0,2 de um traço delicado
// rende um fio visível em vez de quase nada.
const PEN_PRESSURE_CURVE = 0.8;
// Quanto a velocidade afina o traço da caneta (de 0 a 1 do que a pressão pediu). Menor que o do
// mouse, porque a mão já controla a largura.
const PEN_SPEED_THINNING = 0.18;
// A ponta da caneta afina menos que a do mouse: ela já vem fina da pressão da mão.
export const PEN_TAPER_FLOOR = 0.4;

/**
 * Pressão de cada ponto de um traço de caneta, já suavizada. Causal como a do mouse: o valor do
 * ponto `i` depende só dos pontos até `i`, então o traço ao vivo e o pronto são idênticos.
 */
export function penPressures(points: readonly HandwritingPoint[], size: number): number[] {
  const reference = Math.max(1, size);
  const result: number[] = [];
  let level = 0.5;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const raw = Math.min(1, Math.max(0.05, point.pressure));
    const shaped = Math.pow(raw, PEN_PRESSURE_CURVE);
    if (index === 0) {
      level = Math.min(shaped, PEN_START_PRESSURE);
    } else {
      const before = points[index - 1]!;
      const gap = Math.hypot(point.x - before.x, point.y - before.y);
      const speed = Math.min(1, gap / reference);
      const target = shaped * (1 - PEN_SPEED_THINNING * speed);
      level += (target - level) * (1 - Math.exp(-Math.max(gap, 0.65) / PEN_PRESSURE_DISTANCE));
    }
    result.push(level);
  }
  return result;
}

/**
 * O traço é de caneta (marcado ao criar) e usa largura variável: pincéis de desenho e a
 * Esferográfica. Fineliner (linha de escrever constante) e Caligrafia (largura pelo ângulo da
 * pena) ficam como são. Tracejado e borracha de fundo também.
 */
export function usesPenDynamics(stroke: {
  tool: "pen" | "highlighter";
  brush?: string;
  dash?: "dashed" | "dotted";
  cover?: true;
  dynamics?: "simulated" | "pen";
  points: readonly HandwritingPoint[];
}): boolean {
  return (
    stroke.dynamics === "pen" &&
    stroke.tool === "pen" &&
    stroke.brush !== "fine" &&
    stroke.brush !== "calligraphy" &&
    !stroke.cover &&
    !stroke.dash &&
    stroke.points.length >= 2
  );
}
