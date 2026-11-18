import { expect, it } from "vitest";
import { pointerSamples } from "./handwriting-pointer";

it.each(["mouse", "pen", "touch"])(
  "inclui a amostra mais recente de %s após eventos agrupados",
  (pointerType) => {
    const sample = new PointerEvent("pointermove", { clientX: 10, clientY: 20, pointerType });
    const current = new PointerEvent("pointermove", { clientX: 12, clientY: 20, pointerType });
    Object.defineProperty(current, "getCoalescedEvents", { value: () => [sample] });
    expect(pointerSamples(current)).toEqual([sample, current]);
  },
);

it("funciona sem eventos agrupados e não duplica a última amostra", () => {
  const event = new PointerEvent("pointermove", { clientX: 10 });
  expect(pointerSamples(event)).toEqual([event]);
  Object.defineProperty(event, "getCoalescedEvents", { value: () => [event] });
  expect(pointerSamples(event)).toEqual([event]);
});

import { isPenBarrelButton, isPenEraserTip } from "./handwriting-pointer";

it("o botão lateral vale quando apertado antes de encostar (button 0, buttons 3) e durante o toque", () => {
  // S Pen com o botão segurado antes do toque: o navegador manda button 0 e buttons = 1 + 2.
  expect(isPenBarrelButton({ pointerType: "pen", button: 0, buttons: 3 })).toBe(true);
  expect(isPenBarrelButton({ pointerType: "pen", button: 2, buttons: 2 })).toBe(true);
  expect(isPenBarrelButton({ pointerType: "pen", button: 0, buttons: 1 })).toBe(false);
});

it("a ponta de borracha vale por button 5 ou pela máscara de botões 32", () => {
  expect(isPenEraserTip({ pointerType: "pen", button: 5, buttons: 32 })).toBe(true);
  expect(isPenEraserTip({ pointerType: "pen", button: 0, buttons: 33 })).toBe(true);
  expect(isPenEraserTip({ pointerType: "pen", button: 0, buttons: 1 })).toBe(false);
});

it("mouse e toque nunca contam como botões da caneta", () => {
  for (const pointerType of ["mouse", "touch"]) {
    expect(isPenBarrelButton({ pointerType, button: 2, buttons: 2 })).toBe(false);
    expect(isPenEraserTip({ pointerType, button: 5, buttons: 32 })).toBe(false);
  }
});

import { isPenSecondButton } from "./handwriting-pointer";

it("o segundo botão da caneta é o do meio: button 1 ou bit 4 de buttons, só em caneta", () => {
  expect(isPenSecondButton({ pointerType: "pen", button: 0, buttons: 5 })).toBe(true);
  expect(isPenSecondButton({ pointerType: "pen", button: 1, buttons: 4 })).toBe(true);
  expect(isPenSecondButton({ pointerType: "pen", button: 0, buttons: 1 })).toBe(false);
  // O botão lateral (bit 2) e a ponta traseira (bit 32) não contam como segundo botão.
  expect(isPenSecondButton({ pointerType: "pen", button: 2, buttons: 3 })).toBe(false);
  expect(isPenSecondButton({ pointerType: "pen", button: 5, buttons: 33 })).toBe(false);
  // O botão do meio do mouse não é do segundo botão da caneta.
  expect(isPenSecondButton({ pointerType: "mouse", button: 1, buttons: 4 })).toBe(false);
});
