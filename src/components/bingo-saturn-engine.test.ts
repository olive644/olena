import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApprovedSaturn } from "./bingo-saturn-engine";

describe("approved Saturn renderer", () => {
  const context = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
  };
  const disconnect = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 7),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders only the server's remaining numbers, exits the selected ball and can restore a new round", () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      width: 600,
      height: 400,
      left: 0,
      top: 0,
    } as DOMRect);
    const engine = createApprovedSaturn(canvas)!;
    context.fillText.mockClear();
    engine.setDrawn(["1", "2"]);
    expect(canvas.dataset["remaining"]).toBe("73");
    const labels = context.fillText.mock.calls.map((call) => call[0]);
    expect(labels).toHaveLength(73);
    expect(labels).not.toContain("1");
    expect(labels).not.toContain("2");
    engine.beginExit(3);
    engine.finishExit();
    context.fillText.mockClear();
    engine.setDrawn(["1", "2", "3"]);
    expect(context.fillText.mock.calls.map((call) => call[0])).not.toContain("3");
    expect(canvas.dataset["remaining"]).toBe("72");
    engine.setDrawn([]);
    expect(canvas.dataset["remaining"]).toBe("75");
    engine.dispose();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it("handles an unavailable canvas without breaking the room", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(createApprovedSaturn(document.createElement("canvas"))).toBeNull();
  });
});
