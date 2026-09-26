import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePinchZoom } from "./use-pinch-zoom";

function setup(zoom = 1) {
  const viewport = document.createElement("div");
  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
  const zoomTo = vi.fn();
  const onPinchStart = vi.fn();
  const view = renderHook(() =>
    usePinchZoom({ viewportRef: { current: viewport }, zoom, zoomTo, onPinchStart }),
  );
  return { viewport, zoomTo, onPinchStart, pinch: view.result.current };
}

const finger = (pointerId: number, clientX: number, clientY: number) => ({
  pointerId,
  clientX,
  clientY,
});

describe("pinça de dois dedos", () => {
  it("um dedo só não é pinça e não larga o traço", () => {
    const { pinch, onPinchStart } = setup();
    expect(pinch.start(finger(1, 100, 100))).toBe(false);
    expect(onPinchStart).not.toHaveBeenCalled();
    expect(pinch.move(finger(1, 120, 100))).toBe(false);
  });

  it("o segundo dedo começa a pinça e avisa quem está desenhando", () => {
    const { pinch, onPinchStart } = setup();
    pinch.start(finger(1, 100, 100));
    expect(pinch.start(finger(2, 200, 100))).toBe(true);
    expect(onPinchStart).toHaveBeenCalledTimes(1);
  });

  it("afastar os dedos aumenta o zoom em torno do ponto médio, aproximar diminui", () => {
    const { pinch, zoomTo } = setup(2);
    pinch.start(finger(1, 100, 100));
    pinch.start(finger(2, 200, 100));
    act(() => void pinch.move(finger(2, 300, 100)));
    expect(zoomTo).toHaveBeenLastCalledWith(200, 100, 4);
    act(() => void pinch.move(finger(2, 150, 100)));
    expect(zoomTo).toHaveBeenLastCalledWith(125, 100, 1);
  });

  it("mover os dois dedos juntos rola a folha", () => {
    const { pinch, viewport } = setup();
    viewport.scrollLeft = 50;
    pinch.start(finger(1, 100, 100));
    pinch.start(finger(2, 200, 100));
    pinch.move(finger(1, 80, 100));
    pinch.move(finger(2, 180, 100));
    expect(viewport.scrollLeft).toBe(50 + 150 - 130);
  });

  it("levantar um dedo termina a pinça", () => {
    const { pinch, zoomTo } = setup();
    pinch.start(finger(1, 100, 100));
    pinch.start(finger(2, 200, 100));
    pinch.end(2);
    expect(pinch.move(finger(1, 130, 100))).toBe(false);
    expect(zoomTo).not.toHaveBeenCalled();
  });
});
