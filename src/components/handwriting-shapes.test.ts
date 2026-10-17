import { describe, expect, it } from "vitest";
import { canonicalShape, recognizeShape, type ShapeKind } from "./handwriting-shapes";
import type { HandwritingPoint } from "../domain/handwriting";

// Gera pontos ao longo de uma linha poligonal, com um tremor determinístico.
function trace(vertices: [number, number][], wobble = 0, step = 8): HandwritingPoint[] {
  const points: HandwritingPoint[] = [];
  let counter = 0;
  for (let index = 1; index < vertices.length; index += 1) {
    const [x1, y1] = vertices[index - 1]!;
    const [x2, y2] = vertices[index]!;
    const length = Math.hypot(x2 - x1, y2 - y1);
    const count = Math.max(1, Math.round(length / step));
    for (let cursor = 0; cursor < count; cursor += 1) {
      const t = cursor / count;
      counter += 1;
      points.push({
        x: x1 + (x2 - x1) * t + Math.sin(counter * 1.7) * wobble,
        y: y1 + (y2 - y1) * t + Math.cos(counter * 2.3) * wobble,
        pressure: 0.5,
      });
    }
  }
  const [lx, ly] = vertices.at(-1)!;
  points.push({ x: lx, y: ly, pressure: 0.5 });
  return points;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, wobble = 0): HandwritingPoint[] {
  return Array.from({ length: 80 }, (_, index) => {
    const angle = (index / 80) * Math.PI * 2;
    return {
      x: cx + Math.cos(angle) * rx + Math.sin(index * 1.9) * wobble,
      y: cy + Math.sin(angle) * ry + Math.cos(index * 2.7) * wobble,
      pressure: 0.5,
    };
  });
}

describe("reconhecer formas", () => {
  it("uma reta torta vira uma reta de verdade", () => {
    const shape = recognizeShape(
      trace(
        [
          [100, 100],
          [400, 120],
        ],
        2,
      ),
    );
    expect(shape?.kind).toBe("line");
    const start = shape!.points[0]!;
    const end = shape!.points.at(-1)!;
    expect(Math.abs(start.x - 100)).toBeLessThan(5);
    expect(Math.abs(start.y - 100)).toBeLessThan(5);
    expect(end.x).toBeGreaterThan(390);
  });

  it("uma elipse tremida vira uma elipse regular", () => {
    const shape = recognizeShape(ellipse(300, 300, 120, 80, 3));
    expect(shape?.kind).toBe("ellipse");
    const xs = shape!.points.map((point) => point.x);
    expect(Math.min(...xs)).toBeGreaterThan(170);
    expect(Math.max(...xs)).toBeLessThan(430);
  });

  it("um círculo é reconhecido", () => {
    expect(recognizeShape(ellipse(500, 500, 100, 100, 2))?.kind).toBe("ellipse");
  });

  it("um retângulo com cantos arredondados vira retângulo", () => {
    const shape = recognizeShape(
      trace(
        [
          [100, 100],
          [400, 100],
          [400, 300],
          [100, 300],
          [100, 105],
        ],
        3,
      ),
    );
    expect(shape?.kind).toBe("rectangle");
    const xs = shape!.points.map((point) => point.x);
    expect(Math.abs(Math.min(...xs) - 100)).toBeLessThan(6);
    expect(Math.abs(Math.max(...xs) - 400)).toBeLessThan(6);
  });

  it("um triângulo vira triângulo", () => {
    const shape = recognizeShape(
      trace(
        [
          [200, 100],
          [350, 350],
          [50, 350],
          [200, 110],
        ],
        3,
      ),
    );
    expect(shape?.kind).toBe("triangle");
  });

  it("um pentágono vira polígono", () => {
    const shape = recognizeShape(
      trace(
        [
          [120, 120],
          [320, 100],
          [380, 260],
          [220, 380],
          [80, 260],
          [120, 125],
        ],
        2,
      ),
    );
    expect(shape?.kind).toBe("polygon");
    expect(shape!.points.length).toBeGreaterThan(20);
  });

  it("uma seta com cabo e farpas vira seta", () => {
    const shape = recognizeShape(
      trace(
        [
          [100, 300],
          [400, 300],
          [340, 260],
          [400, 300],
          [340, 340],
        ],
        1,
      ),
    );
    expect(shape?.kind).toBe("arrow");
    const xs = shape!.points.map((point) => point.x);
    expect(Math.min(...xs)).toBeLessThan(110);
    expect(Math.max(...xs)).toBeGreaterThan(390);
  });

  it("uma seta na vertical, de baixo para cima, também é reconhecida", () => {
    const shape = recognizeShape(
      trace(
        [
          [300, 500],
          [300, 150],
          [340, 210],
          [300, 150],
          [260, 210],
        ],
        1,
      ),
    );
    expect(shape?.kind).toBe("arrow");
  });

  it("um rabisco, uma letra curta e uma curva aberta não viram forma", () => {
    expect(
      recognizeShape(
        trace([
          [0, 0],
          [20, 10],
          [30, 0],
        ]),
      ),
    ).toBeNull();
    const arc = Array.from({ length: 30 }, (_, index) => ({
      x: 200 + Math.cos(index / 12) * 150,
      y: 200 + Math.sin(index / 12) * 150,
      pressure: 0.5,
    }));
    expect(recognizeShape(arc)).toBeNull();
    expect(
      recognizeShape(
        trace(
          [
            [100, 100],
            [300, 300],
            [120, 320],
            [320, 120],
            [160, 140],
          ],
          1,
        ),
      ),
    ).toBeNull();
  });

  it("o traço gerado é liso e mantém a pressão média", () => {
    const shape = recognizeShape(
      trace(
        [
          [100, 100],
          [400, 100],
        ],
        1,
      ),
    );
    expect(shape!.points.length).toBeGreaterThan(30);
    expect(shape!.points.every((point) => point.pressure === 0.5)).toBe(true);
  });
});

describe("forma pronta, sem desenhar (alternativa por teclado)", () => {
  const box = { x: 100, y: 200, width: 300, height: 150 };

  it("cada forma cabe dentro da caixa pedida e tem mais de um ponto", () => {
    const kinds: ShapeKind[] = ["line", "ellipse", "rectangle", "triangle", "polygon", "arrow"];
    for (const kind of kinds) {
      const points = canonicalShape(kind, box);
      expect(points.length).toBeGreaterThan(1);
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(point.x).toBeLessThanOrEqual(box.x + box.width + 1);
        expect(point.y).toBeGreaterThanOrEqual(box.y - 1);
        expect(point.y).toBeLessThanOrEqual(box.y + box.height + 1);
      }
    }
  });

  it("a reta vai de um lado ao outro da caixa, na metade da altura", () => {
    const points = canonicalShape("line", box);
    expect(points[0]).toMatchObject({ x: box.x, y: box.y + box.height / 2 });
    expect(points.at(-1)).toMatchObject({ x: box.x + box.width, y: box.y + box.height / 2 });
  });

  it("o retângulo tem os quatro cantos da caixa", () => {
    const points = canonicalShape("rectangle", box);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(box.x, 6);
    expect(Math.max(...xs)).toBeCloseTo(box.x + box.width, 6);
    expect(Math.min(...ys)).toBeCloseTo(box.y, 6);
    expect(Math.max(...ys)).toBeCloseTo(box.y + box.height, 6);
  });

  it("a seta tem cabo e ponta em V, reconhecidos de volta como seta", () => {
    const points = canonicalShape("arrow", box);
    const recognized = recognizeShape(points);
    expect(recognized?.kind).toBe("arrow");
  });

  it("usa a pressão pedida em todos os pontos", () => {
    const points = canonicalShape("ellipse", box, 0.8);
    expect(points.every((point) => point.pressure === 0.8)).toBe(true);
  });
});

function rotate(vertices: [number, number][], degrees: number, cx: number, cy: number) {
  const radians = (degrees * Math.PI) / 180;
  return vertices.map(([x, y]): [number, number] => [
    cx + (x - cx) * Math.cos(radians) - (y - cy) * Math.sin(radians),
    cy + (x - cx) * Math.sin(radians) + (y - cy) * Math.cos(radians),
  ]);
}

// Retângulo de 300 por 160 centrado em (400, 400), fechado, girado.
function rectangleAt(degrees: number, wobble = 2) {
  const base: [number, number][] = [
    [250, 320],
    [550, 320],
    [550, 480],
    [250, 480],
    [250, 320],
  ];
  return trace(rotate(base, degrees, 400, 400), wobble);
}

function lineAtDegrees(degrees: number, length = 300) {
  const radians = (degrees * Math.PI) / 180;
  return trace(
    [
      [100, 300],
      [100 + Math.cos(radians) * length, 300 + Math.sin(radians) * length],
    ],
    0.6,
  );
}

describe("encaixe no eixo", () => {
  it("uma reta quase horizontal vira exatamente horizontal, mantendo o início e o tamanho", () => {
    const shape = recognizeShape(lineAtDegrees(3));
    expect(shape?.kind).toBe("line");
    const start = shape!.points[0]!;
    const end = shape!.points.at(-1)!;
    expect(end.y).toBeCloseTo(start.y, 6);
    expect(Math.abs(start.x - 100)).toBeLessThan(2);
    expect(Math.abs(start.y - 300)).toBeLessThan(2);
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeCloseTo(300, -1);
  });

  it("uma reta quase vertical vira exatamente vertical, para cima ou para baixo", () => {
    for (const degrees of [88, -88, 92, 272]) {
      const shape = recognizeShape(lineAtDegrees(degrees));
      expect(shape?.kind).toBe("line");
      const start = shape!.points[0]!;
      const end = shape!.points.at(-1)!;
      expect(end.x).toBeCloseTo(start.x, 6);
    }
  });

  it("uma reta que aponta para a esquerda também se encaixa", () => {
    const shape = recognizeShape(lineAtDegrees(183));
    expect(shape?.kind).toBe("line");
    const start = shape!.points[0]!;
    const end = shape!.points.at(-1)!;
    expect(end.y).toBeCloseTo(start.y, 6);
    expect(end.x).toBeLessThan(start.x - 280);
  });

  it("dentro de 5 graus encaixa; com 7 graus a inclinação é respeitada", () => {
    const near = recognizeShape(lineAtDegrees(4.5))!;
    expect(near.points.at(-1)!.y).toBeCloseTo(near.points[0]!.y, 6);
    const far = recognizeShape(lineAtDegrees(7))!;
    const rise = far.points.at(-1)!.y - far.points[0]!.y;
    const run = far.points.at(-1)!.x - far.points[0]!.x;
    expect((Math.atan2(rise, run) * 180) / Math.PI).toBeGreaterThan(6);
  });

  it("uma diagonal de 45 graus não é puxada para nenhum eixo", () => {
    const shape = recognizeShape(lineAtDegrees(45))!;
    const rise = shape.points.at(-1)!.y - shape.points[0]!.y;
    const run = shape.points.at(-1)!.x - shape.points[0]!.x;
    expect((Math.atan2(rise, run) * 180) / Math.PI).toBeCloseTo(45, 0);
  });

  it("o cabo de uma seta quase horizontal fica horizontal e as farpas ficam simétricas", () => {
    const radians = (3 * Math.PI) / 180;
    const tail: [number, number] = [100, 300];
    const head: [number, number] = [100 + Math.cos(radians) * 300, 300 + Math.sin(radians) * 300];
    const shape = recognizeShape(
      trace([tail, head, [head[0] - 40, head[1] - 22], head, [head[0] - 40, head[1] + 22]], 0.4, 6),
    );
    expect(shape?.kind).toBe("arrow");
    const ys = shape!.points.map((point) => point.y);
    const start = shape!.points[0]!;
    expect(Math.max(...ys) - start.y).toBeCloseTo(start.y - Math.min(...ys), 0);
  });
});

describe("retângulo em qualquer ângulo", () => {
  it("um retângulo girado 30 graus é reconhecido, com cantos retos e no lugar", () => {
    const shape = recognizeShape(rectangleAt(30));
    expect(shape?.kind).toBe("rectangle");
    const corners = rotate(
      [
        [250, 320],
        [550, 320],
        [550, 480],
        [250, 480],
      ],
      30,
      400,
      400,
    );
    for (const [x, y] of corners) {
      const nearest = Math.min(...shape!.points.map((p) => Math.hypot(p.x - x, p.y - y)));
      expect(nearest).toBeLessThan(10);
    }
  });

  it("um losango (quadrado a 45 graus) é reconhecido", () => {
    const diamond: [number, number][] = [
      [400, 250],
      [550, 400],
      [400, 550],
      [250, 400],
      [400, 250],
    ];
    expect(recognizeShape(trace(diamond, 2))?.kind).toBe("rectangle");
  });

  it("um retângulo com 3 graus de inclinação sai alinhado aos eixos", () => {
    const shape = recognizeShape(rectangleAt(3));
    expect(shape?.kind).toBe("rectangle");
    const xs = shape!.points.map((p) => p.x);
    const ys = shape!.points.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    for (const point of shape!.points) {
      const onVertical = Math.abs(point.x - minX) < 1e-6 || Math.abs(point.x - maxX) < 1e-6;
      const onHorizontal = Math.abs(point.y - minY) < 1e-6 || Math.abs(point.y - maxY) < 1e-6;
      expect(onVertical || onHorizontal).toBe(true);
    }
  });

  it("não confunde com retângulo uma elipse inclinada, um triângulo nem um hexágono", () => {
    const radians = (30 * Math.PI) / 180;
    const tiltedEllipse = Array.from({ length: 90 }, (_, index) => {
      const angle = (index / 90) * Math.PI * 2;
      const x = Math.cos(angle) * 140;
      const y = Math.sin(angle) * 70;
      return {
        x: 400 + x * Math.cos(radians) - y * Math.sin(radians),
        y: 400 + x * Math.sin(radians) + y * Math.cos(radians),
        pressure: 0.5,
      };
    });
    expect(recognizeShape(tiltedEllipse)?.kind).not.toBe("rectangle");
    const triangle = rotate(
      [
        [400, 250],
        [560, 520],
        [240, 520],
        [400, 250],
      ],
      20,
      400,
      400,
    );
    expect(recognizeShape(trace(triangle, 2))?.kind).toBe("triangle");
    const hexagon: [number, number][] = Array.from({ length: 7 }, (_, index) => [
      400 + Math.cos((index / 6) * Math.PI * 2) * 150,
      400 + Math.sin((index / 6) * Math.PI * 2) * 150,
    ]);
    expect(recognizeShape(trace(hexagon, 2))?.kind).toBe("polygon");
  });

  it("um retângulo girado fino demais continua sendo rejeitado", () => {
    const sliver = trace(
      rotate(
        [
          [250, 390],
          [550, 390],
          [550, 410],
          [250, 410],
          [250, 390],
        ],
        30,
        400,
        400,
      ),
      1,
    );
    expect(recognizeShape(sliver)?.kind).not.toBe("rectangle");
  });
});
