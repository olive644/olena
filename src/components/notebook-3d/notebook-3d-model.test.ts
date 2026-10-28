import { describe, expect, it } from "vitest";
import {
  BOOK,
  flippedFor,
  leafCount,
  leafOfPage,
  peekFan,
  placeTab,
  sheetCount,
  spreadCount,
  stepLeaf,
  viewFor,
  visiblePages,
} from "./notebook-3d-model";

describe("estrutura do caderno 3D", () => {
  it("usa uma peça solta para cada duas folhas, além de capa e contracapa", () => {
    expect(sheetCount(0)).toBe(0);
    expect(sheetCount(1)).toBe(0);
    expect(sheetCount(2)).toBe(1);
    expect(sheetCount(5)).toBe(2);
    expect(leafCount(5)).toBe(4);
    expect(spreadCount(0)).toBe(1);
    expect(spreadCount(5)).toBe(3);
  });

  it("converte entre o estado da tela e as peças viradas, sem perder a dupla", () => {
    for (const pages of [0, 1, 2, 5, 8]) {
      expect(viewFor(flippedFor({ cover: true, back: false, spread: 0 }, pages), pages).cover).toBe(
        true,
      );
      expect(viewFor(flippedFor({ cover: false, back: true, spread: 0 }, pages), pages).back).toBe(
        true,
      );
      for (let spread = 0; spread < spreadCount(pages); spread++) {
        const view = { cover: false, back: false, spread };
        expect(viewFor(flippedFor(view, pages), pages)).toEqual(view);
      }
    }
  });

  it("mostra as folhas certas de cada lado e deixa vazio o que não existe", () => {
    expect(visiblePages(0, 5)).toEqual([null, null]);
    expect(visiblePages(1, 5)).toEqual([0, 1]);
    expect(visiblePages(3, 5)).toEqual([4, null]);
    expect(visiblePages(9, 5)).toEqual([null, null]);
  });

  it("a primeira folha fica no verso da capa e as seguintes alternam frente e verso", () => {
    expect(leafOfPage(0)).toEqual({ leaf: 0, front: false });
    expect(leafOfPage(1)).toEqual({ leaf: 1, front: true });
    expect(leafOfPage(2)).toEqual({ leaf: 1, front: false });
    expect(leafOfPage(3)).toEqual({ leaf: 2, front: true });
  });
});

describe("regras de divisória e marcador", () => {
  const visible: [number | null, number | null] = [2, 3];
  const { pageWidth: width, pageHeight: height } = BOOK;

  it("a divisória só vale na borda direita e prende na folha da direita", () => {
    const edge = placeTab("divider", { x: width * 0.9, z: 0 }, visible);
    expect(edge.ok && edge.page).toBe(3);
    const middle = placeTab("divider", { x: width * 0.2, z: 0 }, visible);
    expect(middle).toEqual({ ok: false, reason: "divider-edge" });
    const left = placeTab("divider", { x: -width / 2, z: 0 }, visible);
    expect(left.ok).toBe(false);
  });

  it("a posição da divisória fica sempre dentro da folha", () => {
    const top = placeTab("divider", { x: width * 0.9, z: -height / 2 - 0.3 }, [null, 1]);
    const bottom = placeTab("divider", { x: width * 0.9, z: height / 2 + 0.3 }, [null, 1]);
    expect(top.ok && top.position).toBe(0);
    expect(bottom.ok && bottom.position).toBe(1);
  });

  it("o marcador prende na folha tocada, esquerda ou direita", () => {
    const left = placeTab("bookmark", { x: -width / 2, z: 0 }, visible);
    const right = placeTab("bookmark", { x: width / 2, z: 0 }, visible);
    expect(left.ok && left.page).toBe(2);
    expect(right.ok && right.page).toBe(3);
  });

  it("recusa o que cai fora do caderno ou numa folha que não existe", () => {
    expect(placeTab("bookmark", { x: width * 3, z: 0 }, visible).ok).toBe(false);
    expect(placeTab("bookmark", { x: -width / 2, z: 0 }, [null, 1])).toEqual({
      ok: false,
      reason: "missing-page",
    });
    expect(placeTab("bookmark", { x: 0, z: 0 }, [null, null]).ok).toBe(false);
  });
});

describe("física das folhas", () => {
  it("a folha solta assenta no alvo e nunca passa da lombada", () => {
    let motion = { theta: 0, omega: 0, curl: 0, curlSpeed: 0 };
    let max = 0;
    for (let step = 0; step < 240; step++) {
      motion = stepLeaf(motion, Math.PI, 1 / 60, { dragging: false, sheet: true, lead: 0 });
      max = Math.max(max, motion.theta);
    }
    expect(motion.theta).toBeCloseTo(Math.PI, 1);
    expect(max).toBeLessThanOrEqual(Math.PI);
    expect(Math.abs(motion.omega)).toBeLessThan(0.05);
  });

  it("o leque de espiar levanta mais folhas quanto mais fundo o ponteiro", () => {
    expect(peekFan(1, 0)).toBeNull();
    const shallow = peekFan(6, -BOOK.pageHeight);
    const deep = peekFan(6, BOOK.pageHeight);
    expect(shallow?.depth).toBe(0);
    expect(deep?.depth).toBe(5);
    expect(deep?.angles).toHaveLength(5);
  });
});
