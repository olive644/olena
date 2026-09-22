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

export type HandwritingCoordinateSystem = {
  id: string;
  origin: HandwritingPoint;
  end: HandwritingPoint;
  step: 1 | 2 | 5 | 10;
  color: string;
};

export type HandwritingLayerVisibility = {
  background: boolean;
  coordinates: boolean;
  strokes: boolean;
  text: boolean;
  stickies: boolean;
};

export const DEFAULT_HANDWRITING_LAYER_VISIBILITY: HandwritingLayerVisibility = {
  background: true,
  coordinates: true,
  strokes: true,
  text: true,
  stickies: true,
};

export type HandwritingDocument = {
  backgroundFrame?: { x: number; y: number; width: number; height: number } | undefined;
  background?: string | undefined;
  pageText?: string;
  pageTextSize?: number;
  coordinateSystems?: HandwritingCoordinateSystem[];
  layers?: { visibility: HandwritingLayerVisibility };
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

export function pageTextLines(text: string, fontSize = 28): string[] {
  const columns = Math.max(18, Math.floor(976 / (fontSize * 0.6)));
  return text
    .split("\n")
    .flatMap((line) => line.match(new RegExp(`.{1,${columns}}`, "gu")) ?? [""]);
}

export function erasePageText(
  text: string,
  points: readonly HandwritingPoint[],
  glyphWidth: number,
  fontSize = 28,
) {
  const lineHeight = fontSize * (40 / 28);
  return pageTextLines(text, fontSize)
    .map((line, row) =>
      Array.from(line)
        .map((character, column) =>
          points.some(
            ({ x, y }) =>
              x + 30 >= 112 + column * glyphWidth &&
              x - 30 <= 112 + (column + 1) * glyphWidth &&
              y + 30 >= 80 + row * lineHeight &&
              y - 30 <= 80 + fontSize + row * lineHeight,
          )
            ? " "
            : character,
        )
        .join(""),
    )
    .join("\n");
}
