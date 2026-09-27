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
