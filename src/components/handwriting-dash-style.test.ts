import { describe, expect, it } from "vitest";
import { packDocument, unpackDocument } from "../data/handwriting-pack";
import { isHandwritingDocument } from "../data/local-workspace";
import { dashPattern, drawStroke } from "./handwriting-canvas";
import { eraseStrokeArea } from "./handwriting-eraser";
import { strokeInkBounds } from "./handwriting-geometry";
import type { Stroke } from "./handwriting-types";

// Contexto 2D falso que anota o padrão de traço usado e a espessura no momento do desenho.
function recordingContext() {
  const dashes: number[][] = [];
  const widths: number[] = [];
  const state: Record<string, unknown> = {};
  const context = new Proxy(state, {
    get(target, prop) {
      if (prop === "setLineDash") {
        return (pattern: number[]) => {
          dashes.push(pattern);
          widths.push(Number(target["lineWidth"]));
        };
      }
      if (prop in target) return target[prop as string];
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, dashes, widths };
}

const point = (x: number, y: number) => ({ x, y, pressure: 0.5 });
const line: Stroke = {
  id: "line",
  tool: "pen",
  brush: "ink",
  color: "#17151c",
  width: 10,
  points: [point(0, 100), point(300, 100)],
};

describe("estilo da linha: desenho", () => {
  it("traço sem estilo continua contínuo (compatibilidade com folhas antigas)", () => {
    const { context, dashes } = recordingContext();
    drawStroke(context, line);
    expect(dashes).toHaveLength(0);
  });

  it("tracejado aplica o padrão proporcional à espessura, mesmo com pincel de largura variável", () => {
    const { context, dashes, widths } = recordingContext();
    drawStroke(context, { ...line, dash: "dashed" });
    expect(widths).toEqual([6.5]);
    expect(dashes).toEqual([dashPattern("dashed", 6.5)]);
    expect(dashes[0]![0]).toBeGreaterThan(0.5);
    expect(dashes[0]![1]).toBeGreaterThan(dashes[0]![0]! / 2);
  });

  it("pontilhado usa comprimento quase nulo com vão maior que a espessura", () => {
    const { context, dashes } = recordingContext();
    drawStroke(context, { ...line, dash: "dotted" });
    const [mark, gap] = dashes[0]!;
    expect(mark).toBeLessThan(0.1);
    expect(gap).toBeGreaterThan(6.5);
  });

  it("o padrão acompanha a espessura quando o traço é redimensionado", () => {
    expect(dashPattern("dashed", 12)[0]).toBeCloseTo(dashPattern("dashed", 6)[0]! * 2);
    expect(dashPattern("dotted", 12)[1]).toBeCloseTo(dashPattern("dotted", 6)[1]! * 2);
  });
});

describe("estilo da linha: edição", () => {
  it("a borracha de trecho mantém o estilo nos dois pedaços", () => {
    let n = 0;
    const result = eraseStrokeArea(
      { ...line, dash: "dotted" },
      [point(150, 100)],
      20,
      () => `f${++n}`,
    );
    expect(result).toHaveLength(2);
    expect(result.every((piece) => piece.dash === "dotted")).toBe(true);
  });

  it("a caixa da tinta usa a espessura constante do desenho, não a do pincel de largura variável", () => {
    const wide: Stroke = { ...line, width: 40, points: [point(100, 100), point(300, 100)] };
    // Desenhado com espessura constante de 40 * 0.65, o traço tem meia espessura de 13.
    expect(strokeInkBounds({ ...wide, dash: "dashed" }).y).toBeCloseTo(100 - 13);
    expect(strokeInkBounds(wide).y).not.toBeCloseTo(100 - 13);
  });
});

describe("estilo da linha: armazenamento", () => {
  const document = (dash: unknown) => ({
    version: 1,
    paper: "ruled",
    strokes: [{ ...line, ...(dash === undefined ? {} : { dash }) }],
    stickies: [],
  });

  it("aceita tracejado, pontilhado e ausência do campo", () => {
    expect(isHandwritingDocument(document(undefined))).toBe(true);
    expect(isHandwritingDocument(document("dashed"))).toBe(true);
    expect(isHandwritingDocument(document("dotted"))).toBe(true);
  });

  it("recusa valores desconhecidos, para a colaboração não aceitar lixo", () => {
    expect(isHandwritingDocument(document("wavy"))).toBe(false);
    expect(isHandwritingDocument(document(3))).toBe(false);
  });

  it("sobrevive à ida e volta do formato compacto", () => {
    const original = document("dashed");
    const restored = unpackDocument(packDocument(original)) as typeof original;
    expect(restored.strokes[0]!.dash).toBe("dashed");
    expect(restored).toEqual(original);
  });
});
