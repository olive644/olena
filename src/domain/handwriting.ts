export type HandwritingPoint = {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
};
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
  backgroundFrame?: { x: number; y: number; width: number; height: number } | undefined;
  background?: string | undefined;
  pageText?: string;
  version: 1;
  paper: HandwritingPaper;
  paperColor?: HandwritingPaperColor;
  strokes: HandwritingStroke[];
  stickies?: HandwritingSticky[];
};

export function rulerLength(pixels: number, unit: "px" | "cm" | "in") {
  return unit === "px"
    ? `${Math.round(pixels)} px`
    : `${((pixels * 21) / 1200 / (unit === "in" ? 2.54 : 1)).toFixed(2)} ${unit}`;
}

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
