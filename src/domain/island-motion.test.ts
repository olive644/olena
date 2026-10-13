import { describe, expect, it } from "vitest";
import {
  ISLAND_CYCLE_SECONDS,
  analyzeIsland,
  glowPulse,
  groupPose,
  moteState,
  pieceOffset,
  sparkIntensity,
  stepEnvelope,
  sweepProgress,
  type IslandModel,
} from "./island-motion";

const SIZE = 96;

type Rect = { x0: number; y0: number; x1: number; y1: number };

/** Arte sintética: uma ilha larga embaixo e peças soltas em cima, com folgas conhecidas. */
function artwork() {
  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
  const paint = (rect: Rect, color: [number, number, number], alpha = 255) => {
    for (let y = rect.y0; y <= rect.y1; y++)
      for (let x = rect.x0; x <= rect.x1; x++) {
        const i = (y * SIZE + x) * 4;
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = alpha;
      }
  };
  const island: Rect = { x0: 8, y0: 50, x1: 88, y1: 90 };
  paint(island, [40, 90, 200]);
  paint({ x0: 20, y0: 60, x1: 35, y1: 75 }, [255, 200, 40]); // ouro
  const roomy: Rect = { x0: 50, y0: 8, x1: 62, y1: 22 }; // 27 pixels livres acima da ilha
  paint(roomy, [200, 60, 60]);
  const snug: Rect = { x0: 14, y0: 40, x1: 26, y1: 46 }; // 3 pixels livres acima da ilha
  paint(snug, [60, 200, 90]);
  paint({ x0: 70, y0: 20, x1: 70, y1: 20 }, [10, 10, 10]); // pontinho de 1 pixel
  paint({ x0: 49, y0: 7, x1: 63, y1: 23 }, [200, 60, 60], 5); // neblina quase invisível em volta da peça
  paint({ x0: 50, y0: 8, x1: 62, y1: 22 }, [200, 60, 60]);
  paint({ x0: 80, y0: 30, x1: 80, y1: 30 }, [255, 255, 255], 3); // neblina isolada, perto da peça certa
  return { rgba, island, roomy, snug };
}

const index = (x: number, y: number) => y * SIZE + x;

describe("separação das peças da ilha", () => {
  const { rgba } = artwork();
  const model = analyzeIsland(rgba, SIZE);

  it("a maior peça é a ilha e as soltas viram peças próprias", () => {
    expect(model.labels[index(40, 80)]).toBe(0);
    expect(model.pieces).toHaveLength(2);
    const roomy = model.pieces.find((piece) => model.labels[index(55, 15)] === piece.label);
    const snug = model.pieces.find((piece) => model.labels[index(20, 43)] === piece.label);
    expect(roomy).toBeDefined();
    expect(snug).toBeDefined();
    expect(roomy?.label).not.toBe(snug?.label);
  });

  it("pontinhos de poucos pixels ficam parados, com a ilha", () => {
    expect(model.labels[index(70, 20)]).toBe(0);
  });

  it("a neblina quase invisível anda com a peça ao lado, e a isolada vai para a mais próxima", () => {
    const roomy = model.labels[index(55, 15)] ?? -1;
    expect(model.labels[index(49, 7)]).toBe(roomy);
    expect(model.labels[index(63, 23)]).toBe(roomy);
    expect(model.labels[index(80, 30)]).toBeGreaterThanOrEqual(0);
  });

  it("nenhum pixel visível fica sem peça, e o vazio continua vazio", () => {
    for (let k = 0; k < SIZE * SIZE; k++) {
      const alpha = rgba[k * 4 + 3] ?? 0;
      if (alpha > 0) expect(model.labels[k]).toBeGreaterThanOrEqual(0);
      else expect(model.labels[k]).toBe(-1);
    }
  });
});

describe("espaço livre e trajeto das peças", () => {
  const { rgba } = artwork();
  const model = analyzeIsland(rgba, SIZE);
  const roomy = model.pieces.find((piece) => model.labels[index(55, 15)] === piece.label)!;
  const snug = model.pieces.find((piece) => model.labels[index(20, 43)] === piece.label)!;

  it("mede o espaço livre de verdade em cada direção", () => {
    expect(snug.free.down).toBe(3);
    expect(roomy.free.down).toBeGreaterThanOrEqual(14);
    expect(snug.free.up).toBeGreaterThan(snug.free.down);
  });

  it("a peça apertada anda menos do que a folgada", () => {
    expect(snug.amplitudeY * 2).toBeLessThan(roomy.amplitudeY * 2);
    expect(snug.amplitudeY).toBeGreaterThan(0);
  });

  it("nenhum instante do ciclo, em nenhum envelope, faz a peça encostar na ilha", () => {
    const solidMain = new Uint8Array(SIZE * SIZE);
    for (let k = 0; k < SIZE * SIZE; k++)
      if (model.labels[k] === 0 && (rgba[k * 4 + 3] ?? 0) > 8) solidMain[k] = 1;
    let invasions = 0;
    let checked = 0;
    for (const piece of model.pieces) {
      const pixels: number[] = [];
      for (let k = 0; k < SIZE * SIZE; k++)
        if (model.labels[k] === piece.label && (rgba[k * 4 + 3] ?? 0) > 8) pixels.push(k);
      for (let step = 0; step < 240; step++) {
        const t = (step / 240) * ISLAND_CYCLE_SECONDS;
        for (const k of [0, 0.2, 0.5, 0.8, 1]) {
          const { dx, dy } = pieceOffset(piece, t, k);
          for (const fx of [Math.floor(dx), Math.ceil(dx)])
            for (const fy of [Math.floor(dy), Math.ceil(dy)]) {
              checked++;
              for (const pixel of pixels) {
                const x = (pixel % SIZE) + fx;
                const y = Math.floor(pixel / SIZE) + fy;
                if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || solidMain[y * SIZE + x]) {
                  invasions++;
                  break;
                }
              }
            }
        }
      }
    }
    expect(checked).toBeGreaterThan(5000);
    expect(invasions).toBe(0);
  });

  it("com envelope 0 a peça fica exatamente onde a arte a colocou", () => {
    for (const piece of model.pieces) {
      const { dx, dy } = pieceOffset(piece, 1.37, 0);
      expect(Math.abs(dx)).toBe(0);
      expect(Math.abs(dy)).toBe(0);
    }
  });

  it("uma peça rente à ilha só se afasta para o lado livre, nunca para dentro", () => {
    const tight = artwork();
    // Peça a 1 pixel da ilha: não sobra espaço para baixo, mas há de sobra para cima.
    for (let x = 40; x <= 50; x++)
      for (let y = 47; y <= 48; y++) {
        const i = (y * SIZE + x) * 4;
        tight.rgba[i] = 90;
        tight.rgba[i + 1] = 90;
        tight.rgba[i + 2] = 255;
        tight.rgba[i + 3] = 255;
      }
    const crowded = analyzeIsland(tight.rgba, SIZE);
    const stuck = crowded.pieces.find((piece) => crowded.labels[index(45, 47)] === piece.label);
    expect(stuck).toBeDefined();
    expect(stuck!.free.down).toBe(1);
    let lowest = -Infinity;
    let highest = Infinity;
    for (let step = 0; step < 360; step++) {
      const { dy } = pieceOffset(stuck!, (step / 360) * ISLAND_CYCLE_SECONDS);
      lowest = Math.max(lowest, dy);
      highest = Math.min(highest, dy);
    }
    expect(lowest).toBeLessThanOrEqual(1e-9);
    expect(highest).toBeLessThan(-3);
  });
});

describe("tempo e ciclo", () => {
  const { rgba } = artwork();
  const model: IslandModel = analyzeIsland(rgba, SIZE);

  it("tudo se repete a cada ciclo, sem emenda", () => {
    for (const piece of model.pieces) {
      for (const t of [0, 0.7, 2.2, 4.9]) {
        const a = pieceOffset(piece, t);
        const b = pieceOffset(piece, t + ISLAND_CYCLE_SECONDS);
        expect(Math.abs(a.dx - b.dx)).toBeLessThan(1e-9);
        expect(Math.abs(a.dy - b.dy)).toBeLessThan(1e-9);
      }
    }
    const pose = groupPose(1.1);
    const again = groupPose(1.1 + ISLAND_CYCLE_SECONDS);
    expect(Math.abs(pose.bob - again.bob)).toBeLessThan(1e-9);
    expect(Math.abs(pose.rotation - again.rotation)).toBeLessThan(1e-12);
    expect(Math.abs(glowPulse(0.4) - glowPulse(0.4 + ISLAND_CYCLE_SECONDS))).toBeLessThan(1e-12);
    for (const mote of model.motes) {
      const a = moteState(mote, 2.5);
      const b = moteState(mote, 2.5 + ISLAND_CYCLE_SECONDS);
      expect(Math.abs(a.x - b.x)).toBeLessThan(1e-9);
      expect(Math.abs(a.y - b.y)).toBeLessThan(1e-9);
    }
    for (const spark of model.sparks)
      expect(
        Math.abs(sparkIntensity(spark, 1.9) - sparkIntensity(spark, 1.9 + ISLAND_CYCLE_SECONDS)),
      ).toBeLessThan(1e-12);
  });

  it("sem envelope a pose do grupo é a arte parada", () => {
    const pose = groupPose(2.2, 0);
    expect(Math.abs(pose.bob)).toBe(0);
    expect(Math.abs(pose.rotation)).toBe(0);
    expect(pose.scale).toBe(1);
  });

  it("o reflexo de luz só passa numa janela do ciclo e avança sempre", () => {
    expect(sweepProgress(0)).toBeNull();
    expect(sweepProgress(2.9)).toBeNull();
    expect(sweepProgress(ISLAND_CYCLE_SECONDS * 0.8)).toBeNull();
    let previous = -1;
    for (let t = 3.01; t < 4.67; t += 0.05) {
      const progress = sweepProgress(t);
      expect(progress).not.toBeNull();
      expect(progress ?? -1).toBeGreaterThanOrEqual(previous);
      previous = progress ?? -1;
    }
  });

  it("as partículas nascem e somem invisíveis, então o ciclo fecha sem emenda", () => {
    expect(model.motes.length).toBeGreaterThan(0);
    for (const mote of model.motes) {
      const start = (1 - mote.phase) * ISLAND_CYCLE_SECONDS; // instante em que u = 0
      expect(moteState(mote, start).alpha).toBeLessThan(1e-9);
      expect(moteState(mote, start + ISLAND_CYCLE_SECONDS).alpha).toBeLessThan(1e-9);
      expect(model.labels[Math.floor(mote.y) * SIZE + Math.floor(mote.x)]).toBe(0);
    }
  });

  it("as faíscas nascem em cima do ouro da ilha", () => {
    expect(model.sparks.length).toBeGreaterThan(0);
    for (const spark of model.sparks) {
      expect(model.gold[spark.y * SIZE + spark.x]).toBe(1);
      expect(spark.x).toBeGreaterThanOrEqual(20);
      expect(spark.x).toBeLessThanOrEqual(35);
    }
  });

  it("o envelope sobe e desce sem sair de 0 a 1 e sem saltos", () => {
    let value = 0;
    let steps = 0;
    while (value < 1 && steps < 200) {
      const next = stepEnvelope(value, true, 1 / 60);
      expect(next).toBeGreaterThanOrEqual(value);
      expect(next - value).toBeLessThan(0.05);
      value = next;
      steps++;
    }
    expect(value).toBe(1);
    expect(steps).toBeGreaterThan(30);
    while (value > 0 && steps < 400) {
      const next = stepEnvelope(value, false, 1 / 60);
      expect(next).toBeLessThanOrEqual(value);
      value = next;
      steps++;
    }
    expect(value).toBe(0);
    expect(stepEnvelope(0, false, 0.016)).toBe(0);
    expect(stepEnvelope(1, true, 0.016)).toBe(1);
  });
});
