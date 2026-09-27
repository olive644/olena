import type { HandwritingPoint } from "../domain/handwriting";
import type { Stroke } from "./handwriting-types";

// Previsão da ponta do traço. O navegador entrega, com cada movimento, os pontos que ele espera
// para os próximos milissegundos (getPredictedEvents). Desenhar um pedacinho a mais só na tela,
// sem guardá-lo, faz a tinta parecer sair da caneta com menos atraso. Quando a previsão erra, o
// pedaço some no quadro seguinte, porque nunca entra no traço.

// No máximo quantos pontos previstos entram na ponta.
export const MAX_PREDICTED_POINTS = 3;
// Comprimento máximo da ponta, em unidades da folha (a folha tem 1200 de largura).
export const MAX_PREDICTED_LENGTH = 36;
// Se o primeiro ponto previsto está mais longe que isso do fim do traço, o filtro de suavização
// ainda está muito atrás do ponteiro e a previsão apareceria desconectada da tinta.
export const MAX_PREDICTION_GAP = 40;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

// Escolhe a parte da previsão que vale desenhar: perto do fim do traço, na mesma direção em que o
// traço vem indo e curta.
export function predictedTail(
  stroke: readonly HandwritingPoint[],
  predicted: readonly HandwritingPoint[],
): HandwritingPoint[] {
  const last = stroke.at(-1);
  if (!last || predicted.length === 0) return [];
  const first = predicted[0]!;
  if (dist(last, first) > MAX_PREDICTION_GAP) return [];

  // Direção recente do traço (dos últimos pontos até o fim).
  const back = stroke.length >= 3 ? stroke[stroke.length - 3]! : stroke[0]!;
  const heading = { x: last.x - back.x, y: last.y - back.y };
  const headingLength = Math.hypot(heading.x, heading.y);

  const tail: HandwritingPoint[] = [];
  let anchor = last;
  let length = 0;
  for (const point of predicted.slice(0, MAX_PREDICTED_POINTS)) {
    const step = { x: point.x - anchor.x, y: point.y - anchor.y };
    const stepLength = Math.hypot(step.x, step.y);
    if (stepLength === 0) continue;
    // Um ponto que volta contra a direção do traço é ruído da previsão.
    if (headingLength > 0.5 && heading.x * step.x + heading.y * step.y < 0) break;
    length += stepLength;
    if (length > MAX_PREDICTED_LENGTH) break;
    tail.push({ ...point, pressure: last.pressure });
    anchor = point;
  }
  return tail;
}

// O traço como se desenha na tela: com a ponta prevista, sem mexer no traço de verdade.
export function withPredictedTail(stroke: Stroke, tail: readonly HandwritingPoint[]): Stroke {
  if (tail.length === 0) return stroke;
  return { ...stroke, points: [...stroke.points, ...tail] };
}
