import { expect, it } from "vitest";
import { mergeHandwriting } from "./merge-handwriting";
import type { HandwritingDocument, HandwritingStroke } from "./handwriting";

const stroke = (id: string): HandwritingStroke => ({
  id,
  tool: "pen",
  color: "#000000",
  width: 2,
  points: [{ x: 1, y: 2, pressure: 0.5 }],
});
const base: HandwritingDocument = { version: 1, paper: "ruled", strokes: [stroke("old")] };
it("preserva as dimensões do quadro durante edições simultâneas", () => {
  const board: HandwritingDocument = {
    ...base,
    paper: "board",
    canvasSize: { width: 3200, height: 2400 },
  };
  const merged = mergeHandwriting(
    base,
    { ...base, strokes: [...base.strokes, stroke("new")] },
    board,
  );
  expect(merged.canvasSize).toEqual(board.canvasSize);
  expect(merged.paper).toBe("board");
  expect(merged.strokes).toHaveLength(2);
});
it("preserva traços simultâneos e aplica uma remoção feita em relação à base", () => {
  const merged = mergeHandwriting(
    base,
    { ...base, strokes: [stroke("alice")] },
    { ...base, strokes: [...base.strokes, stroke("bob")] },
  );
  expect(merged.strokes.map((item) => item.id)).toEqual(["bob", "alice"]);
});
it("não sobrescreve um texto remoto que o autor local não modificou", () => {
  expect(
    mergeHandwriting(
      base,
      { ...base, strokes: [...base.strokes, stroke("alice")] },
      { ...base, pageText: "Resposta" },
    ).pageText,
  ).toBe("Resposta");
});
