import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomRecordingInput } from "./room-recording-input";

afterEach(() => vi.unstubAllGlobals());

describe("microfone da Escuta Coletiva", () => {
  it("captura uma fala e mostra a prévia pronta para guardar", async () => {
    const stop = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue("blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    class WorkingRecorder {
      static isTypeSupported() {
        return true;
      }
      constructor(...args: unknown[]) {
        if (args[1]) throw new Error("Formato preferido indisponível");
      }
      state = "inactive";
      mimeType = "audio/webm;codecs=opus";
      ondataavailable?: (event: { data: Blob }) => void;
      onstop?: () => void;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x42])], { type: "audio/webm" }),
        });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", WorkingRecorder);
    render(
      <RoomRecordingInput
        word="cat"
        translation="gato"
        code="ABCDE"
        credential="secret"
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Gravar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Parar gravação" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Parar gravação" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar áudio" })).toBeTruthy());
    expect(stop).toHaveBeenCalled();
  });

  it("libera o microfone e avisa quando o gravador falha ao iniciar", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    class BrokenRecorder {
      static isTypeSupported() {
        return true;
      }
      start() {
        throw new Error("Codec indisponível");
      }
    }
    vi.stubGlobal("MediaRecorder", BrokenRecorder);
    render(
      <RoomRecordingInput
        word="bus"
        translation="ônibus"
        code="ABCDE"
        credential="secret"
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Gravar" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Não foi possível iniciar o microfone",
      ),
    );
    expect(stop).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Gravar" })).toBeTruthy();
  });

  it("encerra a captura e permite tentar de novo após erro durante a gravação", async () => {
    const stop = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
    class FailingRecorder {
      static latest: FailingRecorder;
      static isTypeSupported() {
        return true;
      }
      state = "inactive";
      onerror?: () => void;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
      }
      constructor() {
        FailingRecorder.latest = this;
      }
    }
    vi.stubGlobal("MediaRecorder", FailingRecorder);
    render(
      <RoomRecordingInput
        word="book"
        translation="livro"
        code="ABCDE"
        credential="secret"
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Gravar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Parar gravação" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Parar gravação" }));
    FailingRecorder.latest.onerror?.();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("interrompida"));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Gravar" })).toBeTruthy();
  });
});
