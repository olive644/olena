export type HandwritingPoint = { x: number; y: number; pressure: number };
export type HandwritingPaper = "ruled" | "grid" | "dots" | "blank";
export type HandwritingPaperColor = "light" | "aged" | "night";
export type HandwritingStroke = {
  brush?: "fine" | "ink" | "soft";
  id: string;
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  points: HandwritingPoint[];
};

export type HandwritingSticky = {
  kind?: "text";
  ink?: string;
  id: string;
  x: number;
  y: number;
  color: "yellow" | "blue" | "lilac";
  text: string;
};

export type HandwritingDocument = {
  pageText?: string;
  version: 1;
  paper: HandwritingPaper;
  paperColor?: HandwritingPaperColor;
  strokes: HandwritingStroke[];
  stickies?: HandwritingSticky[];
};

export function pageTextLines(text: string): string[] {
  return text.split("\n").flatMap((line) => line.match(/.{1,58}/gu) ?? [""]);
}

export function erasePageText(
  text: string,
  points: readonly HandwritingPoint[],
  glyphWidth: number,
) {
  return pageTextLines(text)
    .map((line, row) =>
      Array.from(line)
        .map((character, column) =>
          points.some(
            ({ x, y }) =>
              x + 30 >= 112 + column * glyphWidth &&
              x - 30 <= 112 + (column + 1) * glyphWidth &&
              y + 30 >= 80 + row * 40 &&
              y - 30 <= 108 + row * 40,
          )
            ? " "
            : character,
        )
        .join(""),
    )
    .join("\n");
}
