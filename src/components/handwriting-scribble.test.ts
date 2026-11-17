import { describe, expect, it } from "vitest";
import type { HandwritingPoint } from "../domain/handwriting";
import { recognizeScribble, scribbleTargets } from "./handwriting-scribble";

const pt = (x: number, y: number): HandwritingPoint => ({ x, y, pressure: 0.5 });

// Zigue-zague de rabiscar: `passes` passadas de ida e volta de `width` unidades, descendo `drop`.
function scratch(
  passes: number,
  width: number,
  drop: number,
  x0 = 100,
  y0 = 100,
  vertical = false,
) {
  const points: HandwritingPoint[] = [];
  const perPass = 14;
  for (let pass = 0; pass < passes; pass += 1)
    for (let step = 0; step <= perPass; step += 1) {
      const t = step / perPass;
      const along = pass % 2 === 0 ? t * width : (1 - t) * width;
      const across = ((pass + t) / passes) * drop;
      points.push(vertical ? pt(x0 + across, y0 + along) : pt(x0 + along, y0 + across));
    }
  return points;
}

describe("reconhecer o rabisco", () => {
  it("aceita um zigue-zague de várias passadas, na horizontal, na vertical e inclinado", () => {
    expect(recognizeScribble(scratch(6, 120, 40))).not.toBeNull();
    expect(recognizeScribble(scratch(6, 120, 40, 100, 100, true))).not.toBeNull();
    const tilted = scratch(6, 120, 40).map((p) => pt(p.x + p.y * 0.4, p.y - p.x * 0.3));
    expect(recognizeScribble(tilted)).not.toBeNull();
  });

  it("recusa cursiva emendada, que é a queixa mais comum desse gesto", () => {
    // "eeeeee": o traço anda para a frente e só volta um pouco em cada laço
    const cursive: HandwritingPoint[] = [];
    for (let i = 0; i <= 240; i += 1) {
      const t = i / 240;
      cursive.push(
        pt(
          100 + 300 * t + 9 * Math.sin(Math.PI * 2 * 8 * t),
          100 + 14 * Math.cos(Math.PI * 2 * 8 * t),
        ),
      );
    }
    expect(recognizeScribble(cursive)).toBeNull();
  });

  it("recusa onda, reta, círculo e traço curto", () => {
    const wave = Array.from({ length: 80 }, (_, i) => pt(100 + i * 4, 100 + Math.sin(i / 3) * 12));
    expect(recognizeScribble(wave)).toBeNull();
    const line = Array.from({ length: 40 }, (_, i) => pt(100 + i * 5, 100));
    expect(recognizeScribble(line)).toBeNull();
    const circle = Array.from({ length: 60 }, (_, i) =>
      pt(200 + Math.cos((i / 60) * Math.PI * 2) * 40, 200 + Math.sin((i / 60) * Math.PI * 2) * 40),
    );
    expect(recognizeScribble(circle)).toBeNull();
    expect(recognizeScribble(scratch(6, 14, 6))).toBeNull();
    expect(recognizeScribble([pt(0, 0), pt(10, 10)])).toBeNull();
  });

  it("pede idas e vindas suficientes: três passadas ainda é um risco comum", () => {
    expect(recognizeScribble(scratch(3, 120, 30))).toBeNull();
    expect(recognizeScribble(scratch(5, 120, 30))).not.toBeNull();
  });

  it("dá um alcance da tinta riscada dentro dos limites", () => {
    const tight = recognizeScribble(scratch(8, 120, 8))!;
    const wide = recognizeScribble(scratch(6, 120, 100))!;
    expect(tight.reach).toBeGreaterThanOrEqual(7);
    expect(wide.reach).toBeLessThanOrEqual(22);
    expect(wide.reach).toBeGreaterThan(tight.reach);
  });
});

describe("quais traços o rabisco apaga", () => {
  const scribble = scratch(6, 130, 36, 95, 100); // cobre x 95 a 225, y 100 a 136
  const reach = recognizeScribble(scribble)!.reach;
  const stroke = (id: string, points: [number, number][], extra = {}) => ({
    id,
    points: points.map(([x, y]) => pt(x, y)),
    ...extra,
  });
  const word = [
    stroke("t", [
      [110, 110],
      [112, 125],
      [118, 132],
    ]),
    stroke("e", [
      [130, 118],
      [145, 114],
      [150, 124],
      [138, 130],
    ]),
    stroke("s", [
      [165, 112],
      [180, 116],
      [168, 128],
      [190, 132],
    ]),
  ];

  it("apaga todos os traços da palavra riscada, inteiros", () => {
    expect(scribbleTargets(scribble, word, reach)).toEqual(["t", "e", "s"]);
  });

  it("deixa o que está longe do rabisco", () => {
    const far = stroke("longe", [
      [400, 400],
      [420, 410],
    ]);
    expect(scribbleTargets(scribble, [...word, far], reach)).toEqual(["t", "e", "s"]);
  });

  it("não apaga um traço comprido que só atravessa o rabisco", () => {
    const ruled = stroke("pauta", [
      [0, 118],
      [600, 118],
    ]);
    expect(scribbleTargets(scribble, [ruled], reach)).toEqual([]);
  });

  it("apaga também um pingo, ignora o traço de fundo apagado e o próprio rabisco", () => {
    const dot = stroke("pingo", [[160, 118]]);
    const cover = stroke(
      "fundo",
      [
        [130, 118],
        [150, 118],
      ],
      { cover: true },
    );
    const itself = stroke("rabisco", [
      [130, 118],
      [150, 118],
    ]);
    expect(scribbleTargets(scribble, [dot, cover, itself], reach, "rabisco")).toEqual(["pingo"]);
  });

  it("rabisco em lugar vazio não apaga nada", () => {
    expect(scribbleTargets(scribble, [], reach)).toEqual([]);
    expect(
      scribbleTargets(
        scribble,
        [
          stroke("outro", [
            [700, 700],
            [720, 700],
          ]),
        ],
        reach,
      ),
    ).toEqual([]);
  });
});
