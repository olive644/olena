import { describe, expect, it } from "vitest";
import { createShapeAdjuster } from "./handwriting-shape-adjust";
import { canonicalShape, recognizeShape } from "./handwriting-shapes";

const box = { x: 100, y: 100, width: 200, height: 120 };

describe("ajuste ao vivo da forma acertada", () => {
  it("a reta segue a caneta a partir da ponta fixa e encaixa a cada 15 graus", () => {
    const line = { kind: "line" as const, points: canonicalShape("line", box) };
    const adjust = createShapeAdjuster(line, { x: 300, y: 160 })!;
    const start = line.points[0]!;
    const near = adjust({ x: start.x + 200, y: start.y + 116 }); // ~30,1 graus
    const end = near.points.at(-1)!;
    expect(near.points[0]).toMatchObject({ x: start.x, y: start.y });
    expect(near.detail).toBe("30°");
    expect(Math.atan2(end.y - start.y, end.x - start.x)).toBeCloseTo(Math.PI / 6, 6);
    const free = adjust({ x: start.x + 200, y: start.y + 90 }); // ~24,2 graus, sem ímã
    expect(Number(free.detail.replace("°", ""))).toBe(24);
  });

  it("a seta refaz as farpas acompanhando o novo cabo", () => {
    const arrow = { kind: "arrow" as const, points: canonicalShape("arrow", box) };
    const adjust = createShapeAdjuster(arrow, { x: 300, y: 160 })!;
    const tail = arrow.points[0]!;
    const turned = adjust({ x: tail.x, y: tail.y + 150 });
    expect(turned.detail).toBe("90°");
    const xs = turned.points.map((point) => point.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(20); // farpas abertas dos lados
    expect(turned.points[Math.floor(turned.points.length / 2)]).toBeDefined();
  });

  it("forma fechada muda de tamanho com a distância da caneta e volta ao original no ímã", () => {
    const circle = { kind: "ellipse" as const, points: canonicalShape("ellipse", box) };
    const adjust = createShapeAdjuster(circle, { x: 300, y: 160 })!;
    const same = adjust({ x: 301, y: 160 });
    expect(same.detail).toBe("100%");
    expect(same.points[0]!.x).toBeCloseTo(circle.points[0]!.x, 6);
    const double = adjust({ x: 100 + 100 + 200, y: 160 });
    expect(Number.parseInt(double.detail, 10)).toBeGreaterThanOrEqual(198);
    expect(Number.parseInt(double.detail, 10)).toBeLessThanOrEqual(202);
    const widths = double.points.map((point) => point.x);
    expect(Math.max(...widths) - Math.min(...widths)).toBeCloseTo(400, -1);
  });

  it("girar a caneta gira a forma, com ímã no zero e a cada 15 graus", () => {
    const rectangle = { kind: "rectangle" as const, points: canonicalShape("rectangle", box) };
    const adjust = createShapeAdjuster(rectangle, { x: 300, y: 160 })!;
    const turned = adjust({ x: 200 + 200 * Math.cos(0.5236), y: 160 + 200 * Math.sin(0.5236) });
    // 30 graus, e o raio mudou de 100 para 200: dobrou de tamanho e girou 30.
    expect(Number.parseInt(turned.detail, 10)).toBeGreaterThanOrEqual(198);
    const a = turned.points[0]!;
    const b = turned.points[1]!;
    expect(Math.atan2(b.y - a.y, b.x - a.x)).toBeCloseTo(Math.PI / 6, 1);
  });

  it("sem espaço para medir a direção (ponto no centro) não cria ajuste", () => {
    const circle = { kind: "ellipse" as const, points: canonicalShape("ellipse", box) };
    expect(createShapeAdjuster(circle, { x: 200, y: 160 })).toBeNull();
  });
});

describe("regularização de círculo, quadrado e ângulos de 15 graus", () => {
  function ring(rx: number, ry: number) {
    return Array.from({ length: 80 }, (_, index) => {
      const angle = (index / 80) * Math.PI * 2;
      return { x: 300 + Math.cos(angle) * rx, y: 300 + Math.sin(angle) * ry, pressure: 0.5 };
    });
  }
  it("uma elipse quase redonda vira círculo perfeito", () => {
    const shape = recognizeShape(ring(120, 112))!;
    expect(shape.kind).toBe("ellipse");
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(Math.max(...ys) - Math.min(...ys), 3);
  });
  it("uma elipse de verdade continua elipse", () => {
    const shape = recognizeShape(ring(140, 80))!;
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(
      (Math.max(...ys) - Math.min(...ys)) * 1.5,
    );
  });
  it("uma reta a 31 graus encaixa em 30; a 36 graus fica como foi feita", () => {
    const at = (deg: number) => {
      const r = (deg * Math.PI) / 180;
      return Array.from({ length: 40 }, (_, i) => ({
        x: 100 + Math.cos(r) * i * 8,
        y: 100 + Math.sin(r) * i * 8,
        pressure: 0.5,
      }));
    };
    const snapped = recognizeShape(at(31))!;
    const end = snapped.points.at(-1)!;
    expect((Math.atan2(end.y - 100, end.x - 100) * 180) / Math.PI).toBeCloseTo(30, 3);
    const free = recognizeShape(at(36))!;
    const freeEnd = free.points.at(-1)!;
    expect((Math.atan2(freeEnd.y - 100, freeEnd.x - 100) * 180) / Math.PI).toBeCloseTo(36, 0);
  });
});
