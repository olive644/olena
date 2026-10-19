import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { TOMATO_ART, TOMATO_BITES, tomatoStage } from "./pomodoro-tomato";

it("a etapa segue a fração de tempo que passou, de 0 (inteiro) a 8 (só o miolo)", () => {
  expect(tomatoStage(1)).toBe(0);
  expect(tomatoStage(0.99)).toBe(0);
  expect(tomatoStage(0.875)).toBe(1);
  expect(tomatoStage(0.5)).toBe(4);
  expect(tomatoStage(0.126)).toBe(6);
  expect(tomatoStage(0.124)).toBe(7);
  expect(tomatoStage(0)).toBe(TOMATO_BITES);
  expect(tomatoStage(-3)).toBe(TOMATO_BITES);
  expect(tomatoStage(7)).toBe(0);
});

it("a sequência é a mesma para qualquer duração escolhida: a mordida vem a cada oitavo do tempo", () => {
  for (const minutes of [1, 5, 25, 50, 90]) {
    const total = minutes * 60;
    const stageAt = (elapsed: number) => tomatoStage((total - elapsed) / total);
    expect(stageAt(0)).toBe(0);
    // um segundo antes da mordida k, ainda é a etapa anterior; no instante dela, já é a k
    for (let k = 1; k <= TOMATO_BITES; k++) {
      const instant = (total * k) / TOMATO_BITES;
      expect(stageAt(instant)).toBe(k);
      if (total / TOMATO_BITES > 2) expect(stageAt(instant - 1)).toBe(k - 1);
    }
    expect(stageAt(total / 2)).toBe(4);
  }
});

it("as medidas da arte conferem com as camadas geradas por scripts/tomato-rive", () => {
  const manifest = JSON.parse(readFileSync("scripts/tomato-rive/layers/layers.json", "utf8")) as {
    width: number;
    height: number;
    bites: number;
    static: { x0: number; y0: number; w: number; h: number };
  };
  expect(manifest.bites).toBe(TOMATO_BITES);
  expect(TOMATO_ART.staticWidth).toBe(manifest.static.w);
  expect(TOMATO_ART.staticHeight).toBe(manifest.static.h);
  // a prancheta tem 150 px de margem dos lados, 90 em cima e 70 embaixo (generate.cjs)
  expect(TOMATO_ART.boardWidth).toBe(manifest.width + 300);
  expect(TOMATO_ART.boardHeight).toBe(manifest.height + 160);
  expect(TOMATO_ART.offsetX).toBe(manifest.static.x0 + 150);
  expect(TOMATO_ART.offsetY).toBe(manifest.static.y0 + 90);
});

it("o canvas do Rive cobre a prancheta inteira sobre a imagem estática (medidas do CSS)", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const block = /\.pomodoro-tomato-live > canvas \{([^}]*)\}/.exec(css)?.[1] ?? "";
  const value = (property: string) =>
    Number(new RegExp(`${property}: (-?[\\d.]+)%`).exec(block)?.[1] ?? Number.NaN);
  expect(value("width")).toBeCloseTo((TOMATO_ART.boardWidth / TOMATO_ART.staticWidth) * 100, 1);
  expect(value("height")).toBeCloseTo((TOMATO_ART.boardHeight / TOMATO_ART.staticHeight) * 100, 1);
  expect(value("left")).toBeCloseTo(-(TOMATO_ART.offsetX / TOMATO_ART.staticWidth) * 100, 1);
  expect(value("top")).toBeCloseTo(-(TOMATO_ART.offsetY / TOMATO_ART.staticHeight) * 100, 1);
});
