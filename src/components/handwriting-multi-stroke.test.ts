import { describe, expect, it } from "vitest";
import {
  MAX_RECENT_LINES,
  RECENT_LINE_WINDOW_MS,
  combineWithRecentLines,
  pruneRecentLines,
} from "./handwriting-multi-stroke";
import { closeLines, type LineSegment } from "./handwriting-shapes";
import type { Stroke } from "./handwriting-types";

const seg = (ax: number, ay: number, bx: number, by: number): LineSegment => ({
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
});

function rotate(points: [number, number][], degrees: number, cx: number, cy: number) {
  const r = (degrees * Math.PI) / 180;
  return points.map(([x, y]): [number, number] => [
    cx + (x - cx) * Math.cos(r) - (y - cy) * Math.sin(r),
    cy + (x - cx) * Math.sin(r) + (y - cy) * Math.cos(r),
  ]);
}

// As retas de um polígono fechado, com `gap` de folga em cada canto (negativa passa do canto).
function sides(corners: [number, number][], gap = 0, flip = false): LineSegment[] {
  return corners.map((from, index) => {
    const to = corners[(index + 1) % corners.length]!;
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const ux = (to[0] - from[0]) / length;
    const uy = (to[1] - from[1]) / length;
    const a = seg(from[0] + ux * gap, from[1] + uy * gap, to[0] - ux * gap, to[1] - uy * gap);
    return flip && index % 2 === 1 ? { a: a.b, b: a.a } : a;
  });
}

const nearestDistance = (points: { x: number; y: number }[], target: [number, number]) =>
  Math.min(...points.map((p) => Math.hypot(p.x - target[0], p.y - target[1])));

describe("fechar formas com várias retas", () => {
  const triangle: [number, number][] = [
    [300, 200],
    [600, 600],
    [100, 600],
  ];

  it("três retas viram um triângulo, mesmo com folga nos cantos e sentidos diferentes", () => {
    const closed = closeLines(sides(triangle, 14, true))!;
    expect(closed.kind).toBe("triangle");
    expect(closed.used.sort()).toEqual([0, 1, 2]);
    for (const corner of triangle) expect(nearestDistance(closed.points, corner)).toBeLessThan(1);
  });

  it("retas que passam do canto também fecham", () => {
    expect(closeLines(sides(triangle, -18))?.kind).toBe("triangle");
  });

  it("quatro retas alinhadas viram um retângulo exato", () => {
    const box: [number, number][] = [
      [200, 300],
      [600, 300],
      [600, 560],
      [200, 560],
    ];
    const closed = closeLines(sides(box, 10))!;
    expect(closed.kind).toBe("rectangle");
    for (const corner of box) expect(nearestDistance(closed.points, corner)).toBeLessThan(1);
    for (const p of closed.points) {
      const onEdge =
        Math.abs(p.x - 200) < 1e-6 ||
        Math.abs(p.x - 600) < 1e-6 ||
        Math.abs(p.y - 300) < 1e-6 ||
        Math.abs(p.y - 560) < 1e-6;
      expect(onEdge).toBe(true);
    }
  });

  it("um retângulo com 3 graus de inclinação sai alinhado, e com 30 graus sai girado", () => {
    const base: [number, number][] = [
      [200, 300],
      [600, 300],
      [600, 560],
      [200, 560],
    ];
    const slight = closeLines(sides(rotate(base, 3, 400, 430), 8))!;
    expect(slight.kind).toBe("rectangle");
    const ys = slight.points.map((p) => p.y);
    expect(ys.filter((y) => Math.abs(y - Math.min(...ys)) < 1e-6).length).toBeGreaterThan(5);
    const turned = rotate(base, 30, 400, 430);
    const closed = closeLines(sides(turned, 8))!;
    expect(closed.kind).toBe("rectangle");
    for (const corner of turned) expect(nearestDistance(closed.points, corner)).toBeLessThan(2);
  });

  it("um trapézio vira polígono, não retângulo", () => {
    const trapezoid: [number, number][] = [
      [250, 300],
      [550, 300],
      [650, 560],
      [150, 560],
    ];
    expect(closeLines(sides(trapezoid, 6))?.kind).toBe("polygon");
  });

  it("uma reta perdida no meio é ignorada e usa só as que fecham", () => {
    const lines = [seg(900, 100, 1000, 180), ...sides(triangle, 8)];
    const closed = closeLines(lines)!;
    expect(closed.kind).toBe("triangle");
    expect(closed.used).not.toContain(0);
    expect(closed.used).toContain(lines.length - 1);
  });

  it("não fecha com duas retas, com retas que não se encontram nem com duas paralelas", () => {
    expect(closeLines(sides(triangle).slice(0, 2))).toBeNull();
    expect(closeLines(sides(triangle, 120))).toBeNull();
    expect(
      closeLines([seg(100, 100, 500, 100), seg(100, 300, 500, 300), seg(100, 500, 500, 500)]),
    ).toBeNull();
  });

  it("não fecha com lados curtos demais", () => {
    expect(
      closeLines(
        sides([
          [100, 100],
          [130, 100],
          [115, 125],
        ]),
      ),
    ).toBeNull();
  });

  it("a forma sempre inclui a reta mais nova", () => {
    const old = sides(triangle, 8);
    const lines = [...old, seg(900, 100, 1000, 180)];
    expect(closeLines(lines)).toBeNull();
  });
});

describe("retas acertadas recentes", () => {
  const style = { tool: "pen" as const, brush: "fine" as const, color: "#17151c", width: 4 };
  const stroke = (id: string, s: LineSegment, extra: Partial<Stroke> = {}): Stroke => ({
    id,
    ...style,
    ...extra,
    points: [
      { x: s.a.x, y: s.a.y, pressure: 0.5 },
      { x: s.b.x, y: s.b.y, pressure: 0.5 },
    ],
  });
  const corners: [number, number][] = [
    [300, 200],
    [600, 600],
    [100, 600],
  ];
  const [s1, s2, s3] = sides(corners, 8) as [LineSegment, LineSegment, LineSegment];
  const ids = () => {
    let n = 0;
    return () => `novo-${++n}`;
  };

  it("junta as retas recentes com a nova em um traço fechado do mesmo estilo", () => {
    const existing = [stroke("a", s1), stroke("b", s2)];
    const latest = stroke("c", s3);
    const result = combineWithRecentLines(
      existing,
      [
        { id: "a", time: 0 },
        { id: "b", time: 100 },
      ],
      latest,
      ids(),
    )!;
    expect(result.remove.sort()).toEqual(["a", "b"]);
    expect(result.stroke.id).toBe("novo-1");
    expect(result.stroke).toMatchObject({ ...style });
    expect(result.stroke.points.length).toBeGreaterThan(10);
  });

  it("ignora retas de outro estilo, cor ou espessura e as que sumiram", () => {
    const latest = stroke("c", s3);
    const recent = [
      { id: "a", time: 0 },
      { id: "b", time: 0 },
    ];
    expect(
      combineWithRecentLines(
        [stroke("a", s1), stroke("b", s2, { color: "#7c3aed" })],
        recent,
        latest,
        ids(),
      ),
    ).toBeNull();
    expect(
      combineWithRecentLines(
        [stroke("a", s1), stroke("b", s2, { width: 8 })],
        recent,
        latest,
        ids(),
      ),
    ).toBeNull();
    expect(combineWithRecentLines([stroke("a", s1)], recent, latest, ids())).toBeNull();
  });

  it("uma reta de cobertura da borracha de fundo nunca entra", () => {
    const latest = stroke("c", s3);
    expect(
      combineWithRecentLines(
        [stroke("a", s1), stroke("b", s2, { cover: true })],
        [
          { id: "a", time: 0 },
          { id: "b", time: 0 },
        ],
        latest,
        ids(),
      ),
    ).toBeNull();
  });

  it("a lista esquece o que venceu, o que foi apagado e o que passa do limite", () => {
    const strokes = ["a", "b", "c", "d", "e", "f", "g"].map((id) => stroke(id, s1));
    const recent = ["a", "b", "c", "d", "e", "f", "g"].map((id, index) => ({ id, time: index }));
    expect(pruneRecentLines(recent, 10, strokes)).toHaveLength(MAX_RECENT_LINES);
    expect(pruneRecentLines(recent, RECENT_LINE_WINDOW_MS + 3, strokes).map((l) => l.id)).toEqual([
      "d",
      "e",
      "f",
      "g",
    ]);
    expect(
      pruneRecentLines(
        recent,
        10,
        strokes.filter((s) => s.id !== "g"),
      ).map((l) => l.id),
    ).not.toContain("g");
  });
});
