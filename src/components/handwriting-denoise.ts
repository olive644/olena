import type { HandwritingPoint } from "../domain/handwriting";

// Alisamento das posições do mouse. O mouse informa pixels inteiros e a folha é maior que a tela,
// então cada pixel vale vários da folha: um caminho liso vira degraus e a linha sai serrilhada,
// ainda mais quando se escreve devagar (muitas amostras no mesmo pixel). O filtro de tempo do
// estabilizador ao vivo não tira isso: ele mantém a tinta colada na caneta e deixa passar quase
// todo o pior degrau.
//
// Aqui cada ponto é levado para a reta que melhor se ajusta aos vizinhos ao longo do traço. A
// janela é a maior, até 12 pixels de tela, em que os vizinhos ainda ficam a no máximo 1,1 pixel
// dessa reta: onde o traço é reto ela se alonga e apaga o degrau; numa curva ela encolhe sozinha
// e a curva fica. Cantos ficam fixos e nenhuma janela atravessa um canto. Só vale para mouse e
// dedo: a caneta traz posição fracionária e não tem esse degrau.

/** Meia janela candidata, em pixels de tela, da maior para a menor. */
const CANDIDATE_PIXELS = [12, 9, 6, 4, 2.5];
/** Quanto os vizinhos podem se afastar da reta ajustada: um pixel e um pouco (o degrau tem 0,5). */
const TOLERANCE_PIXELS = 1.1;
/** A janela nunca fica menor que isso, em unidades da folha (zoom muito grande). */
const MIN_WINDOW = 1.5;
/** Mudança de direção, medida em cordas de 4,5 pixels, a partir da qual o ponto é um canto. */
const CORNER_ANGLE = (55 * Math.PI) / 180;
const CORNER_CHORD_PIXELS = 4.5;

/**
 * Mantém a quantidade de pontos, a ordem e todos os campos além de x e y (pressão, inclinação,
 * giro). Extremos e cantos não se mexem. `unitsPerPixel` é quantas unidades da folha cabem em um
 * pixel da tela agora.
 */
export function denoiseMousePath(
  points: readonly HandwritingPoint[],
  unitsPerPixel: number,
): HandwritingPoint[] {
  const count = points.length;
  if (count < 4 || !(unitsPerPixel > 0)) return [...points];
  const along: number[] = [0];
  for (let index = 1; index < count; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    along.push(along[index - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = along[count - 1]!;
  if (total <= 0) return [...points];

  // Amostras muito espaçadas (traço rápido): a corda precisa alcançar ao menos um vizinho.
  const chord = Math.max(CORNER_CHORD_PIXELS * unitsPerPixel, (total / (count - 1)) * 1.5);
  const corner = new Array<boolean>(count).fill(false);
  let back = 0;
  let ahead = 0;
  for (let index = 1; index < count - 1; index += 1) {
    while (back < index && along[index]! - along[back + 1]! >= chord) back += 1;
    if (ahead < index) ahead = index;
    while (ahead < count - 1 && along[ahead]! - along[index]! < chord) ahead += 1;
    const p = points[index]!;
    const before = points[back]!;
    const after = points[ahead]!;
    const ux = p.x - before.x;
    const uy = p.y - before.y;
    const vx = after.x - p.x;
    const vy = after.y - p.y;
    const lengths = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    // sem corda dos dois lados (perto de um extremo) não há como medir canto
    if (lengths < chord * chord * 0.25) continue;
    const cosine = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / lengths));
    if (Math.acos(cosine) > CORNER_ANGLE) corner[index] = true;
  }

  const tolerance = TOLERANCE_PIXELS * unitsPerPixel;
  // Traço rápido: as amostras ficam longe e uma janela de poucos pixels não alcança vizinho
  // nenhum. Cada janela candidata cobre ao menos 1,6 espaçamento.
  const gap = (total / (count - 1)) * 1.6;
  return points.map((point, index) => {
    if (index === 0 || index === count - 1 || corner[index]) return { ...point };
    for (const pixels of CANDIDATE_PIXELS) {
      const half = Math.max(MIN_WINDOW, pixels * unitsPerPixel, gap);
      let low = index;
      while (low > 0 && along[index]! - along[low - 1]! <= half) {
        low -= 1;
        if (corner[low]) break;
      }
      let high = index;
      while (high < count - 1 && along[high + 1]! - along[index]! <= half) {
        high += 1;
        if (corner[high]) break;
      }
      if (high - low < 2) continue;
      // reta ajustada (pesos triangulares) aos pontos da janela
      let sumW = 0;
      let cx = 0;
      let cy = 0;
      for (let other = low; other <= high; other += 1) {
        const w = 1 - Math.abs(along[other]! - along[index]!) / (half + 1e-9);
        sumW += w;
        cx += points[other]!.x * w;
        cy += points[other]!.y * w;
      }
      cx /= sumW;
      cy /= sumW;
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      for (let other = low; other <= high; other += 1) {
        const w = 1 - Math.abs(along[other]! - along[index]!) / (half + 1e-9);
        const dx = points[other]!.x - cx;
        const dy = points[other]!.y - cy;
        sxx += w * dx * dx;
        syy += w * dy * dy;
        sxy += w * dx * dy;
      }
      const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      let worst = 0;
      for (let other = low; other <= high; other += 1) {
        const offset = Math.abs((points[other]!.x - cx) * dirY - (points[other]!.y - cy) * dirX);
        if (offset > worst) worst = offset;
      }
      // a janela só vale se o trecho ainda é reto: numa curva ela encolhe até caber
      if (worst > tolerance) continue;
      const along0 = (point.x - cx) * dirX + (point.y - cy) * dirY;
      return { ...point, x: cx + dirX * along0, y: cy + dirY * along0 };
    }
    return { ...point };
  });
}
