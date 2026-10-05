import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import qrcode from "qrcode-generator";
import jsQR from "jsqr";
import RoomQrScanner from "./room-qr-scanner";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("leitor local de QR", () => {
  it("decodifica pixels reais de um convite, sem serviço externo", () => {
    const value = "https://olenastudy.vercel.app/sala?sala=ABCDE";
    const qr = qrcode(0, "H");
    qr.addData(value);
    qr.make();
    const size = (qr.getModuleCount() + 8) * 4;
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const row = Math.floor(y / 4) - 4;
        const col = Math.floor(x / 4) - 4;
        const dark =
          row >= 0 &&
          col >= 0 &&
          row < qr.getModuleCount() &&
          col < qr.getModuleCount() &&
          qr.isDark(row, col);
        const index = (y * size + x) * 4;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = dark ? 0 : 255;
        pixels[index + 3] = 255;
      }
    expect(jsQR(pixels, size, size)?.data).toBe(value);
  });
  it("oferece entrada por código se a câmera for recusada", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<RoomQrScanner onRead={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toContain("entre com o código");
  });
  it("encerra a câmera se o usuário sair antes da permissão resolver", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    let resolve!: (stream: MediaStream) => void;
    const getUserMedia = vi.fn(
      () =>
        new Promise<MediaStream>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const stop = vi.fn();
    const { unmount } = render(<RoomQrScanner onRead={vi.fn()} />);
    await waitFor(() =>
      expect(getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      }),
    );
    unmount();
    await act(async () => resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
