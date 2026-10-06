import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApprovedSaturn, EXIT_JOURNEY_MS, EXIT_TIMING } from "./bingo-saturn-engine";

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
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
  };
  const disconnect = vi.fn();
  let frameCallback: FrameRequestCallback | undefined;
  function sizedCanvas() {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      width: 600,
      height: 400,
      left: 0,
      top: 0,
    } as DOMRect);
    return canvas;
  }
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
    frameCallback = undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 7;
      }),
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
    const labels = context.fillText.mock.calls
      .map((call) => call[0])
      .filter((label) => /^\d+$/.test(String(label)));
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

  it("avisa a chegada ao fim do funil pelo relógio, uma única vez, mesmo com quadros perdidos", () => {
    vi.spyOn(performance, "now").mockReturnValue(1000);
    const engine = createApprovedSaturn(sizedCanvas())!;
    const arrived = vi.fn();
    engine.beginExit(5, arrived);
    frameCallback!(1000 + EXIT_TIMING.lift);
    expect(arrived).not.toHaveBeenCalled();
    // Um único quadro tardio já completa a viagem: a chegada não depende de contar quadros.
    frameCallback!(1000 + EXIT_JOURNEY_MS + 20);
    expect(arrived).toHaveBeenCalledOnce();
    const end = arrived.mock.calls[0]![0] as { x: number; y: number; radius: number };
    expect(end.radius).toBeGreaterThan(0);
    // A ponta do funil fica à direita e abaixo do portão do globo.
    expect(end.x).toBeGreaterThan(300);
    expect(end.y).toBeGreaterThan(200);
    frameCallback!(1000 + EXIT_JOURNEY_MS + 60);
    expect(arrived).toHaveBeenCalledOnce();
    engine.releaseBall();
    engine.dispose();
  });
  it("não desenha a bolinha duas vezes: o número sorteado sai do globo ao começar a viagem", () => {
    const engine = createApprovedSaturn(sizedCanvas())!;
    engine.setDrawn(["1"]);
    context.fillText.mockClear();
    engine.beginExit(9);
    const labels = context.fillText.mock.calls
      .map((call) => call[0])
      .filter((label) => /^\d+$/.test(String(label)));
    expect(labels.filter((label) => label === "9")).toHaveLength(1);
    expect(labels).toHaveLength(74);
    engine.finishExit();
    engine.dispose();
  });
  it("solta confete no pouso e o apaga sozinho", () => {
    vi.spyOn(performance, "now").mockReturnValue(1000);
    const engine = createApprovedSaturn(sizedCanvas())!;
    engine.burst(300, 200);
    context.fillRect.mockClear();
    frameCallback!(1016);
    expect(context.fillRect.mock.calls.length).toBeGreaterThan(10);
    // Cada quadro envelhece o confete; depois de cerca de dois segundos ele já se apagou.
    for (let frame = 2; frame <= 130; frame++) frameCallback!(1000 + frame * 16);
    context.fillRect.mockClear();
    frameCallback!(1000 + 131 * 16);
    expect(context.fillRect).not.toHaveBeenCalled();
    engine.dispose();
  });
  it("com movimento reduzido chega na hora e não solta confete", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const engine = createApprovedSaturn(sizedCanvas())!;
    const arrived = vi.fn();
    engine.beginExit(5, arrived);
    expect(arrived).toHaveBeenCalledOnce();
    context.fillRect.mockClear();
    engine.burst(10, 10);
    expect(context.fillRect).not.toHaveBeenCalled();
    engine.dispose();
  });
});
