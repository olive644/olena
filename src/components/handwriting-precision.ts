import type { HandwritingPoint } from "../domain/handwriting";

// Os pontos de um traço chegam do ponteiro com dezesseis casas decimais, o que só engorda a folha:
// a unidade da folha vale menos de um pixel, e um centésimo dela não se enxerga nem com zoom.
// Arredondar ao gravar o traço reduz o JSON em cerca de 40% e devolve capacidade à folha (o
// limite é em bytes e em traços), sem mudar a aparência.
const POSITION_DECIMALS = 2;
const PRESSURE_DECIMALS = 2;

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function compactPoints(points: readonly HandwritingPoint[]): HandwritingPoint[] {
  const result: HandwritingPoint[] = [];
  for (const point of points) {
    const compact: HandwritingPoint = {
      ...point,
      x: round(point.x, POSITION_DECIMALS),
      y: round(point.y, POSITION_DECIMALS),
      pressure: round(point.pressure, PRESSURE_DECIMALS),
      ...(point.tiltX !== undefined ? { tiltX: Math.round(point.tiltX) } : {}),
      ...(point.tiltY !== undefined ? { tiltY: Math.round(point.tiltY) } : {}),
    };
    const previous = result.at(-1);
    // Pontos repetidos depois do arredondamento não acrescentam nada ao desenho.
    if (previous && previous.x === compact.x && previous.y === compact.y) {
      result[result.length - 1] = compact;
      continue;
    }
    result.push(compact);
  }
  return result;
}
