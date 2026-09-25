import { afterEach, expect, it, vi } from "vitest";
import { exportPage } from "./handwriting-export";

afterEach(() => vi.restoreAllMocks());

it("reduz a miniatura de um quadro amplo antes de persistir", () => {
  const drawImage = vi.fn();
  const preview = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toDataURL: () => "data:image/png;base64,preview",
  } as unknown as HTMLCanvasElement;
  vi.spyOn(document, "createElement").mockReturnValue(preview);
  const board = {
    width: 3200,
    height: 2400,
    toDataURL: vi.fn(() => "data:image/png;base64,original"),
  } as unknown as HTMLCanvasElement;

  expect(exportPage(board)).toBe("data:image/png;base64,preview");
  expect(preview.width).toBe(1600);
  expect(preview.height).toBe(1200);
  expect(drawImage).toHaveBeenCalledWith(board, 0, 0, 1600, 1200);
  expect(board.toDataURL).not.toHaveBeenCalled();
});
