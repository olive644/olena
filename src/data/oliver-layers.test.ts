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

it("cada braço tem uma aba curta sob o corpo: cobre o giro e não sobra para fora da silhueta", () => {
  // o braço esquerdo sai pela esquerda do corpo (junta em x 176), o direito pela direita (x 472)
  const armL = layer("armL");
  const armR = layer("armR");
  const leftReach = armL.x0 + armL.w - 176;
  const rightReach = 472 - armR.x0;
  expect(leftReach).toBeGreaterThan(6);
  expect(leftReach).toBeLessThan(30);
  expect(rightReach).toBeGreaterThan(6);
  expect(rightReach).toBeLessThan(30);
});

it("a ilha, as pernas e os braços ficam abaixo do rosto na pilha", () => {
  const order = manifest.order;
  for (const face of ["mouth", "eyeL", "eyeR"])
    for (const below of ["island", "legL", "legR", "armL", "armR", "body"])
      expect(order.indexOf(face)).toBeGreaterThan(order.indexOf(below));
});
