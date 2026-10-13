import type { ColorClass, PartSpec } from "../domain/place-rig";

/** Retângulo x0, y0, x1, y1 na arte de 800 pixels. */
export type Area = readonly [number, number, number, number];

/** Diamante dourado que sobe e desce sobre o pilar, com o brilho pulsando. */
export const diamond = (id: string, x: number, y: number, phase: number, amp = 5): PartSpec => ({
  id,
  seeds: [{ x, y, color: "gold" }],
  motion: { period: 3, phase, dy: { amp: -amp, oneSided: true } },
  glow: true,
});

/** Peça que pula do chão e volta, uma vez por volta. */
export const hop = (
  id: string,
  x: number,
  y: number,
  color: ColorClass,
  phase: number,
  amp = 5,
  box?: Area,
  period = 2,
): PartSpec => ({
  id,
  seeds: [{ x, y, color }],
  ...(box ? { box } : {}),
  motion: { period, phase, dy: { amp: -amp, oneSided: true } },
  glow: color === "gold",
});

/** Ouro que respira (escala) e brilha, sem sair do lugar. */
export const gleam = (id: string, x: number, y: number, phase: number): PartSpec => ({
  id,
  seeds: [{ x, y, color: "gold" }],
  motion: {
    period: 3,
    phase,
    scaleX: { amp: 0.06, oneSided: true },
    scaleY: { amp: 0.06, oneSided: true },
  },
  glow: true,
  fill: "air",
});

/** Ouro parado que só brilha: janelas, grades, o símbolo da integral. */
export const shine = (id: string, x: number, y: number, phase: number, box?: Area): PartSpec => ({
  id,
  seeds: [{ x, y, color: "gold" }],
  ...(box ? { box } : {}),
  motion: { period: 3, phase },
  glow: true,
});

/** Folhagem que balança presa ao chão. */
export const sway = (
  id: string,
  x: number,
  y: number,
  phase: number,
  amp = 0.02,
  period = 3,
  box?: Area,
): PartSpec => ({
  id,
  seeds: [{ x, y, color: "green" }],
  ...(box ? { box } : {}),
  motion: { period, phase, rot: { amp }, scaleY: { amp: 0.006 }, pivot: "base" },
});

/** Conta que desliza pela haste, no sentido da haste. */
export const bead = (
  id: string,
  x: number,
  y: number,
  color: ColorClass,
  phase: number,
  box?: Area,
): PartSpec => ({
  id,
  seeds: [{ x, y, color }],
  ...(box ? { box } : {}),
  motion: { period: 6, phase, dx: { amp: 4.6 }, dy: { amp: 1.3 } },
  glow: color === "gold",
});

/** Gema que gira devagar sobre o próprio eixo (a largura vai e volta) enquanto flutua. */
export const spin = (id: string, x: number, y: number, phase: number, lift = 4): PartSpec => ({
  id,
  seeds: [{ x, y, color: "gold" }],
  motion: {
    period: 3,
    phase,
    dy: { amp: -lift, oneSided: true },
    scaleX: { amp: -0.4, oneSided: true, shift: 0.25 },
  },
  glow: true,
  fill: "air",
});
