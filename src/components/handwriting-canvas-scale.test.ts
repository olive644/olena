import { describe, expect, it, vi } from "vitest";
import {
  canvasPoint,
  clearPageCanvas,
  pageContext,
  pageRenderScale,
  sizePageCanvas,
} from "./handwriting-canvas";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./handwriting-types";

describe("escala de renderização da folha", () => {
  it("fica em 1 quando a tela não é densa e a folha é exibida menor que o bitmap", () => {
    expect(pageRenderScale(1, 760)).toBe(1);
    expect(pageRenderScale(1, 1200)).toBe(1);
  });

  it("sobe com a densidade de pixels para a tinta ficar nítida", () => {
    // 760 px CSS a 2x pedem 1520 px de bitmap: 1,27 da folha, arredondado para 1,5.
    expect(pageRenderScale(2, 760)).toBe(1.5);
    expect(pageRenderScale(3, 760)).toBe(2);
  });

  it("acompanha o zoom", () => {
    expect(pageRenderScale(2, 760)).toBeLessThan(pageRenderScale(2, 1500));
  });

  it("arredonda para cima em passos de 0,25, sem redesenhar a cada fração de zoom", () => {
    for (const width of [800, 820, 840, 860]) {
      const scale = pageRenderScale(2, width);
      expect(scale * 4).toBeCloseTo(Math.round(scale * 4), 9);
      expect(scale).toBeGreaterThanOrEqual((2 * width) / PAGE_WIDTH);
    }
  });

  it("respeita o teto de pixels do iOS Safari e a memória das duas camadas", () => {
    const scale = pageRenderScale(3, 5000);
    const pixels = PAGE_WIDTH * scale * (PAGE_HEIGHT * scale);
    expect(pixels).toBeLessThanOrEqual(9_000_000);
    expect(scale).toBeGreaterThan(2);
  });
});

describe("tamanho do canvas da folha", () => {
  it("mantém o quadro amplo dentro do orçamento e converte posições fora da área A4", () => {
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, pageRenderScale(3, 6400, 3200, 2400), 3200, 2400);
    expect(canvas.width * canvas.height).toBeLessThan(9_010_000);
    const bounds = { left: 0, top: 0, width: 1600, height: 1200 } as DOMRect;
    const measure = vi.spyOn(canvas, "getBoundingClientRect");
    expect(
      canvasPoint(canvas, { clientX: 1400, clientY: 1000, pressure: 0.7 }, bounds),
    ).toMatchObject({ x: 2800, y: 2000, pressure: 0.7 });
    expect(measure).not.toHaveBeenCalled();
  });
  it("dimensiona o bitmap pela escala", () => {
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, 1.5);
    expect(canvas.width).toBe(1800);
    expect(canvas.height).toBe(2400);
  });

  it("não apaga o canvas quando o tamanho não mudou", () => {
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, 2);
    const widthSetter = vi.spyOn(canvas, "width", "set");
    const heightSetter = vi.spyOn(canvas, "height", "set");
    sizePageCanvas(canvas, 2);
    expect(widthSetter).not.toHaveBeenCalled();
    expect(heightSetter).not.toHaveBeenCalled();
  });
});

describe("contexto em unidades da folha", () => {
  function canvasWithContext(scale: number) {
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, scale);
    const context = { setTransform: vi.fn(), clearRect: vi.fn() };
    vi.spyOn(canvas, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    return { canvas, context };
  }

  it("aplica a escala do bitmap para desenhar em unidades da folha", () => {
    const { canvas, context } = canvasWithContext(2);
    pageContext(canvas);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it("devolve nulo quando o navegador não dá um contexto", () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    expect(pageContext(canvas)).toBeNull();
  });

  it("limpa o bitmap inteiro, sem depender da escala", () => {
    const { canvas, context } = canvasWithContext(2);
    clearPageCanvas(canvas);
    expect(context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 2400, 3200);
  });
});

describe("ponto do ponteiro na folha", () => {
  function canvasAt(width: number, height: number, bitmapScale: number) {
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, bitmapScale);
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width,
      height,
      right: 100 + width,
      bottom: 50 + height,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
    return canvas;
  }

  it("mede em unidades da folha, qualquer que seja a resolução do bitmap", () => {
    const event = { clientX: 100 + 300, clientY: 50 + 400, pressure: 0.7 };
    for (const scale of [1, 1.5, 2]) {
      const point = canvasPoint(canvasAt(600, 800, scale), event);
      expect(point.x).toBeCloseTo(600, 9);
      expect(point.y).toBeCloseTo(800, 9);
    }
  });

  it("limita o ponto às bordas da folha", () => {
    const canvas = canvasAt(600, 800, 2);
    expect(canvasPoint(canvas, { clientX: -500, clientY: -500, pressure: 0.5 })).toMatchObject({
      x: 0,
      y: 0,
    });
    expect(canvasPoint(canvas, { clientX: 9999, clientY: 9999, pressure: 0.5 })).toMatchObject({
      x: PAGE_WIDTH,
      y: PAGE_HEIGHT,
    });
  });

  it("usa a pressão 0,5 quando o dispositivo não informa", () => {
    const point = canvasPoint(canvasAt(600, 800, 1), { clientX: 200, clientY: 100, pressure: 0 });
    expect(point.pressure).toBe(0.5);
  });
});
