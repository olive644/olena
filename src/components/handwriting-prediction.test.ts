import { describe, expect, it } from "vitest";
import {
  MAX_PREDICTED_LENGTH,
  MAX_PREDICTED_POINTS,
  MAX_PREDICTION_GAP,
  predictedTail,
  withPredictedTail,
} from "./handwriting-prediction";
import type { HandwritingPoint } from "../domain/handwriting";
import type { Stroke } from "./handwriting-types";

const pt = (x: number, y: number, pressure = 0.5): HandwritingPoint => ({ x, y, pressure });
const line = [pt(100, 100), pt(110, 100), pt(120, 100)];

describe("ponta prevista do traço", () => {
  it("sem previsão ou sem traço não há ponta", () => {
    expect(predictedTail(line, [])).toEqual([]);
    expect(predictedTail([], [pt(1, 1)])).toEqual([]);
  });

  it("mantém os pontos que seguem a direção do traço, com a pressão do último ponto", () => {
    const tail = predictedTail(line, [pt(126, 100, 0.9), pt(132, 100, 0.9)]);
    expect(tail).toHaveLength(2);
    expect(tail.every((point) => point.pressure === 0.5)).toBe(true);
    expect(tail[0]).toMatchObject({ x: 126, y: 100 });
  });

  it("descarta a previsão desconectada do fim da tinta", () => {
    expect(predictedTail(line, [pt(120 + MAX_PREDICTION_GAP + 5, 100)])).toEqual([]);
  });

  it("para no ponto que volta contra a direção do traço", () => {
    const tail = predictedTail(line, [pt(126, 100), pt(118, 100), pt(140, 100)]);
    expect(tail).toHaveLength(1);
  });

  it("limita a quantidade de pontos e o comprimento da ponta", () => {
    const many = Array.from({ length: 10 }, (_, index) => pt(122 + index * 2, 100));
    expect(predictedTail(line, many).length).toBeLessThanOrEqual(MAX_PREDICTED_POINTS);
    const far = predictedTail(line, [pt(150, 100), pt(200, 100)]);
    const length = far.reduce(
      (sum, point, index) => sum + Math.abs(point.x - (index === 0 ? 120 : far[index - 1]!.x)),
      0,
    );
    expect(length).toBeLessThanOrEqual(MAX_PREDICTED_LENGTH);
  });

  it("ignora pontos parados", () => {
    expect(predictedTail(line, [pt(120, 100), pt(120, 100)])).toEqual([]);
  });
});

describe("traço com a ponta", () => {
  const stroke: Stroke = {
    id: "s",
    tool: "pen",
    color: "#000",
    width: 4,
    points: line,
  } as Stroke;

  it("devolve o mesmo traço sem ponta e uma cópia com ela, sem alterar o original", () => {
    expect(withPredictedTail(stroke, [])).toBe(stroke);
    const drawn = withPredictedTail(stroke, [pt(126, 100)]);
    expect(drawn.points).toHaveLength(4);
    expect(stroke.points).toHaveLength(3);
  });
});
