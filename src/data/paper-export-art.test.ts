import { afterEach, expect, it, vi } from "vitest";
import { brandedExportCanvas } from "./paper-export-art";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("usa letras originais e favicon à esquerda, sem selo ou nome duplicado", () => {
  vi.stubGlobal("Path2D", class {});
  const context = {
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: () => ({ width: 80 }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
  };
  const output = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  const source = { width: 800, height: 600, toDataURL: vi.fn() } as unknown as HTMLCanvasElement;
  vi.spyOn(document, "createElement").mockReturnValue(output);
  const mascot = {} as HTMLImageElement;
  const exported = brandedExportCanvas(source, mascot);
  expect(exported).not.toBe(source);
  expect(exported.width).toBe(856);
  expect(exported.height).toBe(748);
  expect(context.drawImage).toHaveBeenCalledWith(source, 28, 60);
  expect(context.fillText).toHaveBeenCalledWith("FEITO PARA APRENDER", 28, expect.any(Number));
  expect(context.drawImage).toHaveBeenCalledWith(mascot, 28, 10.8, 38.4, 38.4);
  expect(context.translate).toHaveBeenCalledWith(75.2, 15);
  expect(context.fill.mock.calls.filter((call) => call[1] === "evenodd")).toHaveLength(20);
  expect(context.fillText.mock.calls.map((call) => call[0])).toEqual([
    "CADERNO",
    "FEITO PARA APRENDER",
  ]);
  expect(context.lineTo).toHaveBeenCalledTimes(4);
  expect(source.width).toBe(800);
  expect(source.height).toBe(600);
  expect(source.toDataURL).not.toHaveBeenCalled();
});
