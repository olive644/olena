export type HandwritingPoint = {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
};
export type HandwritingPaper =
  "ruled" | "grid" | "dots" | "blank" | "board" | "weekly" | "calendar";
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
  width?: number;
  height?: number;
  color: "yellow" | "blue" | "lilac";
  text: string;
  checklist?: HandwritingChecklistItem[] | undefined;
  formula?: boolean;
};

export type HandwritingImage = {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type HandwritingChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type HandwritingCoordinateSystem = {
  id: string;
  origin: HandwritingPoint;
  end: HandwritingPoint;
  step: 1 | 2 | 5 | 10;
  measurements?: boolean;
  color: string;
};

export type HandwritingLayerVisibility = {
  background: boolean;
  coordinates: boolean;
  strokes: boolean;
  text: boolean;
  stickies: boolean;
};

export type HandwritingLayerKey = "coordinates" | "text" | "strokes" | "stickies";

export const DEFAULT_HANDWRITING_LAYER_ORDER: HandwritingLayerKey[] = [
  "coordinates",
  "text",
  "strokes",
  "stickies",
];

export const DEFAULT_HANDWRITING_LAYER_VISIBILITY: HandwritingLayerVisibility = {
  background: true,
  coordinates: true,
  strokes: true,
  text: true,
  stickies: true,
};

export type HandwritingDocument = {
  canvasSize?: { width: number; height: number };
  backgroundFrame?: { x: number; y: number; width: number; height: number } | undefined;
  background?: string | undefined;
  pageText?: string;
  pageTextSize?: number;
  pageTextFrame?: { x: number; y: number; width: number; height: number };
  images?: HandwritingImage[];
  coordinateSystems?: HandwritingCoordinateSystem[];
  layers?: {
    visibility: HandwritingLayerVisibility;
    order?: HandwritingLayerKey[];
  };
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

export function pageTextLines(text: string, fontSize = 28, width = 980): string[] {
  const columns = Math.max(1, Math.floor((width - 4) / (fontSize * 0.6)));
  return text
    .split("\n")
    .flatMap((line) => line.match(new RegExp(`.{1,${columns}}`, "gu")) ?? [""]);
}

export function erasePageText(
  text: string,
  points: readonly HandwritingPoint[],
  glyphWidth: number,
  fontSize = 28,
  frame = { x: 112, y: 80, width: 980, height: 1440 },
) {
  const lineHeight = fontSize * (40 / 28);
  return pageTextLines(text, fontSize, frame.width)
    .map((line, row) =>
      Array.from(line)
        .map((character, column) =>
          points.some(
            ({ x, y }) =>
              x + 30 >= frame.x + column * glyphWidth &&
              x - 30 <= frame.x + (column + 1) * glyphWidth &&
              y + 30 >= frame.y + row * lineHeight &&
              y - 30 <= frame.y + fontSize + row * lineHeight,
          )
            ? " "
            : character,
        )
        .join(""),
    )
    .join("\n");
}
