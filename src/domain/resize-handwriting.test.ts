import { expect, it } from "vitest";
import { isHandwritingDocument } from "../data/local-workspace";
import type { HandwritingDocument } from "./handwriting";
import { fitHandwriting } from "./resize-handwriting";

it("keeps board content valid and intact when switching to A4", () => {
  const document: HandwritingDocument = {
    version: 1,
    paper: "board",
    canvasSize: { width: 3200, height: 2400 },
    strokes: [
      {
        id: "ink",
        tool: "pen",
        color: "#17151c",
        width: 5,
        points: [{ x: 3100, y: 2300, pressure: 0.5 }],
      },
    ],
    stickies: [
      { id: "note", x: 3000, y: 2200, text: "Preservar", color: "yellow", width: 160, height: 120 },
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
    coordinateSystems: [
      {
        id: "axis",
        origin: { x: 3000, y: 2200, pressure: 0.5 },
        end: { x: 3100, y: 2300, pressure: 0.5 },
        step: 1,
        color: "#17151c",
      },
    ],
    backgroundFrame: { x: 0, y: 0, width: 3200, height: 2400 },
    pageTextFrame: { x: 2800, y: 2000, width: 400, height: 400 },
  };
  expect(
    isHandwritingDocument({
      ...document,
      paper: "ruled",
      canvasSize: { width: 1200, height: 1600 },
    }),
  ).toBe(false);
  const result = { ...fitHandwriting(document, 1200, 1600), paper: "ruled" };
  expect(isHandwritingDocument(result)).toBe(true);
  expect(result.strokes[0]?.points[0]).toEqual({ x: 1162.5, y: 862.5, pressure: 0.5 });
  expect(result.stickies?.[0]?.text).toBe("Preservar");
  expect(result.images).toHaveLength(1);
  expect(document.strokes[0]?.points[0]?.x).toBe(3100);
  expect(fitHandwriting(result as HandwritingDocument, 3200, 2400).strokes).toEqual(result.strokes);
});
