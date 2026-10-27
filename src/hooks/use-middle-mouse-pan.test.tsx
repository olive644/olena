import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PointerEvent } from "react";
import { useMiddleMousePan } from "./use-middle-mouse-pan";

describe("temporary middle mouse navigation", () => {
  function setup() {
    const { result } = renderHook(useMiddleMousePan);
    const element = document.createElement("div");
    element.scrollLeft = 100;
    element.scrollTop = 200;
    element.setPointerCapture = vi.fn();
    element.hasPointerCapture = vi.fn(() => true);
    element.releasePointerCapture = vi.fn();
    const event = (values = {}) =>
      ({
        currentTarget: element,
        pointerId: 1,
        pointerType: "mouse",
        button: 1,
        buttons: 4,
        clientX: 200,
        clientY: 200,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...values,
      }) as unknown as PointerEvent<HTMLDivElement>;
    return { handlers: result.current, element, event };
  }
  it("pans both axes and consumes the gesture before drawing tools", () => {
    const { handlers, element, event } = setup();
    const down = event();
    handlers.onPointerDownCapture(down);
    expect(down.preventDefault).toHaveBeenCalled();
    expect(down.stopPropagation).toHaveBeenCalled();
    handlers.onPointerMoveCapture(event({ clientX: 160, clientY: 130 }));
    expect([element.scrollLeft, element.scrollTop]).toEqual([140, 270]);
    handlers.onPointerUpCapture(event());
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(element.hasAttribute("data-middle-pan")).toBe(false);
  });
  it.each(["onPointerCancelCapture", "onLostPointerCapture"] as const)("cleans up %s", (name) => {
    const { handlers, element, event } = setup();
    handlers.onPointerDownCapture(event());
    handlers[name](event());
    handlers.onPointerMoveCapture(event({ clientX: 0 }));
    expect(element.scrollLeft).toBe(100);
  });
  it("leaves primary mouse and pen input to the selected tool", () => {
    const { handlers, element, event } = setup();
    for (const values of [{ button: 0, buttons: 1 }, { pointerType: "pen" }]) {
      const down = event(values);
      handlers.onPointerDownCapture(down);
      expect(down.stopPropagation).not.toHaveBeenCalled();
    }
    expect(element.setPointerCapture).not.toHaveBeenCalled();
  });
  it("ends on release even when pointerup was missed", () => {
    const { handlers, element, event } = setup();
    handlers.onPointerDownCapture(event());
    handlers.onPointerMoveCapture(event({ buttons: 0, clientY: 0 }));
    expect(element.scrollTop).toBe(200);
    expect(element.hasAttribute("data-middle-pan")).toBe(false);
  });
});
