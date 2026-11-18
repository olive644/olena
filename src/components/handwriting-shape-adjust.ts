import type { HandwritingPoint } from "../domain/handwriting";
import { arrowShape, lineShape, type RecognizedShape } from "./handwriting-shapes";

// Ajuste ao vivo depois do "segurar para acertar": com a forma já perfeita, quem continua
// arrastando a caneta a refaz sem levantar. Reta e seta seguem a caneta a partir da ponta fixa,
// com ímã a cada 15 graus. Formas fechadas giram e mudam de tamanho em torno do centro, seguindo
// a direção e a distância da caneta; o tamanho original e o giro zero também são ímãs, e é por
// isso que um círculo continua círculo e um quadrado continua quadrado.

type Vec = { x: number; y: number };

const STEP = Math.PI / 12;
const MAGNET = (3.5 * Math.PI) / 180;
const SCALE_MAGNET = 0.04;
const MIN_SCALE = 0.15;
const MAX_SCALE = 8;
const MIN_REACH = 8;

export type ShapeAdjustment = {
  points: HandwritingPoint[];
  /** Texto curto para o selo da tela: ângulo da reta ou tamanho da forma, já com a unidade. */
  detail: string;
};

export type ShapeAdjuster = (pointer: Vec) => ShapeAdjustment;

function magnet(angle: number): number {
  const nearest = Math.round(angle / STEP) * STEP;
  return Math.abs(angle - nearest) <= MAGNET ? nearest : angle;
}

function degrees(angle: number): number {
  const value = Math.round((angle * 180) / Math.PI);
  return value === -180 ? 180 : value;
}

export function createShapeAdjuster(shape: RecognizedShape, anchor: Vec): ShapeAdjuster | null {
  const points = shape.points;
  const first = points[0];
  if (!first || points.length < 2) return null;
  const pressure = points.reduce((sum, point) => sum + point.pressure, 0) / points.length || 0.5;

  if (shape.kind === "line" || shape.kind === "arrow") {
    return (pointer) => {
      const dx = pointer.x - first.x;
      const dy = pointer.y - first.y;
      const reach = Math.hypot(dx, dy);
      if (reach < MIN_REACH) return { points, detail: "" };
      const angle = magnet(Math.atan2(dy, dx));
      const head = { x: first.x + Math.cos(angle) * reach, y: first.y + Math.sin(angle) * reach };
      return {
        points:
          shape.kind === "line"
            ? lineShape(first, head, pressure)
            : arrowShape(first, head, pressure),
        detail: `${degrees(angle)}°`,
      };
    };
  }

  const center = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
  const startX = anchor.x - center.x;
  const startY = anchor.y - center.y;
  const startReach = Math.hypot(startX, startY);
  if (startReach < MIN_REACH) return null;
  const startAngle = Math.atan2(startY, startX);
  return (pointer) => {
    const vx = pointer.x - center.x;
    const vy = pointer.y - center.y;
    const reach = Math.hypot(vx, vy);
    if (reach < MIN_REACH) return { points, detail: "" };
    let scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, reach / startReach));
    if (Math.abs(scale - 1) <= SCALE_MAGNET) scale = 1;
    let turn = Math.atan2(vy, vx) - startAngle;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    turn = magnet(turn);
    const cos = Math.cos(turn) * scale;
    const sin = Math.sin(turn) * scale;
    return {
      points: points.map((point) => ({
        ...point,
        x: center.x + (point.x - center.x) * cos - (point.y - center.y) * sin,
        y: center.y + (point.x - center.x) * sin + (point.y - center.y) * cos,
      })),
      detail: `${Math.round(scale * 100)}%`,
    };
  };
}
