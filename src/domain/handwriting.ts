export type HandwritingPoint = { x: number; y: number; pressure: number };
export type HandwritingPaper = "ruled" | "grid" | "dots" | "blank";
export type HandwritingStroke = {
  id: string;
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  points: HandwritingPoint[];
};

export type HandwritingDocument = {
  version: 1;
  paper: HandwritingPaper;
  strokes: HandwritingStroke[];
};
