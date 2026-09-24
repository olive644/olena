import { describe, expect, it } from "vitest";
import type { HandwritingPoint } from "../domain/handwriting";
import type { Stroke } from "./handwriting-types";
import {
  applyRemoteStrokes,
  partialStroke,
  planReveal,
  revealDuration,
  revealProgress,
  shouldReveal,
} from "./handwriting-reveal";

function point(x: number, y: number, pressure = 0.5): HandwritingPoint {
  return { x, y, pressure };
}

function stroke(id: string, length: number, points = 11): Stroke {
  return {
    id,
    tool: "pen",
    brush: "fine",
    color: "#000",
    width: 4,
    points: Array.from({ length: points }, (_, index) =>
      point(100 + (index / (points - 1)) * length, 200),
    ),
  };
}

describe("duração do traço revelado", () => {
  it("cresce com o comprimento", () => {
    expect(revealDuration(stroke("a", 600))).toBeGreaterThan(revealDuration(stroke("b", 300)));
  });

  it("fica entre um mínimo legível e um máximo que não atrasa quem olha", () => {
    expect(revealDuration(stroke("curto", 4))).toBe(140);
    expect(revealDuration(stroke("longo", 8000))).toBe(650);
  });
});

describe("quando animar", () => {
  it("anima uma atualização pequena e ignora vazio e lotes grandes", () => {
    expect(shouldReveal([])).toBe(false);
    expect(shouldReveal([stroke("a", 100)])).toBe(true);
    expect(shouldReveal(Array.from({ length: 16 }, (_, i) => stroke(String(i), 50)))).toBe(true);
    expect(shouldReveal(Array.from({ length: 17 }, (_, i) => stroke(String(i), 50)))).toBe(false);
  });
});

describe("plano da animação", () => {
  it("escreve os traços em sequência, na ordem, com leve sobreposição", () => {
    const plan = planReveal([stroke("a", 400), stroke("b", 400), stroke("c", 400)], 1000);
    expect(plan.map((item) => item.stroke.id)).toEqual(["a", "b", "c"]);
    expect(plan[0]!.start).toBe(1000);
    expect(plan[1]!.start).toBeGreaterThan(plan[0]!.start);
    expect(plan[1]!.start).toBeLessThan(plan[0]!.start + plan[0]!.duration);
    expect(plan[2]!.start).toBeGreaterThan(plan[1]!.start);
  });

  it("limita a duração total de um lote", () => {
    const many = Array.from({ length: 16 }, (_, index) => stroke(String(index), 1400));
    const plan = planReveal(many, 0);
    const last = plan.at(-1)!;
    expect(last.start + last.duration).toBeLessThan(1400 * 1.1);
  });
});

describe("progresso", () => {
  const reveal = { stroke: stroke("a", 400), start: 100, duration: 200 };

  it("vale 0 antes de começar e 1 depois de terminar", () => {
    expect(revealProgress(reveal, 50)).toBe(0);
    expect(revealProgress(reveal, 100)).toBe(0);
    expect(revealProgress(reveal, 300)).toBe(1);
    expect(revealProgress(reveal, 999)).toBe(1);
  });

  it("sobe sempre, sem recuar, e passa pela metade no meio", () => {
    let previous = 0;
    for (let now = 100; now <= 300; now += 10) {
      const value = revealProgress(reveal, now);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(revealProgress(reveal, 200)).toBeCloseTo(0.5, 6);
  });

  it("é suave no início e no fim (começa e termina devagar)", () => {
    expect(revealProgress(reveal, 110)).toBeLessThan(0.05);
    expect(revealProgress(reveal, 290)).toBeGreaterThan(0.95);
  });
});

describe("traço parcial", () => {
  const full = stroke("a", 100, 11);

  it("devolve o próprio traço quando completo ou sem segmentos", () => {
    expect(partialStroke(full, 1)).toBe(full);
    const single = { ...full, points: [point(1, 1)] };
    expect(partialStroke(single, 0.5)).toBe(single);
  });

  it("corta pelo comprimento do caminho e interpola o último ponto", () => {
    const half = partialStroke(full, 0.55);
    expect(half.points.at(0)).toEqual(full.points[0]);
    const last = half.points.at(-1)!;
    expect(last.x).toBeCloseTo(155, 6);
    expect(last.y).toBe(200);
    expect(half.points.length).toBe(7);
  });

  it("interpola a pressão junto com a posição", () => {
    const pressed: Stroke = { ...full, points: [point(0, 0, 0.2), point(100, 0, 1)] };
    const part = partialStroke(pressed, 0.5);
    expect(part.points.at(-1)!.pressure).toBeCloseTo(0.6, 6);
  });

  it("no início mostra só o primeiro ponto", () => {
    expect(partialStroke(full, 0).points).toHaveLength(1);
  });

  it("mantém as propriedades do traço", () => {
    expect(partialStroke(full, 0.3)).toMatchObject({ id: "a", tool: "pen", width: 4 });
  });

  it("não quebra com pontos repetidos", () => {
    const repeated: Stroke = { ...full, points: [point(0, 0), point(0, 0), point(50, 0)] };
    const part = partialStroke(repeated, 0.5);
    for (const p of part.points) expect(Number.isFinite(p.x)).toBe(true);
  });
});

describe("atualização remota", () => {
  const remote = [stroke("a", 100), stroke("b", 100)];

  it("marca como novos só os traços que a folha ainda não conhecia", () => {
    const { incoming, strokes } = applyRemoteStrokes({
      remote,
      known: new Set(["a"]),
      drawing: null,
    });
    expect(incoming.map((item) => item.id)).toEqual(["b"]);
    expect(strokes.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("mantém o traço que esta pessoa está fazendo quando a atualização não o traz", () => {
    const drawing = stroke("meu", 60);
    const { strokes, incoming } = applyRemoteStrokes({
      remote,
      known: new Set(["a", "b", "meu"]),
      drawing,
    });
    expect(strokes.map((item) => item.id)).toEqual(["a", "b", "meu"]);
    expect(strokes.at(-1)).toBe(drawing);
    expect(incoming).toEqual([]);
  });

  it("não duplica o traço em andamento quando a atualização já o traz", () => {
    const drawing = stroke("a", 100);
    const { strokes } = applyRemoteStrokes({ remote, known: new Set(["a"]), drawing });
    expect(strokes.filter((item) => item.id === "a")).toHaveLength(1);
  });

  it("não anima o traço em andamento como se fosse de um colega", () => {
    const drawing = stroke("meu", 60);
    const { incoming } = applyRemoteStrokes({
      remote: [...remote, drawing],
      known: new Set(["a", "b", "meu"]),
      drawing,
    });
    expect(incoming).toEqual([]);
  });

  it("não altera a lista recebida", () => {
    const copy = [...remote];
    applyRemoteStrokes({ remote, known: new Set(), drawing: stroke("x", 10) });
    expect(remote).toEqual(copy);
  });
});
