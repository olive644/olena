import { afterEach, expect, it, vi } from "vitest";
import { brandedExportCanvas } from "./paper-export-art";

afterEach(() => vi.restoreAllMocks());
it("draws the exclusive seal and watermark outside an untouched notebook source", () => {
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
  expect(context.fillText).toHaveBeenCalledWith("OLENA STUDY", 28, expect.any(Number));
  expect(context.fillText).toHaveBeenCalledWith("FEITO PARA APRENDER", 28, expect.any(Number));
  expect(context.drawImage).toHaveBeenCalledWith(mascot, 15, 15, 70, 70);
  expect(source.width).toBe(800);
  expect(source.height).toBe(600);
  expect(source.toDataURL).not.toHaveBeenCalled();
});
