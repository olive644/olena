import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RoomRecordingInput } from "./room-recording-input";
import { uploadRoomRecording } from "../data/room-recording";
vi.mock("../data/room-recording", () => ({
  MAX_ROOM_RECORDING_BYTES: 256_000,
  uploadRoomRecording: vi.fn().mockResolvedValue("audio-id"),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function setup() {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn().mockReturnValue("blob:preview"),
    revokeObjectURL: vi.fn(),
  });
  const saved = vi.fn();
  render(
    <RoomRecordingInput
      word="school"
      translation="escola"
      code="ABCDE"
      credential="host"
      onSaved={saved}
    />,
  );
  return saved;
}
it("oferece arquivos sem solicitar acesso ao microfone", () => {
  setup();
  expect(screen.queryByRole("button", { name: "Gravar" })).toBeNull();
  expect(screen.getByRole("button", { name: "Enviar arquivo" })).toBeTruthy();
});
it("normaliza o formato e guarda o áudio enviado", async () => {
  const saved = setup();
  fireEvent.change(screen.getByLabelText("Enviar áudio de school"), {
    target: { files: [new File(["audio"], "school.mp3", { type: "audio/mp3" })] },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Guardar áudio" }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith("audio-id"));
  expect(vi.mocked(uploadRoomRecording).mock.calls[0]?.[2].type).toBe("audio/mpeg");
});
it("recusa arquivos excessivos e formatos não suportados", () => {
  setup();
  const input = screen.getByLabelText("Enviar áudio de school");
  fireEvent.change(input, {
    target: { files: [new File(["x"], "bad.pdf", { type: "application/pdf" })] },
  });
  expect(screen.getByRole("alert").textContent).toContain("Use áudio");
  fireEvent.change(input, {
    target: { files: [new File([new Uint8Array(256_001)], "big.wav", { type: "audio/wav" })] },
  });
  expect(screen.getByRole("alert").textContent).toContain("256 KB");
  expect(uploadRoomRecording).not.toHaveBeenCalled();
});
