import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HandwritingStudio } from "./handwriting-studio";
import { isHandwritingDocument } from "../data/local-workspace";
import * as exportTools from "./handwriting-export";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("confirma o salvamento manual e não confirma quando salvar falha", async () => {
  vi.spyOn(exportTools, "exportPage").mockReturnValue("data:image/png;base64,YQ==");
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,YQ==");
  const onSave = vi.fn();
  const onDirtyChange = vi.fn();
  render(
    <HandwritingStudio
      draftKey="manual-confirmation"
      onClose={vi.fn()}
      onSave={onSave}
      onDirtyChange={onDirtyChange}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar caderno" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.getByText("Folha salva no caderno").getAttribute("role")).toBe("status"),
  );
  expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  onSave.mockImplementation(() => {
    throw new Error("Sem espaço para salvar");
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar caderno" }));
  expect(screen.queryByText("Folha salva no caderno")).toBeNull();
  expect(screen.getByText("Sem espaço para salvar")).toBeTruthy();
});

it("waits for imported images and retries autosave when they finish loading", async () => {
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,YQ==");
  const images: { onload?: () => void; src: string }[] = [];
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      onload?: () => void;
      constructor() {
        images.push(this);
      }
    },
  );
  const onAutosave = vi.fn();
  render(
    <HandwritingStudio
      draftKey="autosave-loading"
      onClose={vi.fn()}
      onSave={vi.fn()}
      onAutosave={onAutosave}
      initialDocument={{
        version: 1,
        paper: "board",
        strokes: [
          {
            id: "far",
            tool: "pen",
            color: "#17151c",
            width: 5,
            points: [{ x: 3000, y: 2200, pressure: 0.5 }],
          },
        ],
        images: [
          {
            id: "image",
            x: 3000,
            y: 2200,
            width: 100,
            height: 100,
            dataUrl: "data:image/png;base64,YQ==",
          },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Tipo de papel" }));
  fireEvent.click(screen.getByRole("button", { name: "Plano semanal" }));
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
  expect(onAutosave).not.toHaveBeenCalled();
  await act(async () => {
    images.forEach((image) => image.onload?.());
  });
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
  expect(onAutosave).toHaveBeenCalledTimes(1);
  expect(isHandwritingDocument(onAutosave.mock.calls[0]?.[1])).toBe(true);
  expect(onAutosave.mock.calls[0]?.[1].pageTextFrame.width).toBe(980);
  expect(screen.queryByText(/Falha ao salvar/)).toBeNull();
});
