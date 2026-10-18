import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

type Layer = { x0: number; y0: number; w: number; h: number };
const manifest = JSON.parse(readFileSync("scripts/oliver-rive/layers/layers.json", "utf8")) as {
  order: string[];
  layers: Record<string, Layer>;
};

const layer = (name: string): Layer => {
  const found = manifest.layers[name];
  if (!found) throw new Error(`camada ausente: ${name}`);
  return found;
};

it("os braços ficam atrás do corpo, para a junta nunca aparecer quando eles giram", () => {
  const body = manifest.order.indexOf("body");
  expect(body).toBeGreaterThan(-1);
  for (const arm of ["armL", "armR"]) {
    expect(manifest.order.indexOf(arm)).toBeGreaterThan(-1);
    expect(manifest.order.indexOf(arm)).toBeLessThan(body);
  }
});

it("cada braço tem uma aba enfiada sob o corpo, funda o bastante para cobrir o giro", () => {
  const body = layer("body");
  const overlap = (arm: Layer, side: "left" | "right") =>
    side === "right" ? body.x0 + body.w - arm.x0 : arm.x0 + arm.w - body.x0;
  // braço esquerdo sai pela esquerda do corpo, o direito pela direita
  const armL = layer("armL");
  const armR = layer("armR");
  expect(armL.x0 + armL.w).toBeGreaterThan(182 + 20);
  expect(armR.x0).toBeLessThan(472 - 20);
  expect(overlap(armR, "right")).toBeGreaterThan(20);
  expect(overlap(armL, "left")).toBeGreaterThan(20);
});

it("a ilha, as pernas e os braços ficam abaixo do rosto na pilha", () => {
  const order = manifest.order;
  for (const face of ["mouth", "eyeL", "eyeR"])
    for (const below of ["island", "legL", "legR", "armL", "armR", "body"])
      expect(order.indexOf(face)).toBeGreaterThan(order.indexOf(below));
});
