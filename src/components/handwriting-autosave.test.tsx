import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HandwritingStudio } from "./handwriting-studio";
import { isHandwritingDocument } from "../data/local-workspace";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
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
