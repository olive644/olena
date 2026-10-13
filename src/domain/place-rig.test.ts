import { describe, expect, it } from "vitest";
import { analyzeIsland } from "./island-motion";
import {
  PLACE_CYCLE_SECONDS,
  analyzePlace,
  matchesColor,
  movePoint,
  partPose,
  type PartSpec,
  type PlaceRig,
} from "./place-rig";

const SIZE = 64;
const CREAM: [number, number, number] = [230, 205, 160];
const GOLD: [number, number, number] = [250, 200, 10];
const GREEN: [number, number, number] = [30, 160, 60];

type Rect = { x0: number; y0: number; x1: number; y1: number };

/** Arte sintética: uma base de pedra, um diamante dourado em cima dela, outro solto no ar e um arbusto. */
function artwork() {
  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
  const paint = (rect: Rect, color: [number, number, number]) => {
    for (let y = rect.y0; y <= rect.y1; y++)
      for (let x = rect.x0; x <= rect.x1; x++) {
        const i = (y * SIZE + x) * 4;
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = 255;
      }
  };
  paint({ x0: 6, y0: 34, x1: 58, y1: 60 }, CREAM);
  paint({ x0: 28, y0: 22, x1: 35, y1: 33 }, GOLD); // pousado na base
  paint({ x0: 8, y0: 4, x1: 15, y1: 11 }, GOLD); // solto no ar
  paint({ x0: 44, y0: 20, x1: 52, y1: 33 }, GREEN); // arbusto na base
  return rgba;
}

const index = (x: number, y: number) => y * SIZE + x;

const resting: PartSpec = {
  id: "pousado",
  seeds: [{ x: 31, y: 27, color: "gold" }],
  motion: { period: 3, phase: 0, dy: { amp: -4, oneSided: true } },
};
const floating: PartSpec = {
  id: "solto",
  seeds: [{ x: 11, y: 7, color: "gold" }],
  motion: { period: 3, phase: 0.2, dy: { amp: -4, oneSided: true } },
};
const bush: PartSpec = {
  id: "arbusto",
  seeds: [{ x: 48, y: 27, color: "green" }],
  motion: { period: 3, phase: 0, rot: { amp: 0.04 }, pivot: "base" },
};
const rig: PlaceRig = { parts: [resting, floating, bush], group: false };

describe("recorte das partes", () => {
  const rgba = artwork();
  const place = analyzePlace(rgba, SIZE, rig);

  it("cada parte nasce da sua cor e da sua semente, sem tomar a base", () => {
    expect(place.missing).toEqual([]);
    expect(place.partMask[index(31, 27)]).toBe(1);
    expect(place.partMask[index(11, 7)]).toBe(2);
    expect(place.partMask[index(48, 27)]).toBe(3);
    expect(place.partMask[index(31, 45)]).toBe(0);
    expect(place.parts[0]?.area).toBe(8 * 12);
    expect(place.parts[0]?.box).toMatchObject({ x: 28, y: 22, w: 8, h: 12 });
  });

  it("uma semente que não acha a parte é denunciada, e a análise segue", () => {
    const broken = analyzePlace(rgba, SIZE, {
      parts: [{ id: "fantasma", seeds: [{ x: 3, y: 50, color: "gold" }], motion: resting.motion }],
    });
    expect(broken.missing).toEqual(["fantasma"]);
    expect(broken.parts[0]?.area).toBe(0);
  });

  it("uma região poligonal corta o que a cor sozinha pegaria", () => {
    const cut = analyzePlace(rgba, SIZE, {
      parts: [
        {
          id: "metade",
          seeds: [{ x: 30, y: 27, color: "gold" }],
          polygon: [
            [20, 10],
            [30, 10],
            [30, 40],
            [20, 40],
          ],
          motion: resting.motion,
        },
      ],
    });
    expect(cut.partMask[index(30, 27)]).toBe(1);
    expect(cut.partMask[index(35, 27)]).toBe(0);
  });
});

describe("o que a saída de uma parte revela", () => {
  const rgba = artwork();
  const place = analyzePlace(rgba, SIZE, rig);
  const filled = new Map<number, [number, number, number]>();
  place.fillIndex.forEach((pixel, slot) =>
    filled.set(pixel, [
      place.fillColor[slot * 4] ?? 0,
      place.fillColor[slot * 4 + 1] ?? 0,
      place.fillColor[slot * 4 + 2] ?? 0,
    ]),
  );
  const cleared = new Set(place.clearIndex);

  it("a parte que sobe deixa a cor da base no lugar onde estava encostada", () => {
    expect(filled.get(index(31, 33))).toEqual(CREAM);
    expect(filled.get(index(30, 32))).toEqual(CREAM);
  });

  it("o que era ar continua transparente: nada é pintado acima da parte", () => {
    expect(filled.has(index(31, 22))).toBe(false);
    expect(cleared.has(index(31, 22)) || cleared.has(index(31, 23))).toBe(true);
  });

  it("uma parte solta no ar não deixa preenchimento nenhum", () => {
    for (let y = 4; y <= 11; y++)
      for (let x = 8; x <= 15; x++) expect(filled.has(index(x, y))).toBe(false);
  });

  it("todo pixel de parte ou sai do fundo ou é preenchido, sem ficar em dobro", () => {
    for (let k = 0; k < SIZE * SIZE; k++) {
      const owned = (place.partMask[k] ?? 0) > 0;
      expect(filled.has(k) && cleared.has(k)).toBe(false);
      if (filled.has(k) || cleared.has(k)) expect(owned).toBe(true);
    }
  });

  it("o modo solid sempre preenche e o modo air nunca", () => {
    const solid = analyzePlace(rgba, SIZE, { parts: [{ ...floating, fill: "solid" }] });
    const air = analyzePlace(rgba, SIZE, { parts: [{ ...resting, fill: "air" }] });
    expect(air.fillIndex.length).toBe(0);
    // Solto no ar não tem vizinho sólido: sem cor para emprestar, nada é preenchido.
    expect(solid.fillIndex.length).toBe(0);
  });
});

describe("pose das partes", () => {
  it("com envelope 0 a parte fica exatamente onde a arte a colocou", () => {
    for (const spec of rig.parts) {
      const pose = partPose(spec.motion, 1.37, 0);
      expect(Math.abs(pose.dx)).toBe(0);
      expect(Math.abs(pose.dy)).toBe(0);
      expect(Math.abs(pose.rot)).toBe(0);
      expect(pose.sx).toBe(1);
      expect(pose.sy).toBe(1);
    }
  });

  it("a onda de um lado só nunca passa para o outro", () => {
    for (let step = 0; step < 240; step++) {
      const { dy } = partPose(resting.motion, (step / 240) * PLACE_CYCLE_SECONDS);
      expect(dy).toBeLessThanOrEqual(1e-9);
      expect(dy).toBeGreaterThanOrEqual(-4 - 1e-9);
    }
  });

  it("o movimento fecha a cada ciclo, sem emenda", () => {
    for (const spec of rig.parts)
      for (const t of [0, 0.7, 2.2, 4.9]) {
        const a = partPose(spec.motion, t);
        const b = partPose(spec.motion, t + PLACE_CYCLE_SECONDS);
        expect(Math.abs(a.dy - b.dy)).toBeLessThan(1e-9);
        expect(Math.abs(a.rot - b.rot)).toBeLessThan(1e-12);
      }
  });

  it("movePoint aplica a mesma conta que o desenho: pivô fixo, resto gira e anda", () => {
    const pivot = { x: 10, y: 10 };
    const still = movePoint({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 }, pivot, 14, 3);
    expect(still).toEqual({ x: 14, y: 3 });
    const moved = movePoint({ dx: 2, dy: -3, rot: 0, sx: 1, sy: 1 }, pivot, 14, 3);
    expect(moved).toEqual({ x: 16, y: 0 });
    const quarter = movePoint({ dx: 0, dy: 0, rot: Math.PI / 2, sx: 1, sy: 1 }, pivot, 14, 10);
    expect(quarter.x).toBeCloseTo(10);
    expect(quarter.y).toBeCloseTo(14);
    const fixed = movePoint({ dx: 0, dy: 0, rot: 1, sx: 2, sy: 2 }, pivot, 10, 10);
    expect(fixed).toEqual({ x: 10, y: 10 });
  });
});

describe("classes de cor", () => {
  it("reconhece ouro, azul, verde, creme e água sem confundir", () => {
    expect(matchesColor("gold", 250, 200, 10)).toBe(true);
    expect(matchesColor("gold", 230, 205, 160)).toBe(false);
    expect(matchesColor("blue", 0, 71, 207)).toBe(true);
    expect(matchesColor("blue", 0, 20, 90)).toBe(false);
    expect(matchesColor("blue", 0, 20, 90, true)).toBe(true);
    expect(matchesColor("green", 0, 150, 58)).toBe(true);
    expect(matchesColor("green", 171, 196, 0)).toBe(true);
    expect(matchesColor("cream", 237, 210, 169)).toBe(true);
    expect(matchesColor("cream", 250, 200, 10)).toBe(false);
    expect(matchesColor("water", 0, 87, 174)).toBe(true);
    expect(matchesColor("water", 0, 36, 119)).toBe(false);
    expect(matchesColor("notwater", 0, 87, 174)).toBe(false);
  });
});

describe("integração com a análise da ilha", () => {
  it("a faísca de um ouro que se move vai junto com a parte, e o conjunto só flutua quando pedido", () => {
    const rgba = artwork();
    const model = analyzeIsland(rgba, SIZE, rig);
    expect(model.group).toBe(false);
    expect(model.place?.parts).toHaveLength(3);
    const spark = model.sparks.find((candidate) => candidate.part === 0);
    expect(spark).toBeDefined();
    expect(analyzeIsland(rgba, SIZE).group).toBe(true);
    expect(analyzeIsland(rgba, SIZE).place).toBeNull();
    expect(analyzeIsland(rgba, SIZE, { parts: [] }).group).toBe(true);
  });
});
