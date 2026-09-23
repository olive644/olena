import type {
  HandwritingCoordinateSystem,
  HandwritingDocument,
  HandwritingImage,
  HandwritingLayerKey,
  HandwritingLayerVisibility,
  HandwritingPaper,
  HandwritingStroke,
  HandwritingSticky,
} from "../domain/handwriting";

export const PAGE_WIDTH = 1200;
export const PAGE_HEIGHT = 1600;
export const STICKY_MIN_WIDTH = 160;
export const STICKY_MAX_WIDTH = 520;
export const STICKY_MIN_HEIGHT = 120;
export const STICKY_MAX_HEIGHT = 420;
export const BASE_DISPLAY_WIDTH = 760;
export const WRITING_WINDOW_WIDTH = 500;
export const WRITING_WINDOW_HEIGHT = 185;

export type HandwritingTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "hand"
  | "select"
  | "zoom-in"
  | "zoom-out"
  | "ruler"
  | "coordinates";
export type PaperStyle = HandwritingPaper;
export type Stroke = HandwritingStroke;
export type Snapshot = {
  backgroundFrame?: HandwritingDocument["backgroundFrame"];
  strokes: Stroke[];
  stickies: HandwritingSticky[];
  pageText: string;
  pageTextSize: number;
  coordinateSystems: HandwritingCoordinateSystem[];
  background?: string | undefined;
  layerVisibility: HandwritingLayerVisibility;
  layerOrder: HandwritingLayerKey[];
  images: HandwritingImage[];
};
export type SelectionBox = { x: number; y: number; width: number; height: number };
export type SelectionMode = "rectangle" | "lasso";
export const PAGE_TEXT_SELECTION_ID = "__handwriting-page-text__";
