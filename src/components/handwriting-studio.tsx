import { PaperEditorIcon } from "./paper-editor-icon";
import { stickyTextLayout } from "./sticky-text-layout";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { isHandwritingDocument, MAX_NOTE_ASSET_DATA_URL_LENGTH } from "../data/local-workspace";
import type {
  HandwritingDocument,
  HandwritingImage,
  HandwritingCoordinateSystem,
  HandwritingPaper,
  HandwritingPaperColor,
  HandwritingPoint,
  HandwritingStroke,
  HandwritingSticky,
  HandwritingLayerVisibility,
  HandwritingLayerKey,
} from "../domain/handwriting";
import {
  DEFAULT_HANDWRITING_LAYER_ORDER,
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
} from "../domain/handwriting";
import { stabilizeHandwriting } from "./handwriting-stabilization";
import { reviewPortugueseText } from "../domain/text-review";
import { coordinateStats, formatCoordinateNumber } from "../domain/coordinate-math";
import { normalizeMathOcrText } from "../domain/ocr";
import { HelenaLoading } from "./helena-loading";
import type { ImportedPage } from "./page-import";
const PageImport = lazy(() =>
  import("./page-import").then((module) => ({ default: module.PageImport })),
);

const PAGE_WIDTH = 1200;
const PAGE_HEIGHT = 1600;
const STICKY_MIN_WIDTH = 160;
const STICKY_MAX_WIDTH = 520;
const STICKY_MIN_HEIGHT = 120;
const STICKY_MAX_HEIGHT = 420;
const BASE_DISPLAY_WIDTH = 760;
const WRITING_WINDOW_WIDTH = 500;
const WRITING_WINDOW_HEIGHT = 185;

import { erasePageText, pageTextLines, rulerLength } from "../domain/handwriting";

type HandwritingTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "hand"
  | "select"
  | "zoom-in"
  | "zoom-out"
  | "ruler"
  | "coordinates";
type PaperStyle = HandwritingPaper;
type Stroke = HandwritingStroke;
type Snapshot = {
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
type SelectionBox = { x: number; y: number; width: number; height: number };
type SelectionMode = "rectangle" | "lasso";
const PAGE_TEXT_SELECTION_ID = "__handwriting-page-text__";

type HandwritingStudioProps = {
  onClose: () => void;
  onSave: (dataUrl: string, document: HandwritingDocument) => void;
  initialDocument?: HandwritingDocument;
  draftKey: string;
  onDirtyChange?: (dirty: boolean) => void;
  onDraftChange?: (document: HandwritingDocument) => void;
  onImportPages?: (pages: ImportedPage[]) => void;
  remoteDocument?: HandwritingDocument;
  remoteAuthor?: string;
  collaborationActivity?: string;
};

function readDraft(key: string): HandwritingDocument | null {
  try {
    const raw = localStorage.getItem(`helenastudy.handwriting.draft.${key}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isHandwritingDocument(parsed) ? (parsed as HandwritingDocument) : null;
  } catch {
    return null;
  }
}

function stickyColor(color: HandwritingSticky["color"]): string {
  return color === "blue" ? "#d9ecf4" : color === "lilac" ? "#e9ddfb" : "#fff0b5";
}

function stickyWidth(sticky: HandwritingSticky): number {
  return Math.max(STICKY_MIN_WIDTH, Math.min(STICKY_MAX_WIDTH, sticky.width ?? 260));
}

function stickyHeight(sticky: HandwritingSticky): number {
  return Math.max(STICKY_MIN_HEIGHT, Math.min(STICKY_MAX_HEIGHT, sticky.height ?? 220));
}

function pointDistance(first: HandwritingPoint, second: HandwritingPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent, "clientX" | "clientY" | "pressure"> &
    Partial<Pick<PointerEvent, "tiltX" | "tiltY">>,
): HandwritingPoint {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(canvas.width, ((event.clientX - bounds.left) / bounds.width) * canvas.width),
    ),
    y: Math.max(
      0,
      Math.min(canvas.height, ((event.clientY - bounds.top) / bounds.height) * canvas.height),
    ),
    pressure: event.pressure > 0 ? event.pressure : 0.5,
    ...(event.tiltX ? { tiltX: event.tiltX } : {}),
    ...(event.tiltY ? { tiltY: event.tiltY } : {}),
  };
}

function tiltShading(point: HandwritingPoint): number {
  // Inclinacao da caneta (graus, -90 a 90) simula uma ponta caligrafica: mais
  // deitada = traco mais largo, em pe = mais fino. Mouse/toque nao reportam
  // tilt, entao o efeito fica neutro (1) para esses dispositivos.
  const tiltX = point.tiltX ?? 0;
  const tiltY = point.tiltY ?? 0;
  const magnitude = Math.min(1, Math.hypot(tiltX, tiltY) / 90);
  return 1 + magnitude * 0.6;
}

function drawPaper(
  context: CanvasRenderingContext2D,
  paper: PaperStyle,
  paperColor: HandwritingPaperColor,
) {
  context.fillStyle =
    paperColor === "night" ? "#292432" : paperColor === "aged" ? "#f3e6c8" : "#fffdf7";
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.save();
  context.strokeStyle =
    paperColor === "night" ? "#51465d" : paperColor === "aged" ? "#d4bd91" : "#dcd8ee";
  context.fillStyle =
    paperColor === "night" ? "#6d5f78" : paperColor === "aged" ? "#d4bd91" : "#d5d0e8";
  context.lineWidth = 1.4;
  const gap = 48;
  if (paper === "ruled" || paper === "grid") {
    for (let y = 112; y < PAGE_HEIGHT; y += gap) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(PAGE_WIDTH, y);
      context.stroke();
    }
  }
  if (paper === "grid") {
    for (let x = 72; x < PAGE_WIDTH; x += gap) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, PAGE_HEIGHT);
      context.stroke();
    }
  }
  if (paper === "dots") {
    for (let y = 72; y < PAGE_HEIGHT; y += gap) {
      for (let x = 72; x < PAGE_WIDTH; x += gap) {
        context.beginPath();
        context.arc(x, y, 2.1, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  if (paper !== "blank" && paperColor !== "night") {
    context.strokeStyle = paperColor === "aged" ? "#c78f78" : "#e9b9b1";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(104, 0);
    context.lineTo(104, PAGE_HEIGHT);
    context.stroke();
  }
  context.restore();
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const first = stroke.points[0];
  if (!first) return;
  context.save();
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.globalAlpha = stroke.tool === "highlighter" ? 0.3 : stroke.brush === "soft" ? 0.16 : 1;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (stroke.tool === "highlighter" || stroke.brush === "fine") {
    context.lineWidth = stroke.tool === "highlighter" ? stroke.width : stroke.width * 0.65;
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let index = 1; index < stroke.points.length - 1; index += 1) {
      const point = stroke.points[index]!;
      const next = stroke.points[index + 1]!;
      context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    const last = stroke.points.at(-1)!;
    context.lineTo(last.x, last.y);
    if (stroke.points.length === 1) context.lineTo(first.x + 0.1, first.y);
    context.stroke();
    context.restore();
    return;
  }
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(
      first.x,
      first.y,
      stroke.width * (stroke.brush === "soft" ? 2 : stroke.brush === "ink" ? 1 : 0.5),
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
    return;
  }
  for (let index = 0; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    const next = stroke.points[index + 1];
    if (!current) continue;
    const pressure = stroke.tool === "pen" ? current.pressure : 0.7;
    const direction = previous
      ? Math.atan2(current.y - previous.y, current.x - previous.x)
      : Math.PI / 4;
    context.lineWidth =
      stroke.width *
      (stroke.brush === "ink"
        ? (0.5 + pressure * 3) *
          (0.35 + 0.65 * Math.abs(Math.sin(direction - Math.PI / 4))) *
          tiltShading(current)
        : stroke.brush === "soft"
          ? 2 + pressure * 4
          : 0.72 + pressure * 0.55);
    context.beginPath();
    context.moveTo(
      previous ? (previous.x + current.x) / 2 : current.x,
      previous ? (previous.y + current.y) / 2 : current.y,
    );
    context.quadraticCurveTo(
      current.x,
      current.y,
      next ? (current.x + next.x) / 2 : current.x,
      next ? (current.y + next.y) / 2 : current.y,
    );
    context.stroke();
    if (stroke.brush === "soft" && previous) {
      const spread = stroke.width * (1 + pressure);
      context.save();
      context.globalAlpha = 0.1;
      context.lineWidth = Math.max(0.5, stroke.width * 0.18);
      for (let bristle = -2; bristle <= 2; bristle += 1) {
        const offset = bristle * spread * 0.55;
        context.beginPath();
        context.moveTo(previous.x + offset, previous.y + offset * 0.4);
        context.lineTo(current.x + offset, current.y + offset * 0.4);
        context.stroke();
      }
      context.restore();
    }
  }
  context.restore();
}

function renderPage(
  canvas: HTMLCanvasElement,
  strokes: readonly Stroke[],
  paper: PaperStyle,
  paperColor: HandwritingPaperColor,
  stickies: readonly HandwritingSticky[],
  editing = false,
  pageText = "",
  pageTextSize = 28,
  coordinateSystems: readonly HandwritingCoordinateSystem[] = [],
  background?: HTMLImageElement,
  backgroundFrame = { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT },
  layerVisibility = DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  layerOrder = DEFAULT_HANDWRITING_LAYER_ORDER,
  importedImages: readonly {
    image: HTMLImageElement;
    frame: Pick<HandwritingImage, "x" | "y" | "width" | "height">;
    rotation?: number;
  }[] = [],
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  drawPaper(context, paper, paperColor);
  if (layerVisibility.background && background)
    context.drawImage(
      background,
      backgroundFrame.x,
      backgroundFrame.y,
      backgroundFrame.width,
      backgroundFrame.height,
    );
  if (layerVisibility.background) {
    for (const imported of importedImages) {
      context.save();
      const centerX = imported.frame.x + imported.frame.width / 2;
      const centerY = imported.frame.y + imported.frame.height / 2;
      context.translate(centerX, centerY);
      context.rotate(((imported.rotation ?? 0) * Math.PI) / 180);
      context.drawImage(
        imported.image,
        -imported.frame.width / 2,
        -imported.frame.height / 2,
        imported.frame.width,
        imported.frame.height,
      );
      context.restore();
    }
  }
  const drawStrokesLayer = () => {
    if (!layerVisibility.strokes) return;
    context.save();
    context.globalCompositeOperation =
      paperColor === "night" && (!background || !layerVisibility.background)
        ? "screen"
        : "multiply";
    for (const stroke of strokes) if (stroke.tool === "highlighter") drawStroke(context, stroke);
    context.restore();
    for (const stroke of strokes) if (stroke.tool !== "highlighter") drawStroke(context, stroke);
  };
  const drawCoordinatesLayer = () => {
    if (!layerVisibility.coordinates) return;
    for (const system of coordinateSystems) drawCoordinateSystem(context, system);
  };
  const drawTextLayer = () => {
    if (!layerVisibility.text || !pageText) return;
    context.save();
    context.fillStyle = paperColor === "night" ? "#fff9ef" : "#17151c";
    context.font = `${pageTextSize}px monospace`;
    context.textBaseline = "top";
    pageTextLines(pageText, pageTextSize).forEach((line, index) =>
      context.fillText(line, 112, 80 + index * pageTextSize * (40 / 28)),
    );
    context.restore();
  };
  const drawStickiesLayer = () => {
    if (!layerVisibility.stickies) return;
    for (const sticky of stickies) {
      if (editing && sticky.kind === "text") continue;
      context.save();
      const width = stickyWidth(sticky);
      const height = stickyHeight(sticky);
      if (sticky.kind !== "text" || sticky.formula) {
        context.fillStyle = "#bfb7a7";
        context.fillRect(sticky.x + 8, sticky.y + 9, width, height);
        context.fillStyle = stickyColor(sticky.color);
        context.fillRect(sticky.x, sticky.y, width, height);
      }
      context.fillStyle = sticky.kind === "text" ? (sticky.ink ?? "#17151c") : "#17151c";
      if (sticky.checklist?.length) {
        context.font = "bold 22px sans-serif";
        context.textBaseline = "top";
        const title = sticky.text.trim();
        if (title) context.fillText(title.slice(0, 36), sticky.x + 18, sticky.y + 26);
        const startY = sticky.y + (title ? 64 : 30);
        const rowHeight = Math.min(
          30,
          (height - (startY - sticky.y) - 18) / sticky.checklist.length,
        );
        context.font = "bold 16px sans-serif";
        sticky.checklist.forEach((item, index) => {
          const rowY = startY + index * rowHeight;
          context.strokeStyle = "#17151c";
          context.lineWidth = 2;
          context.strokeRect(sticky.x + 18, rowY + 3, 14, 14);
          if (item.done) {
            context.beginPath();
            context.moveTo(sticky.x + 20, rowY + 10);
            context.lineTo(sticky.x + 24, rowY + 14);
            context.lineTo(sticky.x + 31, rowY + 6);
            context.stroke();
          }
          context.fillStyle = item.done ? "#6b6570" : "#17151c";
          context.fillText(item.text.trim().slice(0, 32) || "Item", sticky.x + 42, rowY + 1);
        });
        context.restore();
        continue;
      }
      const { fontSize, lines } = stickyTextLayout(
        sticky.text,
        (text, size) => {
          context.font = `${sticky.formula ? "600" : "bold"} ${size}px ${sticky.formula ? "monospace" : "sans-serif"}`;
          return context.measureText(text).width;
        },
        width - 36,
        height - 46,
      );
      context.font = `${sticky.formula ? "600" : "bold"} ${fontSize}px ${sticky.formula ? "monospace" : "sans-serif"}`;
      context.textBaseline = "top";
      lines.forEach((line, index) =>
        context.fillText(line, sticky.x + 18, sticky.y + 28 + index * fontSize * 1.3),
      );
      context.restore();
    }
  };
  const completeLayerOrder = [
    ...layerOrder,
    ...DEFAULT_HANDWRITING_LAYER_ORDER.filter((key) => !layerOrder.includes(key)),
  ];
  for (const layer of completeLayerOrder) {
    if (layer === "coordinates") drawCoordinatesLayer();
    if (layer === "text") drawTextLayer();
    if (layer === "strokes") drawStrokesLayer();
    if (layer === "stickies") drawStickiesLayer();
  }
}

function drawCoordinateSystem(
  context: CanvasRenderingContext2D,
  system: HandwritingCoordinateSystem,
) {
  const { origin, end, step } = system;
  const xEnd = end.x;
  const yEnd = end.y;
  const tickGap = 48;
  const xDirection = Math.sign(xEnd - origin.x) || 1;
  const yDirection = Math.sign(yEnd - origin.y) || -1;
  context.save();
  context.strokeStyle = system.color;
  context.fillStyle = system.color;
  context.lineWidth = 3;
  context.lineCap = "round";
  context.font = "18px monospace";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(xEnd, origin.y);
  context.moveTo(origin.x, origin.y);
  context.lineTo(origin.x, yEnd);
  context.stroke();
  const arrow = (x: number, y: number, horizontal: boolean, direction: number) => {
    context.beginPath();
    if (horizontal) {
      context.moveTo(x, y);
      context.lineTo(x - direction * 16, y - 8);
      context.lineTo(x - direction * 16, y + 8);
    } else {
      context.moveTo(x, y);
      context.lineTo(x - 8, y - direction * 16);
      context.lineTo(x + 8, y - direction * 16);
    }
    context.closePath();
    context.fill();
  };
  arrow(xEnd, origin.y, true, xDirection);
  arrow(origin.x, yEnd, false, yDirection);
  context.fillText("0", origin.x - 14, origin.y + 9);
  for (
    let distance = tickGap, value = step;
    distance < Math.abs(xEnd - origin.x) - 12;
    distance += tickGap, value += step
  ) {
    const x = origin.x + distance * xDirection;
    context.beginPath();
    context.moveTo(x, origin.y - 7);
    context.lineTo(x, origin.y + 7);
    context.stroke();
    context.fillText(String(value), x, origin.y + 10);
  }
  context.textAlign = yDirection < 0 ? "right" : "left";
  context.textBaseline = "middle";
  for (
    let distance = tickGap, value = step;
    distance < Math.abs(yEnd - origin.y) - 12;
    distance += tickGap, value += step
  ) {
    const y = origin.y + distance * yDirection;
    context.beginPath();
    context.moveTo(origin.x - 7, y);
    context.lineTo(origin.x + 7, y);
    context.stroke();
    context.fillText(String(value), origin.x + (yDirection < 0 ? -12 : 12), y);
  }
  context.restore();
}

function strokeBounds(stroke: Stroke): SelectionBox {
  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function coordinateBounds(system: HandwritingCoordinateSystem): SelectionBox {
  return {
    x: Math.min(system.origin.x, system.end.x),
    y: Math.min(system.origin.y, system.end.y),
    width: Math.abs(system.end.x - system.origin.x),
    height: Math.abs(system.end.y - system.origin.y),
  };
}

function stickyBounds(sticky: HandwritingSticky): SelectionBox {
  return { x: sticky.x, y: sticky.y, width: stickyWidth(sticky), height: stickyHeight(sticky) };
}

function importedImageBounds(image: HandwritingImage): SelectionBox {
  return { x: image.x, y: image.y, width: image.width, height: image.height };
}

function pageTextBounds(text: string, size: number): SelectionBox {
  const lineHeight = size * (40 / 28);
  const height = Math.min(
    1440,
    Math.max(lineHeight, pageTextLines(text, size).length * lineHeight),
  );
  return { x: 112, y: 80, width: 980, height };
}

function overlaps(first: SelectionBox, second: SelectionBox): boolean {
  return (
    first.x <= second.x + second.width &&
    first.x + first.width >= second.x &&
    first.y <= second.y + second.height &&
    first.y + first.height >= second.y
  );
}

function pointInPolygon(point: HandwritingPoint, polygon: readonly HandwritingPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!current || !prior) continue;
    const intersects =
      current.y > point.y !== prior.y > point.y &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function unionBounds(boxes: readonly SelectionBox[]): SelectionBox | null {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}

function distanceToSegment(
  point: HandwritingPoint,
  start: HandwritingPoint,
  end: HandwritingPoint,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) return pointDistance(point, start);
  const ratio = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared),
  );
  return Math.hypot(point.x - (start.x + ratio * segmentX), point.y - (start.y + ratio * segmentY));
}

function strokeTouches(stroke: Stroke, point: HandwritingPoint, radius: number): boolean {
  if (stroke.points.length === 1) {
    const first = stroke.points[0];
    return first ? pointDistance(first, point) <= radius : false;
  }
  return stroke.points.some((current, index) => {
    const next = stroke.points[index + 1];
    return next ? distanceToSegment(point, current, next) <= radius : false;
  });
}

function exportPage(canvas: HTMLCanvasElement): string {
  const png = canvas.toDataURL("image/png");
  if (png.length <= MAX_NOTE_ASSET_DATA_URL_LENGTH) return png;
  for (const quality of [0.92, 0.82, 0.7, 0.58]) {
    const jpeg = canvas.toDataURL("image/jpeg", quality);
    if (jpeg.length <= MAX_NOTE_ASSET_DATA_URL_LENGTH) return jpeg;
  }
  throw new Error("A folha ficou grande demais. Remova alguns traços e tente novamente.");
}

function downloadCanvasAsPdf(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("Não foi possível preparar o PDF.");
  const binary = atob(dataUrl.slice(separator + 1));
  const imageBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets = [0, 0, 0, 0, 0, 0];
  let byteLength = 0;

  function append(chunk: string | Uint8Array) {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    byteLength += bytes.byteLength;
  }

  function object(number: number, body: string) {
    offsets[number] = byteLength;
    append(`${number} 0 obj\n${body}\nendobj\n`);
  }

  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${canvas.width} ${canvas.height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  offsets[4] = byteLength;
  append(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.byteLength} >>\nstream\n`,
  );
  append(imageBytes);
  append("\nendstream\nendobj\n");
  const content = `q\n${canvas.width} 0 0 ${canvas.height} 0 0 cm\n/Im0 Do\nQ\n`;
  object(5, `<< /Length ${encoder.encode(content).byteLength} >>\nstream\n${content}endstream`);
  const xrefOffset = byteLength;
  append("xref\n0 6\n0000000000 65535 f \n");
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blob = new Blob(chunks as unknown as BlobPart[], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function strokeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function HandwritingStudio({
  onClose,
  onSave,
  initialDocument,
  draftKey,
  onDirtyChange,
  onDraftChange,
  onImportPages,
  remoteDocument,
  remoteAuthor,
  collaborationActivity,
}: HandwritingStudioProps) {
  const [recovered] = useState(() => readDraft(draftKey));
  const startingDocument = recovered ?? initialDocument;
  const storedPaper = startingDocument?.paper as string | undefined;
  const legacyPaperColor: HandwritingPaperColor =
    storedPaper === "night"
      ? "night"
      : storedPaper === "aged"
        ? "aged"
        : (startingDocument?.paperColor ?? "light");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const writingCanvasRef = useRef<HTMLCanvasElement>(null);
  const writingPointerRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const [brush, setBrush] = useState<NonNullable<Stroke["brush"]>>("fine");
  const [rulerUnit, setRulerUnit] = useState<"px" | "cm" | "in">("px");
  const [coordinateStep, setCoordinateStep] = useState<1 | 2 | 5 | 10>(1);
  const [coordinateMeasurements, setCoordinateMeasurements] = useState(true);
  const [equalCoordinateAxes, setEqualCoordinateAxes] = useState(true);
  const [fileAction, setFileAction] = useState<"import" | "export" | null>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  function closeImport() {
    setFileAction(null);
    requestAnimationFrame(() => importButtonRef.current?.focus());
  }
  const [background, setBackground] = useState(startingDocument?.background);
  const [backgroundFrame, setBackgroundFrame] = useState(startingDocument?.backgroundFrame);
  const [importedImages, setImportedImages] = useState<HandwritingImage[]>(
    () => startingDocument?.images ?? [],
  );
  const imageDrag = useRef<{
    x: number;
    y: number;
    frame: NonNullable<HandwritingDocument["backgroundFrame"]>;
    resize: boolean;
  } | null>(null);
  const importedImageDrag = useRef<{
    id: string;
    x: number;
    y: number;
    frame: HandwritingImage;
    resize: boolean;
  } | null>(null);
  const [loadedImage, setBackgroundImage] = useState<HTMLImageElement>();
  const backgroundImage = loadedImage?.src === background ? loadedImage : undefined;
  useEffect(() => {
    if (!background) return;
    const image = new Image();
    image.onload = () => setBackgroundImage(image);
    image.src = background;
    return () => {
      image.onload = null;
    };
  }, [background]);
  const [loadedImportedImages, setLoadedImportedImages] = useState<
    {
      id: string;
      image: HTMLImageElement;
      frame: Pick<HandwritingImage, "x" | "y" | "width" | "height">;
      rotation?: number;
    }[]
  >([]);
  useEffect(() => {
    let cancelled = false;
    if (importedImages.length === 0) return;
    const loaded = importedImages.map(
      (entry) =>
        new Promise<{
          id: string;
          image: HTMLImageElement;
          frame: Pick<HandwritingImage, "x" | "y" | "width" | "height">;
          rotation?: number;
        } | null>((resolve) => {
          const image = new Image();
          image.onload = () =>
            resolve({
              id: entry.id,
              image,
              frame: entry,
              ...(entry.rotation === undefined ? {} : { rotation: entry.rotation }),
            });
          image.onerror = () => resolve(null);
          image.src = entry.dataUrl;
        }),
    );
    void Promise.all(loaded).then((entries) => {
      if (!cancelled)
        setLoadedImportedImages(
          entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [importedImages]);
  const renderableImportedImages = useMemo(
    () =>
      loadedImportedImages.filter((entry) => importedImages.some((image) => image.id === entry.id)),
    [importedImages, loadedImportedImages],
  );
  const importedImagesReady = importedImages.every((image) =>
    loadedImportedImages.some((entry) => entry.id === image.id),
  );
  const [rulerMeasure, setRulerMeasure] = useState<{
    start: HandwritingPoint;
    end: HandwritingPoint;
  } | null>(null);
  const [coordinateMeasure, setCoordinateMeasure] = useState<{
    start: HandwritingPoint;
    end: HandwritingPoint;
  } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const panRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const eraserChangedRef = useRef(false);
  const activeToolRef = useRef<HandwritingTool>("pen");
  const spaceToolRef = useRef<HandwritingTool | null>(null);
  const penDetectedRef = useRef(false);
  const selectionRef = useRef<{
    pointerId: number;
    start: HandwritingPoint;
    origin: HandwritingPoint;
    ids: string[];
    coordinateIds: string[];
    moving: boolean;
    lasso: boolean;
    path: HandwritingPoint[];
  } | null>(null);
  const stickyDragRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const stickyResizeRef = useRef<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => startingDocument?.strokes ?? []);
  const [pageText, setPageText] = useState(startingDocument?.pageText ?? "");
  const [pageTextSize, setPageTextSize] = useState(startingDocument?.pageTextSize ?? 28);
  const [coordinateSystems, setCoordinateSystems] = useState<HandwritingCoordinateSystem[]>(
    () => startingDocument?.coordinateSystems ?? [],
  );
  const [layerVisibility, setLayerVisibility] = useState<HandwritingLayerVisibility>(() => ({
    ...DEFAULT_HANDWRITING_LAYER_VISIBILITY,
    ...(startingDocument?.layers?.visibility ?? {}),
  }));
  const [layerOrder, setLayerOrder] = useState<HandwritingLayerKey[]>(
    () => startingDocument?.layers?.order ?? [...DEFAULT_HANDWRITING_LAYER_ORDER],
  );
  const [layersOpen, setLayersOpen] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textAutoCorrect, setTextAutoCorrect] = useState(true);
  const [stickies, setStickies] = useState<HandwritingSticky[]>(
    () => startingDocument?.stickies ?? [],
  );
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCoordinateIds, setSelectedCoordinateIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectionPath, setSelectionPath] = useState<HandwritingPoint[] | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("rectangle");
  const [formulaDraft, setFormulaDraft] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [tool, setActiveTool] = useState<HandwritingTool>("pen");
  const penInk = useRef(legacyPaperColor === "night" ? "#fff9ef" : "#17151c");
  function setTool(next: HandwritingTool) {
    if (next === "highlighter" && tool !== "highlighter") {
      penInk.current = color;
      setColor("#facc15");
    }
    if (tool === "highlighter" && next !== "highlighter") setColor(penInk.current);
    setTextMode(false);
    setActiveTool(next);
  }
  const [paper, setPaper] = useState<PaperStyle>(
    storedPaper === "night" || storedPaper === "aged"
      ? "blank"
      : (startingDocument?.paper ?? "ruled"),
  );
  const [paperColor, setPaperColor] = useState<HandwritingPaperColor>(legacyPaperColor);
  const [color, setColor] = useState(legacyPaperColor === "night" ? "#fff9ef" : "#17151c");
  const [width, setWidth] = useState(5);
  const [stabilization, setStabilization] = useState(true);
  const [penOnly, setPenOnly] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(BASE_DISPLAY_WIDTH);
  const [error, setError] = useState("");
  const [writingWindowOpen, setWritingWindowOpen] = useState(false);
  const [writingWindowX, setWritingWindowX] = useState(100);
  const [writingWindowY, setWritingWindowY] = useState(110);
  const [writingWindowAutoFollow, setWritingWindowAutoFollow] = useState(true);
  const [writingWindowStatus, setWritingWindowStatus] = useState("Coluna 1, linha 1");
  const [draftStatus, setDraftStatus] = useState(recovered ? "Rascunho recuperado" : "");

  function selectPaperColor(nextColor: HandwritingPaperColor) {
    setPaperColor(nextColor);
    if (nextColor === "night" && color === "#17151c") setColor("#fff9ef");
    if (nextColor !== "night" && color === "#fff9ef") setColor("#17151c");
  }

  function moveLayer(layer: HandwritingLayerKey, direction: -1 | 1) {
    const index = layerOrder.indexOf(layer);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= layerOrder.length) return;
    remember();
    setLayerOrder((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }

  const currentDocument: HandwritingDocument = useMemo(
    () => ({
      version: 1,
      paper,
      paperColor,
      strokes,
      stickies,
      pageText,
      pageTextSize,
      coordinateSystems,
      images: importedImages,
      layers: { visibility: layerVisibility, order: layerOrder },
      background,
      backgroundFrame,
    }),
    [
      paper,
      paperColor,
      strokes,
      stickies,
      pageText,
      pageTextSize,
      coordinateSystems,
      importedImages,
      layerVisibility,
      layerOrder,
      background,
      backgroundFrame,
    ],
  );
  const baseline = JSON.stringify({
    version: 1,
    paper:
      (initialDocument?.paper as string | undefined) === "night" ||
      (initialDocument?.paper as string | undefined) === "aged"
        ? "blank"
        : (initialDocument?.paper ?? "ruled"),
    paperColor:
      (initialDocument?.paper as string | undefined) === "night"
        ? "night"
        : (initialDocument?.paper as string | undefined) === "aged"
          ? "aged"
          : (initialDocument?.paperColor ?? "light"),
    strokes: initialDocument?.strokes ?? [],
    stickies: initialDocument?.stickies ?? [],
    pageText: initialDocument?.pageText ?? "",
    pageTextSize: initialDocument?.pageTextSize ?? 28,
    coordinateSystems: initialDocument?.coordinateSystems ?? [],
    images: initialDocument?.images ?? [],
    layers: {
      visibility: {
        ...DEFAULT_HANDWRITING_LAYER_VISIBILITY,
        ...(initialDocument?.layers?.visibility ?? {}),
      },
      order: initialDocument?.layers?.order ?? DEFAULT_HANDWRITING_LAYER_ORDER,
    },
    background: initialDocument?.background,
    backgroundFrame: initialDocument?.backgroundFrame,
  });
  const dirty = JSON.stringify(currentDocument) !== baseline;

  useEffect(() => {
    if (!remoteDocument || JSON.stringify(remoteDocument) === JSON.stringify(currentDocument))
      return;
    // A collaborator's document is an external subscription update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaper(remoteDocument.paper);
    setPaperColor(remoteDocument.paperColor ?? "light");
    setColor(remoteDocument.paperColor === "night" ? "#fff9ef" : "#17151c");
    setStrokes(remoteDocument.strokes);
    setStickies(remoteDocument.stickies ?? []);
    setPageText(remoteDocument.pageText ?? "");
    setPageTextSize(remoteDocument.pageTextSize ?? 28);
    setCoordinateSystems(remoteDocument.coordinateSystems ?? []);
    setImportedImages(remoteDocument.images ?? []);
    setLayerVisibility({
      ...DEFAULT_HANDWRITING_LAYER_VISIBILITY,
      ...(remoteDocument.layers?.visibility ?? {}),
    });
    setLayerOrder(remoteDocument.layers?.order ?? DEFAULT_HANDWRITING_LAYER_ORDER);
    setBackground(remoteDocument.background);
    setBackgroundFrame(remoteDocument.backgroundFrame);
    setDraftStatus(
      remoteAuthor ? `Atualizado por ${remoteAuthor}` : "Atualizado por um colaborador",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteAuthor, remoteDocument]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onDraftChange?.(currentDocument);
  }, [currentDocument, onDraftChange]);

  useEffect(() => {
    if (!dirty) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(
          `helenastudy.handwriting.draft.${draftKey}`,
          JSON.stringify(currentDocument),
        );
        setDraftStatus("Rascunho salvo neste dispositivo");
      } catch {
        setDraftStatus("Sem espaço para salvar rascunho neste dispositivo");
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [currentDocument, dirty, draftKey]);

  useEffect(() => {
    if (!dirty) return;
    const persistBeforeLeaving = () => {
      try {
        localStorage.setItem(
          `helenastudy.handwriting.draft.${draftKey}`,
          JSON.stringify(currentDocument),
        );
      } catch {
        // The visible quota warning remains handled by the regular draft save.
      }
    };
    window.addEventListener("pagehide", persistBeforeLeaving);
    return () => window.removeEventListener("pagehide", persistBeforeLeaving);
  }, [currentDocument, dirty, draftKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderPage(
      canvas,
      strokes,
      paper,
      paperColor,
      stickies,
      true,
      textMode ? "" : pageText,
      pageTextSize,
      coordinateSystems,
      backgroundImage,
      backgroundFrame,
      layerVisibility,
      layerOrder,
      renderableImportedImages,
    );
    const context = canvas.getContext("2d");
    if (!context) return;
    context.save();
    context.setLineDash([14, 9]);
    context.strokeStyle = "#7433e0";
    context.lineWidth = 3;
    for (const stroke of strokes) {
      if (!selectedIds.includes(stroke.id)) continue;
      const box = strokeBounds(stroke);
      context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
    }
    if (layerVisibility.coordinates) {
      for (const system of coordinateSystems) {
        if (!selectedIds.includes(system.id)) continue;
        const box = coordinateBounds(system);
        context.strokeRect(box.x - 12, box.y - 12, box.width + 24, box.height + 24);
      }
    }
    if (layerVisibility.stickies) {
      for (const sticky of stickies) {
        if (!selectedIds.includes(sticky.id)) continue;
        const box = stickyBounds(sticky);
        context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
      }
    }
    if (layerVisibility.text && pageText && selectedIds.includes(PAGE_TEXT_SELECTION_ID)) {
      const box = pageTextBounds(pageText, pageTextSize);
      context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
    }
    if (layerVisibility.background) {
      for (const image of importedImages) {
        if (!selectedIds.includes(image.id)) continue;
        const box = importedImageBounds(image);
        context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
      }
    }
    if (selectionBox) {
      context.fillStyle = "#7433e026";
      context.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      context.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
    }
    if (selectionPath && selectionPath.length > 1) {
      context.beginPath();
      context.moveTo(selectionPath[0]!.x, selectionPath[0]!.y);
      for (const point of selectionPath.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.fillStyle = "#7433e026";
      context.fill();
      context.stroke();
    }
    context.restore();
  }, [
    paper,
    paperColor,
    selectedIds,
    selectedCoordinateIds,
    selectionBox,
    selectionPath,
    stickies,
    strokes,
    pageText,
    pageTextSize,
    coordinateSystems,
    importedImages,
    layerVisibility,
    layerOrder,
    textMode,
    backgroundImage,
    backgroundFrame,
    renderableImportedImages,
  ]);

  useEffect(() => {
    if (!writingWindowOpen) return;
    const source = canvasRef.current;
    const target = writingCanvasRef.current;
    const context = target?.getContext("2d");
    if (!source || !target || !context) return;
    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(
      source,
      writingWindowX,
      writingWindowY,
      WRITING_WINDOW_WIDTH,
      WRITING_WINDOW_HEIGHT,
      0,
      0,
      target.width,
      target.height,
    );
    context.fillStyle = "#7433e055";
    context.fillRect(target.width - 14, 0, 2, target.height);
  }, [
    paper,
    stickies,
    strokes,
    writingWindowOpen,
    writingWindowX,
    writingWindowY,
    backgroundImage,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setFitWidth(Math.min(BASE_DISPLAY_WIDTH, viewport.clientWidth - 28));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  type ShortcutState = {
    tool: HandwritingTool;
    fileAction: "import" | "export" | null;
    writingWindowOpen: boolean;
    undo: () => void;
    redo: () => void;
    zoomAt: (clientX: number, clientY: number, direction: 1 | -1) => void;
    resetView: () => void;
    setTool: (next: HandwritingTool) => void;
  };
  const shortcutStateRef = useRef<ShortcutState>({
    tool,
    fileAction,
    writingWindowOpen,
    undo: () => undefined,
    redo: () => undefined,
    zoomAt: () => undefined,
    resetView: () => undefined,
    setTool,
  });

  // Atalhos de teclado no estilo Xournal++/apps de mesa digitalizadora:
  // Ctrl+Z / Ctrl+Shift+Z (desfazer/refazer), P/E/H (trocar ferramenta),
  // Ctrl +/-/0 (zoom) e Espaco segurado para pan temporario. Usamos uma ref
  // para o handler ler sempre o estado mais recente sem precisar recriar o
  // listener a cada render.
  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    }
    function centerZoom(direction: 1 | -1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      shortcutStateRef.current.zoomAt(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
        direction,
      );
    }
    function onKeyDown(event: KeyboardEvent) {
      const current = shortcutStateRef.current;
      if (current.fileAction || current.writingWindowOpen || isEditableTarget(event.target)) return;
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      if (ctrlOrCmd && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) current.redo();
        else current.undo();
        return;
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "y") {
        event.preventDefault();
        current.redo();
        return;
      }
      if (ctrlOrCmd && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        centerZoom(1);
        return;
      }
      if (ctrlOrCmd && event.key === "-") {
        event.preventDefault();
        centerZoom(-1);
        return;
      }
      if (ctrlOrCmd && event.key === "0") {
        event.preventDefault();
        current.resetView();
        return;
      }
      if (ctrlOrCmd || event.altKey) return;
      if (event.code === "Space") {
        if (!event.repeat && spaceToolRef.current === null && current.tool !== "hand") {
          spaceToolRef.current = current.tool;
          current.setTool("hand");
        }
        event.preventDefault();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        current.setTool("pen");
      } else if (key === "e") {
        event.preventDefault();
        current.setTool("eraser");
      } else if (key === "h") {
        event.preventDefault();
        current.setTool("hand");
      } else if (key === "v") {
        event.preventDefault();
        current.setTool("select");
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      const previous = spaceToolRef.current;
      if (previous === null) return;
      spaceToolRef.current = null;
      shortcutStateRef.current.setTool(previous);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Ctrl/Cmd+scroll para zoom centralizado no cursor, como em apps de desenho
  // profissionais. Precisa de um listener nativo (nao onWheel do React): o
  // React trata wheel como passivo por padrao, entao preventDefault() dentro
  // de onWheel falha silenciosamente e a pagina ainda rolaria junto do zoom.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      shortcutStateRef.current.zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1 : -1);
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  function remember(
    currentStrokes: Stroke[] = strokes,
    currentStickies: HandwritingSticky[] = stickies,
    currentImages: HandwritingImage[] = importedImages,
  ) {
    setUndoStack((history) => [
      ...history.slice(-39),
      {
        strokes: currentStrokes,
        stickies: currentStickies,
        pageText,
        pageTextSize,
        coordinateSystems,
        layerVisibility,
        layerOrder,
        images: currentImages,
        background,
        backgroundFrame,
      },
    ]);
    setRedoStack([]);
  }

  function zoomAt(clientX: number, clientY: number, direction: 1 | -1) {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const bounds = canvas.getBoundingClientRect();
    const relativeX = (clientX - bounds.left) / bounds.width;
    const relativeY = (clientY - bounds.top) / bounds.height;
    const nextZoom = Math.max(0.7, Math.min(2, Math.round((zoom + direction * 0.15) * 100) / 100));
    if (nextZoom === zoom) return;
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const nextBounds = canvas.getBoundingClientRect();
      viewport.scrollLeft += nextBounds.left + relativeX * nextBounds.width - clientX;
      viewport.scrollTop += nextBounds.top + relativeY * nextBounds.height - clientY;
    });
  }

  function eraseAt(points: HandwritingPoint[]) {
    setStrokes((current) => {
      const next = current.filter(
        (stroke) => !points.some((point) => strokeTouches(stroke, point, 30)),
      );
      if (next.length !== current.length) eraserChangedRef.current = true;
      return next;
    });
    const context = canvasRef.current?.getContext("2d");
    if (context) {
      context.save();
      context.font = `${pageTextSize}px monospace`;
      const glyphWidth = context.measureText("M").width;
      context.restore();
      setPageText((current) => {
        const next = erasePageText(current, points, glyphWidth, pageTextSize);
        if (next !== current) eraserChangedRef.current = true;
        return next;
      });
    }
    setStickies((current) => {
      const next = current.filter(
        (sticky) =>
          sticky.kind !== "text" ||
          !points.some(
            ({ x, y }) =>
              x >= sticky.x - 30 &&
              x <= sticky.x + stickyWidth(sticky) + 30 &&
              y >= sticky.y - 30 &&
              y <= sticky.y + stickyHeight(sticky) + 30,
          ),
      );
      if (next.length !== current.length) eraserChangedRef.current = true;
      return next;
    });
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    // Ponta de borracha invertida e botao de barril sao comuns em mesas
    // digitalizadoras (Wacom, Huion, Surface Pen). O navegador reporta a
    // ponta de borracha como button 5 e o botao de barril como button 2 em
    // pointerType "pen" — tratamos os dois sem exigir que a pessoa troque de
    // ferramenta manualmente.
    const isPenEraserTip = event.pointerType === "pen" && event.button === 5;
    const isPenBarrelButton = event.pointerType === "pen" && event.button === 2;
    if (event.button !== 0 && !isPenEraserTip && !isPenBarrelButton) return;
    if (event.pointerType === "pen" && !penDetectedRef.current) {
      penDetectedRef.current = true;
      setPenOnly(true);
    }
    const effectiveTool: HandwritingTool = isPenEraserTip
      ? "eraser"
      : isPenBarrelButton
        ? "hand"
        : tool;
    activeToolRef.current = effectiveTool;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (effectiveTool === "zoom-in" || effectiveTool === "zoom-out") {
      zoomAt(event.clientX, event.clientY, effectiveTool === "zoom-in" ? 1 : -1);
      return;
    }
    if (activePointerRef.current !== null) return;
    canvas.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    if (effectiveTool === "hand" || (penOnly && event.pointerType === "touch")) {
      const viewport = viewportRef.current;
      if (!viewport) {
        activePointerRef.current = null;
        return;
      }
      panRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
      return;
    }
    drawingRef.current = true;
    liveStrokeRef.current = null;
    setError("");
    const point = canvasPoint(canvas, event);
    if (effectiveTool === "ruler") setRulerMeasure({ start: point, end: point });
    if (effectiveTool === "coordinates") {
      remember();
      setCoordinateMeasure({ start: point, end: point });
      return;
    }
    if (effectiveTool === "select") {
      if (selectionMode === "lasso") {
        selectionRef.current = {
          pointerId: event.pointerId,
          start: point,
          origin: point,
          ids: [],
          coordinateIds: [],
          moving: false,
          lasso: true,
          path: [point],
        };
        setSelectedIds([]);
        setSelectionBox(null);
        setSelectionPath([point]);
        return;
      }
      const hitSelected =
        strokes.some(
          (stroke) => selectedIds.includes(stroke.id) && strokeTouches(stroke, point, 24),
        ) ||
        (layerVisibility.coordinates &&
          coordinateSystems.some(
            (system) =>
              selectedIds.includes(system.id) &&
              overlaps(coordinateBounds(system), {
                x: point.x - 24,
                y: point.y - 24,
                width: 48,
                height: 48,
              }),
          )) ||
        (layerVisibility.stickies &&
          stickies.some(
            (sticky) =>
              selectedIds.includes(sticky.id) &&
              overlaps(stickyBounds(sticky), {
                x: point.x - 24,
                y: point.y - 24,
                width: 48,
                height: 48,
              }),
          )) ||
        (layerVisibility.text &&
          Boolean(pageText) &&
          selectedIds.includes(PAGE_TEXT_SELECTION_ID) &&
          overlaps(pageTextBounds(pageText, pageTextSize), {
            x: point.x - 24,
            y: point.y - 24,
            width: 48,
            height: 48,
          })) ||
        (layerVisibility.background &&
          importedImages.some(
            (image) =>
              selectedIds.includes(image.id) &&
              overlaps(importedImageBounds(image), {
                x: point.x - 24,
                y: point.y - 24,
                width: 48,
                height: 48,
              }),
          ));
      selectionRef.current = {
        pointerId: event.pointerId,
        start: point,
        origin: point,
        ids: hitSelected ? selectedIds : [],
        coordinateIds: hitSelected ? selectedCoordinateIds : [],
        moving: hitSelected,
        lasso: false,
        path: [],
      };
      if (hitSelected) remember();
      else {
        setSelectedIds([]);
        setSelectedCoordinateIds([]);
        setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
      }
      return;
    }
    remember();
    if (effectiveTool === "eraser") {
      eraserChangedRef.current = false;
      eraseAt([point]);
      return;
    }
    const activeWidth = effectiveTool === "highlighter" ? Math.max(22, width * 4) : width;
    const nextStroke: Stroke = {
      id: strokeId(),
      tool: effectiveTool === "ruler" ? "pen" : effectiveTool,
      ...(effectiveTool === "pen" ? { brush } : {}),
      color,
      width: activeWidth,
      points: [point],
    };
    if (effectiveTool !== "ruler") liveStrokeRef.current = nextStroke;
    setStrokes((current) => [...current, nextStroke]);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    const viewport = viewportRef.current;
    const pan = panRef.current;
    if (pan && viewport && pan.pointerId === event.pointerId) {
      viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
      viewport.scrollTop = pan.scrollTop - (event.clientY - pan.y);
      return;
    }
    if (event.pointerId !== activePointerRef.current) return;
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selection = selectionRef.current;
    if (selection && selection.pointerId === event.pointerId) {
      const point = canvasPoint(canvas, event);
      if (selection.lasso) {
        selection.path.push(point);
        setSelectionPath([...selection.path]);
        return;
      }
      if (selection.moving) {
        const dx = point.x - selection.origin.x;
        const dy = point.y - selection.origin.y;
        if (dx !== 0 || dy !== 0) {
          setStrokes((current) =>
            current.map((stroke) =>
              selection.ids.includes(stroke.id)
                ? {
                    ...stroke,
                    points: stroke.points.map((item) => ({
                      ...item,
                      x: Math.max(0, Math.min(PAGE_WIDTH, item.x + dx)),
                      y: Math.max(0, Math.min(PAGE_HEIGHT, item.y + dy)),
                    })),
                  }
                : stroke,
            ),
          );
          setCoordinateSystems((current) =>
            current.map((system) => {
              if (!selection.ids.includes(system.id)) return system;
              return {
                ...system,
                origin: {
                  ...system.origin,
                  x: Math.max(0, Math.min(PAGE_WIDTH, system.origin.x + dx)),
                  y: Math.max(0, Math.min(PAGE_HEIGHT, system.origin.y + dy)),
                },
                end: {
                  ...system.end,
                  x: Math.max(0, Math.min(PAGE_WIDTH, system.end.x + dx)),
                  y: Math.max(0, Math.min(PAGE_HEIGHT, system.end.y + dy)),
                },
              };
            }),
          );
          setStickies((current) =>
            current.map((sticky) =>
              selection.ids.includes(sticky.id)
                ? {
                    ...sticky,
                    x: Math.max(0, Math.min(PAGE_WIDTH - stickyWidth(sticky), sticky.x + dx)),
                    y: Math.max(0, Math.min(PAGE_HEIGHT - stickyHeight(sticky), sticky.y + dy)),
                  }
                : sticky,
            ),
          );
          setImportedImages((current) =>
            current.map((image) =>
              selection.ids.includes(image.id)
                ? {
                    ...image,
                    x: Math.max(0, Math.min(PAGE_WIDTH - image.width, image.x + dx)),
                    y: Math.max(0, Math.min(PAGE_HEIGHT - image.height, image.y + dy)),
                  }
                : image,
            ),
          );
          selection.origin = point;
        }
      } else {
        setSelectionBox({
          x: Math.min(selection.start.x, point.x),
          y: Math.min(selection.start.y, point.y),
          width: Math.abs(point.x - selection.start.x),
          height: Math.abs(point.y - selection.start.y),
        });
      }
      return;
    }
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = (coalesced.length > 0 ? coalesced : [event.nativeEvent]).map((point) =>
      canvasPoint(canvas, point),
    );
    if (activeToolRef.current === "ruler") {
      const end = points.at(-1);
      if (end) setRulerMeasure((measurement) => (measurement ? { ...measurement, end } : null));
    }
    if (activeToolRef.current === "coordinates") {
      const end = points.at(-1);
      if (end)
        setCoordinateMeasure((measurement) => {
          if (!measurement) return null;
          if (!equalCoordinateAxes) return { ...measurement, end };
          const size = Math.max(
            Math.abs(end.x - measurement.start.x),
            Math.abs(end.y - measurement.start.y),
          );
          return {
            ...measurement,
            end: {
              ...end,
              x: measurement.start.x + (end.x >= measurement.start.x ? size : -size),
              y: measurement.start.y + (end.y >= measurement.start.y ? size : -size),
            },
          };
        });
      return;
    }
    if (activeToolRef.current === "eraser") {
      eraseAt(points);
      return;
    }
    if (activeToolRef.current === "ruler") {
      setStrokes((current) => {
        const last = current.at(-1);
        if (!last) return current;
        const start = last.points[0];
        const end = points.at(-1);
        if (!start || !end) return current;
        return [
          ...current.slice(0, -1),
          { ...last, points: [start, { ...end, pressure: start.pressure }] },
        ];
      });
      return;
    }
    const liveStroke = liveStrokeRef.current;
    if (!liveStroke) return;
    const previous = liveStroke.points.at(-1);
    const added = points.reduce<HandwritingPoint[]>((accepted, point) => {
      const lastPoint = accepted.at(-1) ?? previous;
      if (!lastPoint || pointDistance(lastPoint, point) >= 1.4) accepted.push(point);
      return accepted;
    }, []);
    if (added.length === 0) return;
    liveStroke.points.push(...added);
    const context = canvas.getContext("2d");
    if (context && previous) drawStroke(context, { ...liveStroke, points: [previous, ...added] });
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerId !== activePointerRef.current) return;
    setRulerMeasure(null);
    if (activeToolRef.current === "coordinates" && coordinateMeasure) {
      const width = Math.abs(coordinateMeasure.end.x - coordinateMeasure.start.x);
      const height = Math.abs(coordinateMeasure.end.y - coordinateMeasure.start.y);
      if (width > 48 && height > 48)
        setCoordinateSystems((current) => [
          ...current,
          {
            id: strokeId(),
            origin: coordinateMeasure.start,
            end: coordinateMeasure.end,
            step: coordinateStep,
            color,
          },
        ]);
      else setUndoStack((history) => history.slice(0, -1));
      setCoordinateMeasure(null);
      activePointerRef.current = null;
      drawingRef.current = false;
      return;
    }
    activePointerRef.current = null;
    if (selectionRef.current) {
      const selection = selectionRef.current;
      selectionRef.current = null;
      drawingRef.current = false;
      if (selection.lasso) {
        const point = canvasRef.current ? canvasPoint(canvasRef.current, event) : selection.start;
        const polygon = [...selection.path, point];
        setSelectedIds([
          ...strokes
            .filter((stroke) => {
              const box = strokeBounds(stroke);
              return pointInPolygon(
                { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 },
                polygon,
              );
            })
            .map((stroke) => stroke.id),
          ...(layerVisibility.coordinates
            ? coordinateSystems
                .filter((system) => {
                  const box = coordinateBounds(system);
                  return pointInPolygon(
                    { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 },
                    polygon,
                  );
                })
                .map((system) => system.id)
            : []),
          ...(layerVisibility.stickies
            ? stickies
                .filter((sticky) => {
                  const box = stickyBounds(sticky);
                  return pointInPolygon(
                    { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 },
                    polygon,
                  );
                })
                .map((sticky) => sticky.id)
            : []),
          ...(layerVisibility.text && pageText
            ? pointInPolygon(
                {
                  x:
                    pageTextBounds(pageText, pageTextSize).x +
                    pageTextBounds(pageText, pageTextSize).width / 2,
                  y:
                    pageTextBounds(pageText, pageTextSize).y +
                    pageTextBounds(pageText, pageTextSize).height / 2,
                  pressure: 0.5,
                },
                polygon,
              )
              ? [PAGE_TEXT_SELECTION_ID]
              : []
            : []),
          ...(layerVisibility.background
            ? importedImages
                .filter((image) => {
                  const box = importedImageBounds(image);
                  return pointInPolygon(
                    { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 },
                    polygon,
                  );
                })
                .map((image) => image.id)
            : []),
        ]);
        setSelectionPath(null);
        return;
      }
      if (!selection.moving) {
        const point = canvasRef.current ? canvasPoint(canvasRef.current, event) : selection.start;
        const box = {
          x: Math.min(selection.start.x, point.x),
          y: Math.min(selection.start.y, point.y),
          width: Math.abs(point.x - selection.start.x),
          height: Math.abs(point.y - selection.start.y),
        };
        setSelectedIds([
          ...strokes
            .filter((stroke) => overlaps(strokeBounds(stroke), box))
            .map((stroke) => stroke.id),
          ...(layerVisibility.coordinates
            ? coordinateSystems
                .filter((system) => overlaps(coordinateBounds(system), box))
                .map((system) => system.id)
            : []),
          ...(layerVisibility.stickies
            ? stickies
                .filter((sticky) => overlaps(stickyBounds(sticky), box))
                .map((sticky) => sticky.id)
            : []),
          ...(layerVisibility.text &&
          pageText &&
          overlaps(pageTextBounds(pageText, pageTextSize), box)
            ? [PAGE_TEXT_SELECTION_ID]
            : []),
          ...(layerVisibility.background
            ? importedImages
                .filter((image) => overlaps(importedImageBounds(image), box))
                .map((image) => image.id)
            : []),
        ]);
        setSelectionBox(null);
        setSelectionPath(null);
      }
      return;
    }
    if (panRef.current) {
      panRef.current = null;
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (activeToolRef.current === "eraser") {
      if (!eraserChangedRef.current) setUndoStack((history) => history.slice(0, -1));
      return;
    }
    if (activeToolRef.current === "ruler") return;
    const liveStroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (!liveStroke) return;
    const points = (
      stabilization ? stabilizeHandwriting(liveStroke.points) : liveStroke.points
    ).map((point) => ({
      ...point,
      x: Math.max(0, Math.min(PAGE_WIDTH, point.x)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, point.y)),
    }));
    setStrokes((current) =>
      current.map((stroke) => (stroke.id === liveStroke.id ? { ...liveStroke, points } : stroke)),
    );
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((history) => [
      ...history,
      {
        strokes,
        stickies,
        pageText,
        pageTextSize,
        coordinateSystems,
        layerVisibility,
        layerOrder,
        images: importedImages,
        background,
        backgroundFrame,
      },
    ]);
    setStrokes(previous.strokes);
    setStickies(previous.stickies);
    setPageText(previous.pageText);
    setPageTextSize(previous.pageTextSize);
    setCoordinateSystems(previous.coordinateSystems);
    setImportedImages(previous.images);
    setLayerVisibility(previous.layerVisibility);
    setLayerOrder(previous.layerOrder);
    setBackground(previous.background);
    setBackgroundFrame(previous.backgroundFrame);
    setSelectedIds([]);
    setSelectedCoordinateIds([]);
    setUndoStack((history) => history.slice(0, -1));
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((history) => [
      ...history,
      {
        strokes,
        stickies,
        pageText,
        pageTextSize,
        coordinateSystems,
        layerVisibility,
        layerOrder,
        images: importedImages,
        background,
        backgroundFrame,
      },
    ]);
    setStrokes(next.strokes);
    setStickies(next.stickies);
    setPageText(next.pageText);
    setPageTextSize(next.pageTextSize);
    setCoordinateSystems(next.coordinateSystems);
    setImportedImages(next.images);
    setLayerVisibility(next.layerVisibility);
    setLayerOrder(next.layerOrder);
    setBackground(next.background);
    setBackgroundFrame(next.backgroundFrame);
    setSelectedIds([]);
    setSelectedCoordinateIds([]);
    setRedoStack((history) => history.slice(0, -1));
  }

  function clearPage() {
    if (
      strokes.length === 0 &&
      stickies.length === 0 &&
      coordinateSystems.length === 0 &&
      !pageText &&
      importedImages.length === 0
    )
      return;
    remember();
    setStrokes([]);
    setStickies([]);
    setPageText("");
    setCoordinateSystems([]);
    setImportedImages([]);
    setSelectedIds([]);
    setSelectedCoordinateIds([]);
  }

  function deleteSelection() {
    if (!selectedIds.length && !selectedCoordinateIds.length) return;
    remember();
    setStrokes((current) => current.filter((stroke) => !selectedIds.includes(stroke.id)));
    setCoordinateSystems((current) => current.filter((system) => !selectedIds.includes(system.id)));
    setStickies((current) => current.filter((sticky) => !selectedIds.includes(sticky.id)));
    setImportedImages((current) => current.filter((image) => !selectedIds.includes(image.id)));
    if (selectedIds.includes(PAGE_TEXT_SELECTION_ID)) setPageText("");
    setSelectedIds([]);
    setSelectedCoordinateIds([]);
  }

  function selectionBounds(): SelectionBox | null {
    return unionBounds([
      ...strokes.filter((stroke) => selectedIds.includes(stroke.id)).map(strokeBounds),
      ...coordinateSystems
        .filter((system) => selectedIds.includes(system.id))
        .map(coordinateBounds),
      ...stickies.filter((sticky) => selectedIds.includes(sticky.id)).map(stickyBounds),
      ...importedImages.filter((image) => selectedIds.includes(image.id)).map(importedImageBounds),
      ...(pageText && selectedIds.includes(PAGE_TEXT_SELECTION_ID)
        ? [pageTextBounds(pageText, pageTextSize)]
        : []),
    ]);
  }

  function useCoordinateFormula() {
    const coordinateSystem = coordinateSystems.find((system) => selectedIds.includes(system.id));
    if (!coordinateSystem) return;
    const stats = coordinateStats(coordinateSystem);
    setFormulaDraft(
      stats.slope === null
        ? `x = ${formatCoordinateNumber(coordinateSystem.origin.x)}`
        : `Δy = ${formatCoordinateNumber(stats.slope)} · Δx`,
    );
  }

  function insertFormulaAnnotation() {
    const formula = formulaDraft.trim();
    if (!formula) return;
    const coordinateSystem = coordinateSystems.find((system) => selectedIds.includes(system.id));
    const bounds = selectionBounds() ?? (coordinateSystem && coordinateBounds(coordinateSystem));
    if (!bounds) return;
    remember();
    setStickies((current) => [
      ...current,
      {
        id: strokeId(),
        kind: "text",
        formula: true,
        x: Math.max(24, Math.min(PAGE_WIDTH - 460, bounds.x)),
        y: Math.max(24, Math.min(PAGE_HEIGHT - 140, bounds.y + bounds.height + 18)),
        width: 460,
        height: 140,
        color: "yellow",
        ink: color,
        text: formula.slice(0, 240),
      },
    ]);
    setFormulaDraft("");
    setSelectedIds([]);
  }

  async function recognizeSelectedFormula() {
    const selectedStrokes = strokes.filter(
      (stroke) => selectedIds.includes(stroke.id) && stroke.tool !== "highlighter",
    );
    const bounds = unionBounds(selectedStrokes.map(strokeBounds));
    if (!bounds) {
      setError("Selecione traços de uma expressão antes de reconhecer a fórmula.");
      return;
    }
    setError("");
    setOcrBusy(true);
    setOcrProgress(0);
    type OcrWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;
    let worker: OcrWorker | null = null;
    try {
      const temporaryCanvas = document.createElement("canvas");
      const padding = 32;
      const scale = 2;
      temporaryCanvas.width = Math.ceil((bounds.width + padding * 2) * scale);
      temporaryCanvas.height = Math.ceil((bounds.height + padding * 2) * scale);
      const context = temporaryCanvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a seleção para OCR.");
      context.scale(scale, scale);
      context.fillStyle = "#fff9ef";
      context.fillRect(0, 0, bounds.width + padding * 2, bounds.height + padding * 2);
      context.translate(padding - bounds.x, padding - bounds.y);
      for (const stroke of selectedStrokes) drawStroke(context, stroke);

      const { createWorker, PSM } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        logger: (message) => setOcrProgress(Math.round(message.progress * 100)),
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist:
          "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-=()[]{}.,/:^*xXyY",
      });
      const result = await worker.recognize(temporaryCanvas.toDataURL("image/png"));
      const recognized = normalizeMathOcrText(result.data.text ?? "");
      if (!recognized)
        throw new Error("O OCR não encontrou uma expressão legível. Revise ou digite a fórmula.");
      setFormulaDraft(recognized);
      setOcrProgress(100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reconhecer a fórmula.");
    } finally {
      if (worker) await worker.terminate();
      setOcrBusy(false);
    }
  }

  function scaleSelection(factor: number) {
    const bounds = selectionBounds();
    if (!bounds || (bounds.width < 1 && bounds.height < 1)) return;
    remember();
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const scalePoint = (point: HandwritingPoint): HandwritingPoint => ({
      ...point,
      x: Math.max(0, Math.min(PAGE_WIDTH, center.x + (point.x - center.x) * factor)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, center.y + (point.y - center.y) * factor)),
    });
    setStrokes((current) =>
      current.map((stroke) =>
        selectedIds.includes(stroke.id)
          ? { ...stroke, points: stroke.points.map(scalePoint), width: stroke.width * factor }
          : stroke,
      ),
    );
    setCoordinateSystems((current) =>
      current.map((system) =>
        selectedIds.includes(system.id)
          ? { ...system, origin: scalePoint(system.origin), end: scalePoint(system.end) }
          : system,
      ),
    );
    setImportedImages((current) =>
      current.map((image) => {
        if (!selectedIds.includes(image.id)) return image;
        const width = Math.max(40, Math.min(PAGE_WIDTH, image.width * factor));
        const height = Math.max(40, Math.min(PAGE_HEIGHT, image.height * factor));
        return {
          ...image,
          x: Math.max(0, Math.min(PAGE_WIDTH - width, center.x - width / 2)),
          y: Math.max(0, Math.min(PAGE_HEIGHT - height, center.y - height / 2)),
          width,
          height,
        };
      }),
    );
  }

  function removeBackground() {
    if (!background) return;
    remember();
    setBackground(undefined);
    setBackgroundFrame(undefined);
  }

  function removeSelectedImages() {
    const selectedImages = importedImages.filter((image) => selectedIds.includes(image.id));
    if (!selectedImages.length) return;
    remember();
    setImportedImages((current) => current.filter((image) => !selectedIds.includes(image.id)));
    setSelectedIds((current) =>
      current.filter((id) => !selectedImages.some((image) => image.id === id)),
    );
  }

  function rotateSelectedImages(direction: -1 | 1) {
    if (!importedImages.some((image) => selectedIds.includes(image.id))) return;
    remember();
    setImportedImages((current) =>
      current.map((image) => {
        if (!selectedIds.includes(image.id)) return image;
        const rotation = ((image.rotation ?? 0) + direction * 15 + 360) % 360;
        return { ...image, rotation };
      }),
    );
  }

  function alignSelection() {
    if (!selectedIds.length) return;
    remember();
    const chosen = strokes.filter((stroke) => selectedIds.includes(stroke.id));
    const target =
      chosen.reduce((sum, stroke) => {
        const box = strokeBounds(stroke);
        return sum + box.y + box.height / 2;
      }, 0) / chosen.length;
    setStrokes((current) =>
      current.map((stroke) => {
        if (!selectedIds.includes(stroke.id)) return stroke;
        const box = strokeBounds(stroke);
        const delta = target - (box.y + box.height / 2);
        return {
          ...stroke,
          points: stroke.points.map((point) => ({
            ...point,
            y: Math.max(0, Math.min(PAGE_HEIGHT, point.y + delta)),
          })),
        };
      }),
    );
  }

  function addSticky(kind?: "text") {
    if (stickies.length >= 40) {
      setError("Esta folha chegou ao limite de 40 post-its.");
      return;
    }
    remember();
    setStickies((current) => [
      ...current,
      {
        id: strokeId(),
        x: 160 + (current.length % 3) * 55,
        y: 160 + (current.length % 4) * 55,
        color: "yellow",
        text: "",
        ...(kind ? { kind, ink: color } : {}),
      },
    ]);
  }

  function updateSticky(id: string, change: Partial<HandwritingSticky>) {
    setStickies((current) =>
      current.map((sticky) => (sticky.id === id ? { ...sticky, ...change } : sticky)),
    );
  }

  function toggleStickyChecklist(sticky: HandwritingSticky) {
    remember();
    if (sticky.checklist?.length) {
      const itemText = sticky.checklist
        .map((item) => item.text.trim())
        .filter(Boolean)
        .join("\n");
      updateSticky(sticky.id, {
        checklist: undefined,
        text: [sticky.text.trim(), itemText].filter(Boolean).join("\n").slice(0, 240),
      });
      return;
    }
    updateSticky(sticky.id, {
      checklist: [{ id: strokeId(), text: "", done: false }],
    });
  }

  function updateChecklistItem(
    sticky: HandwritingSticky,
    itemId: string,
    change: { text?: string; done?: boolean },
  ) {
    if (!sticky.checklist) return;
    updateSticky(sticky.id, {
      checklist: sticky.checklist.map((item) =>
        item.id === itemId ? { ...item, ...change } : item,
      ),
    });
  }

  function addChecklistItem(sticky: HandwritingSticky) {
    if (!sticky.checklist || sticky.checklist.length >= 12) return;
    remember();
    updateSticky(sticky.id, {
      checklist: [...sticky.checklist, { id: strokeId(), text: "", done: false }],
    });
  }

  function removeChecklistItem(sticky: HandwritingSticky, itemId: string) {
    if (!sticky.checklist || sticky.checklist.length <= 1) return;
    remember();
    updateSticky(sticky.id, {
      checklist: sticky.checklist.filter((item) => item.id !== itemId),
    });
  }

  function moveStickyLayer(stickyId: string, direction: "front" | "back") {
    const currentIndex = stickies.findIndex((sticky) => sticky.id === stickyId);
    if (currentIndex < 0) return;
    const targetIndex = direction === "front" ? stickies.length - 1 : 0;
    if (currentIndex === targetIndex) return;
    remember();
    setStickies((current) => {
      const next = [...current];
      const [moved] = next.splice(currentIndex, 1);
      if (!moved) return current;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function removeSticky(id: string) {
    remember();
    setStickies((current) => current.filter((sticky) => sticky.id !== id));
  }

  function startStickyDrag(event: ReactPointerEvent<HTMLButtonElement>, sticky: HandwritingSticky) {
    if (event.button !== 0) return;
    if (tool === "select") {
      setSelectedIds([sticky.id]);
      setSelectionBox(stickyBounds(sticky));
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    stickyDragRef.current = { id: sticky.id, x: event.clientX, y: event.clientY };
    remember();
  }

  function startStickyResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    sticky: HandwritingSticky,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    stickyResizeRef.current = {
      id: sticky.id,
      x: event.clientX,
      y: event.clientY,
      width: stickyWidth(sticky),
      height: stickyHeight(sticky),
    };
    remember();
  }

  function resizeSticky(event: ReactPointerEvent<HTMLButtonElement>, sticky: HandwritingSticky) {
    const resize = stickyResizeRef.current;
    const canvas = canvasRef.current;
    if (!resize || resize.id !== sticky.id || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const scale = PAGE_WIDTH / bounds.width;
    const width = Math.max(
      STICKY_MIN_WIDTH,
      Math.min(STICKY_MAX_WIDTH, resize.width + (event.clientX - resize.x) * scale),
    );
    const height = Math.max(
      STICKY_MIN_HEIGHT,
      Math.min(STICKY_MAX_HEIGHT, resize.height + (event.clientY - resize.y) * scale),
    );
    const nextWidth = Math.min(width, PAGE_WIDTH - sticky.x);
    const nextHeight = Math.min(height, PAGE_HEIGHT - sticky.y);
    updateSticky(sticky.id, { width: nextWidth, height: nextHeight });
    if (selectedIds.includes(sticky.id))
      setSelectionBox({ x: sticky.x, y: sticky.y, width: nextWidth, height: nextHeight });
  }

  function moveSticky(event: ReactPointerEvent<HTMLButtonElement>, sticky: HandwritingSticky) {
    const drag = stickyDragRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.id !== sticky.id || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) * PAGE_WIDTH) / bounds.width;
    const dy = ((event.clientY - drag.y) * PAGE_HEIGHT) / bounds.height;
    const nextX = Math.round(
      Math.max(0, Math.min(PAGE_WIDTH - stickyWidth(sticky), sticky.x + dx)),
    );
    const nextY = Math.round(
      Math.max(0, Math.min(PAGE_HEIGHT - stickyHeight(sticky), sticky.y + dy)),
    );
    updateSticky(sticky.id, { x: nextX, y: nextY });
    if (tool === "select") setSelectionBox({ x: nextX, y: nextY, width: 260, height: 220 });
    drag.x = event.clientX;
    drag.y = event.clientY;
  }

  function writingPoint(
    event: Pick<PointerEvent, "clientX" | "clientY" | "pressure">,
  ): HandwritingPoint {
    const canvas = writingCanvasRef.current;
    if (!canvas) return { x: writingWindowX, y: writingWindowY, pressure: 0.5 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x:
        writingWindowX +
        Math.max(
          0,
          Math.min(
            WRITING_WINDOW_WIDTH,
            ((event.clientX - bounds.left) / bounds.width) * WRITING_WINDOW_WIDTH,
          ),
        ),
      y:
        writingWindowY +
        Math.max(
          0,
          Math.min(
            WRITING_WINDOW_HEIGHT,
            ((event.clientY - bounds.top) / bounds.height) * WRITING_WINDOW_HEIGHT,
          ),
        ),
      pressure: event.pressure > 0 ? event.pressure : 0.5,
    };
  }

  function startWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || writingPointerRef.current !== null) return;
    writingPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    remember();
    const nextStroke: Stroke = {
      id: strokeId(),
      tool: "pen",
      brush,
      color,
      width,
      points: [writingPoint(event.nativeEvent)],
    };
    liveStrokeRef.current = nextStroke;
    setStrokes((current) => [...current, nextStroke]);
  }

  function moveWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    const liveStroke = liveStrokeRef.current;
    if (!liveStroke) return;
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = (coalesced.length > 0 ? coalesced : [event.nativeEvent]).map(writingPoint);
    const previous = liveStroke.points.at(-1);
    const added = points.reduce<HandwritingPoint[]>((accepted, point) => {
      const lastPoint = accepted.at(-1) ?? previous;
      if (!lastPoint || pointDistance(lastPoint, point) >= 1.4) accepted.push(point);
      return accepted;
    }, []);
    if (added.length === 0) return;
    liveStroke.points.push(...added);
    const canvas = writingCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !previous) return;
    context.save();
    context.scale(canvas.width / WRITING_WINDOW_WIDTH, canvas.height / WRITING_WINDOW_HEIGHT);
    context.translate(-writingWindowX, -writingWindowY);
    drawStroke(context, { ...liveStroke, points: [previous, ...added] });
    context.restore();
  }

  function finishWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    writingPointerRef.current = null;
    const liveStroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (liveStroke) {
      const points = stabilization ? stabilizeHandwriting(liveStroke.points) : liveStroke.points;
      setStrokes((current) =>
        current.map((stroke) => (stroke.id === liveStroke.id ? { ...liveStroke, points } : stroke)),
      );
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    if (writingWindowAutoFollow && (relativeX > 0.82 || relativeY > 0.84)) advanceWritingWindow();
  }

  function advanceWritingWindow() {
    if (writingWindowX + WRITING_WINDOW_WIDTH + 300 < PAGE_WIDTH) {
      setWritingWindowX((current) => {
        const next = current + 300;
        setWritingWindowStatus(
          `Coluna ${Math.floor((next - 100) / 300) + 1}, linha ${Math.floor((writingWindowY - 110) / 48) + 1}`,
        );
        return next;
      });
    } else {
      setWritingWindowX(100);
      setWritingWindowY((current) => {
        const next = Math.min(PAGE_HEIGHT - WRITING_WINDOW_HEIGHT, current + 48);
        setWritingWindowStatus(`Coluna 1, linha ${Math.floor((next - 110) / 48) + 1}`);
        return next;
      });
    }
  }

  function buildDocument(): HandwritingDocument {
    const document: HandwritingDocument = {
      version: 1,
      pageText,
      pageTextSize,
      coordinateSystems,
      images: importedImages,
      layers: { visibility: layerVisibility, order: layerOrder },
      background,
      backgroundFrame,
      paper,
      paperColor,
      strokes: strokes.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) => ({
          x: Math.round(point.x * 100) / 100,
          y: Math.round(point.y * 100) / 100,
          pressure: Math.round(point.pressure * 1000) / 1000,
        })),
      })),
      stickies,
    };
    if (!isHandwritingDocument(document)) {
      throw new Error("A folha ficou grande demais. Divida suas anotações em outra folha.");
    }
    return document;
  }

  function pageImage(): string {
    if (background && !backgroundImage) throw new Error("Aguarde a página importada carregar.");
    if (!importedImagesReady) throw new Error("Aguarde as imagens importadas carregarem.");
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Não foi possível preparar a folha.");
    renderPage(
      canvas,
      strokes,
      paper,
      paperColor,
      stickies,
      false,
      pageText,
      pageTextSize,
      coordinateSystems,
      backgroundImage,
      backgroundFrame,
      layerVisibility,
      layerOrder,
      renderableImportedImages,
    );
    return exportPage(canvas);
  }

  function exportPng() {
    try {
      if (background && !backgroundImage) throw new Error("Aguarde a página importada carregar.");
      if (!importedImagesReady) throw new Error("Aguarde as imagens importadas carregarem.");
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Não foi possível preparar a folha.");
      renderPage(
        canvas,
        strokes,
        paper,
        paperColor,
        stickies,
        false,
        pageText,
        pageTextSize,
        coordinateSystems,
        backgroundImage,
        backgroundFrame,
        layerVisibility,
        layerOrder,
        renderableImportedImages,
      );
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "folha-do-caderno.png";
      link.click();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível exportar a folha.");
    }
  }

  function printPage() {
    try {
      const imageUrl = pageImage();
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Permita a janela de impressão para salvar em PDF.");
      const image = printWindow.document.createElement("img");
      image.alt = "Folha do caderno";
      image.style.cssText = "display:block;width:100%;height:auto;max-width:210mm;margin:auto";
      image.onload = () => printWindow.print();
      printWindow.document.body.style.margin = "0";
      printWindow.document.body.append(image);
      image.src = imageUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a impressão.");
    }
  }

  function exportPdf() {
    try {
      if (background && !backgroundImage) throw new Error("Aguarde a página importada carregar.");
      if (!importedImagesReady) throw new Error("Aguarde as imagens importadas carregarem.");
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Não foi possível preparar a folha.");
      renderPage(
        canvas,
        strokes,
        paper,
        paperColor,
        stickies,
        false,
        pageText,
        pageTextSize,
        coordinateSystems,
        backgroundImage,
        backgroundFrame,
        layerVisibility,
        layerOrder,
        renderableImportedImages,
      );
      downloadCanvasAsPdf(canvas, "folha-do-caderno.pdf");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível exportar o PDF.");
    }
  }

  function resetView() {
    setZoom(1);
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  useEffect(() => {
    shortcutStateRef.current = {
      tool,
      fileAction,
      writingWindowOpen,
      undo,
      redo,
      zoomAt,
      resetView,
      setTool,
    };
  });

  function handleCanvasKeyDown(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    if (
      (tool === "zoom-in" || tool === "zoom-out") &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      zoomAt(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
        tool === "zoom-in" ? 1 : -1,
      );
    }
    if (
      tool === "hand" &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      viewport.scrollBy({
        left: event.key === "ArrowLeft" ? -80 : event.key === "ArrowRight" ? 80 : 0,
        top: event.key === "ArrowUp" ? -80 : event.key === "ArrowDown" ? 80 : 0,
      });
    }
  }

  function save() {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      (strokes.length === 0 &&
        stickies.length === 0 &&
        coordinateSystems.length === 0 &&
        !pageText.trim() &&
        !background)
    ) {
      setError("Escreva ou adicione um post-it antes de salvar.");
      return;
    }
    try {
      const document = buildDocument();
      onSave(pageImage(), document);
      localStorage.removeItem(`helenastudy.handwriting.draft.${draftKey}`);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a folha.");
    }
  }

  const displayWidth = Math.max(260, Math.round(fitWidth * zoom));
  const selectedCoordinateSystem = coordinateSystems.find((system) =>
    selectedIds.includes(system.id),
  );
  const selectedStrokeCount = strokes.filter((stroke) => selectedIds.includes(stroke.id)).length;
  const inspectedCoordinateSystem =
    selectedCoordinateSystem ?? (tool === "coordinates" ? coordinateSystems.at(-1) : undefined);
  const liveCoordinateStats = coordinateMeasure
    ? coordinateStats({
        origin: coordinateMeasure.start,
        end: coordinateMeasure.end,
        step: coordinateStep,
      })
    : null;
  const inspectedCoordinateStats =
    liveCoordinateStats ??
    (inspectedCoordinateSystem ? coordinateStats(inspectedCoordinateSystem) : null);

  return (
    <div className="handwriting-studio">
      {collaborationActivity && (
        <div className="handwriting-collaboration-toast" role="status">
          <span aria-hidden="true">•</span> {collaborationActivity}
        </div>
      )}
      <div
        className="handwriting-commandbar"
        aria-label="Ferramentas de escrita"
        inert={fileAction === "import"}
      >
        <div className="handwriting-tool-group" aria-label="Instrumentos">
          <button
            type="button"
            className={!textMode && tool === "ruler" ? "is-active" : ""}
            aria-label="Régua"
            title="Régua: arraste para traçar uma linha reta"
            aria-pressed={!textMode && tool === "ruler"}
            onClick={() => setTool("ruler")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#B88C13" d="m2 15 14-13 7 7-14 14Z" />
              <path fill="#FACC15" d="m2 13 14-12 6 6L8 20Z" />
              <path fill="#FFE88D" d="m2 13 14-12 2 2L4 15Z" />
              <path stroke="#51465D" strokeWidth="1.5" d="m6 10 2 2m1-5 3 3m0-6 2 2m1-5 3 3" />
            </svg>
            <span>Régua</span>
          </button>
          <button
            type="button"
            className={!textMode && tool === "coordinates" ? "is-active" : ""}
            aria-label="Sistema de coordenadas"
            title="Sistema de coordenadas: arraste da origem até o fim dos eixos"
            aria-pressed={!textMode && tool === "coordinates"}
            onClick={() => setTool("coordinates")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 3v17h17M4 8h3M9 17v3M4 4l-2 3m2-3 3 2m13 14-3-2m3 2-2 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Coordenadas</span>
          </button>
          <button
            type="button"
            className={!textMode && tool === "pen" ? "is-active" : ""}
            aria-label="Caneta"
            aria-pressed={!textMode && tool === "pen"}
            onClick={() => setTool("pen")}
          >
            <PaperEditorIcon name="pen" /> <span>Caneta</span>
          </button>
          <button
            type="button"
            className={!textMode && tool === "highlighter" ? "is-active" : ""}
            aria-label="Marca-texto"
            aria-pressed={!textMode && tool === "highlighter"}
            onClick={() => setTool("highlighter")}
          >
            <PaperEditorIcon name="highlighter" /> <span>Marca-texto</span>
          </button>
          <button
            type="button"
            className={!textMode && tool === "eraser" ? "is-active" : ""}
            aria-label="Borracha"
            aria-pressed={!textMode && tool === "eraser"}
            onClick={() => setTool("eraser")}
          >
            <PaperEditorIcon name="eraser" /> <span>Borracha</span>
          </button>
          <button
            type="button"
            className={!textMode && tool === "hand" ? "is-active" : ""}
            aria-label="Mover folha"
            aria-pressed={!textMode && tool === "hand"}
            onClick={() => setTool("hand")}
          >
            <PaperEditorIcon name="hand" /> <span>Mover</span>
          </button>
          <button
            type="button"
            className={!textMode && tool === "select" ? "is-active" : ""}
            aria-label="Selecionar traços"
            aria-pressed={!textMode && tool === "select"}
            onClick={() => setTool("select")}
          >
            <PaperEditorIcon name="select" /> <span>Selecionar</span>
          </button>
          <button
            type="button"
            className={!textMode && tool === "coordinates" ? "is-active" : ""}
            aria-label="Sistema de coordenadas"
            title="Sistema de coordenadas: arraste da origem até o fim dos eixos"
            aria-pressed={!textMode && tool === "coordinates"}
            onClick={() => setTool("coordinates")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 3v17h17M4 8h3M9 17v3M4 4l-2 3m2-3 3 2m13 14-3-2m3 2-2 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Coordenadas</span>
          </button>
          <button
            type="button"
            className={layersOpen ? "is-active" : ""}
            aria-label="Camadas da folha"
            aria-pressed={layersOpen}
            onClick={() => setLayersOpen((open) => !open)}
          >
            <PaperEditorIcon name="layers" /> <span>Camadas</span>
          </button>
          <button
            type="button"
            aria-label="Texto na página inteira"
            aria-pressed={textMode}
            onClick={() => setTextMode((active) => !active)}
          >
            <PaperEditorIcon name="text" /> <span>Texto</span>
          </button>
          <button type="button" aria-label="Adicionar post-it" onClick={() => addSticky()}>
            <PaperEditorIcon name="sticky" /> <span>Post-it</span>
          </button>
          <button
            type="button"
            className={writingWindowOpen ? "is-active" : ""}
            aria-label="Janela de escrita ampliada"
            aria-pressed={writingWindowOpen}
            onClick={() => setWritingWindowOpen((open) => !open)}
          >
            <PaperEditorIcon name="zoomIn" /> <span>Janela de escrita</span>
          </button>
        </div>

        {(selectedIds.length > 0 || tool === "select") && (
          <div className="handwriting-selection-actions" aria-label="Itens selecionados">
            {tool === "select" && (
              <>
                <span>Modo</span>
                <button
                  type="button"
                  aria-pressed={selectionMode === "rectangle"}
                  onClick={() => setSelectionMode("rectangle")}
                >
                  Retângulo
                </button>
                <button
                  type="button"
                  aria-pressed={selectionMode === "lasso"}
                  onClick={() => setSelectionMode("lasso")}
                >
                  Laço livre
                </button>
              </>
            )}
            {selectedIds.length > 0 && (
              <>
                <span>
                  {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"} selecionado
                  {selectedIds.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  disabled={!strokes.some((stroke) => selectedIds.includes(stroke.id))}
                  onClick={alignSelection}
                >
                  Alinhar
                </button>
                <button type="button" onClick={() => scaleSelection(1.12)}>
                  Aumentar
                </button>
                <button type="button" onClick={() => scaleSelection(0.88)}>
                  Diminuir
                </button>
                <button type="button" onClick={deleteSelection}>
                  Apagar seleção
                </button>
              </>
            )}
            {selectedCoordinateIds.length > 0 && (
              <>
                <span>
                  {selectedCoordinateIds.length} sistema
                  {selectedCoordinateIds.length === 1 ? "" : "s"} de coordenadas selecionado
                  {selectedCoordinateIds.length === 1 ? "" : "s"}
                </span>
                <button type="button" onClick={deleteSelection}>
                  Apagar coordenadas
                </button>
              </>
            )}
            {tool === "select" && background && (
              <>
                <span>Imagem importada selecionada</span>
                <button type="button" onClick={removeBackground}>
                  Remover imagem
                </button>
              </>
            )}
            {tool === "select" &&
              importedImages.some((image) => selectedIds.includes(image.id)) && (
                <>
                  <span>Imagem(ns) importada(s) selecionada(s)</span>
                  <button type="button" onClick={removeSelectedImages}>
                    Remover imagem(ns)
                  </button>
                  <button type="button" onClick={() => rotateSelectedImages(-1)}>
                    Girar −15°
                  </button>
                  <button type="button" onClick={() => rotateSelectedImages(1)}>
                    Girar +15°
                  </button>
                </>
              )}
            {tool === "select" && pageText && (
              <>
                <span>Texto: {pageTextSize}px</span>
                <button
                  type="button"
                  disabled={pageTextSize <= 16}
                  onClick={() => {
                    remember();
                    setPageTextSize((size) => Math.max(16, size - 2));
                  }}
                >
                  Diminuir texto
                </button>
                <button
                  type="button"
                  disabled={pageTextSize >= 72}
                  onClick={() => {
                    remember();
                    setPageTextSize((size) => Math.min(72, size + 2));
                  }}
                >
                  Aumentar texto
                </button>
              </>
            )}
            {tool === "select" && (selectedCoordinateSystem || selectedStrokeCount > 0) && (
              <div className="handwriting-formula-assist">
                <span>Assistente local</span>
                <input
                  aria-label="Fórmula matemática"
                  value={formulaDraft}
                  maxLength={240}
                  onChange={(event) => setFormulaDraft(event.target.value)}
                  placeholder="Ex.: y = 2x + 1"
                />
                {selectedCoordinateSystem && (
                  <button type="button" onClick={useCoordinateFormula}>
                    Usar leitura
                  </button>
                )}
                {selectedStrokeCount > 0 && (
                  <button
                    type="button"
                    disabled={ocrBusy}
                    onClick={() => void recognizeSelectedFormula()}
                  >
                    {ocrBusy ? `OCR ${ocrProgress}%` : "Reconhecer OCR local"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!formulaDraft.trim()}
                  onClick={insertFormulaAnnotation}
                >
                  Inserir fórmula
                </button>
              </div>
            )}
          </div>
        )}

        <div className="handwriting-ink-options">
          <fieldset className="ink-palette" disabled={tool === "eraser"}>
            <legend>Cor da tinta</legend>
            {[
              ["#17151c", "Grafite"],
              ["#7c3aed", "Roxo"],
              ["#ef476f", "Rosa"],
              ["#2d8a67", "Verde"],
              ["#facc15", "Amarelo"],
              ["#fff9ef", "Creme"],
            ].map(([ink, label]) => (
              <button
                key={ink}
                type="button"
                className="ink-swatch"
                aria-label={`Tinta ${label}`}
                aria-pressed={color.toLowerCase() === ink}
                style={{ backgroundColor: ink }}
                onClick={() => ink && setColor(ink)}
              >
                <span aria-hidden="true">{color.toLowerCase() === ink ? "✓" : ""}</span>
              </button>
            ))}
            <label className="ink-custom" title="Escolher outra cor">
              <span>Outra</span>
              <input
                type="color"
                aria-label="Cor da tinta"
                value={color}
                disabled={tool === "eraser"}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
          </fieldset>
          <fieldset className="stroke-palette" disabled={tool === "eraser"}>
            <legend>Espessura do traço</legend>
            {(
              [
                [3, "Fino"],
                [5, "Regular"],
                [8, "Forte"],
              ] as const
            ).map(([size, label]) => (
              <button
                type="button"
                key={size}
                aria-label={`Traço ${label}`}
                aria-pressed={width === size}
                onClick={() => setWidth(size)}
              >
                <svg viewBox="0 0 64 24" aria-hidden="true">
                  <path
                    d="M5 17C16 2 19 23 31 10S43 23 59 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={size}
                    strokeLinecap="round"
                  />
                </svg>
                <span>{label}</span>
              </button>
            ))}
          </fieldset>
          <label className="handwriting-assist">
            <input
              type="checkbox"
              checked={stabilization}
              onChange={(event) => setStabilization(event.target.checked)}
            />
            <span>
              <strong>Ajuste inteligente</strong>
              <small>Suaviza e endireita traços leves</small>
            </span>
          </label>
          <label className="handwriting-pen-only">
            <input
              type="checkbox"
              checked={penOnly}
              onChange={(event) => setPenOnly(event.target.checked)}
            />
            <span>Só caneta, dedo move</span>
          </label>
        </div>

        <div className="handwriting-history" aria-label="Histórico e zoom">
          {textMode && (
            <button
              type="button"
              title="Ajusta acentos comuns e início de frases. Use Desfazer para reverter."
              onClick={() => {
                remember();
                setPageText(reviewPortugueseText(pageText));
                setRedoStack([]);
              }}
            >
              <PaperEditorIcon name="review" /> <span>Revisar texto</span>
            </button>
          )}
          {textMode && (
            <button
              type="button"
              className={textAutoCorrect ? "is-active" : ""}
              aria-label="Correção automática de texto"
              aria-pressed={textAutoCorrect}
              title="Corrige acentos comuns e início de frases ao sair da área de texto"
              onClick={() => setTextAutoCorrect((enabled) => !enabled)}
            >
              <PaperEditorIcon name="review" /> <span>Correção automática</span>
            </button>
          )}
          <button
            type="button"
            className={!textMode && tool === "zoom-out" ? "is-active" : ""}
            aria-label="Lupa para reduzir"
            aria-pressed={!textMode && tool === "zoom-out"}
            onClick={() => setTool("zoom-out")}
          >
            <PaperEditorIcon name="zoomOut" />
            <span className="editor-action-label">Reduzir</span>
          </button>
          <button className="handwriting-zoom-value" type="button" onClick={resetView}>
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className={!textMode && tool === "zoom-in" ? "is-active" : ""}
            aria-label="Lupa para ampliar"
            aria-pressed={!textMode && tool === "zoom-in"}
            onClick={() => setTool("zoom-in")}
          >
            <PaperEditorIcon name="zoomIn" />
            <span className="editor-action-label">Ampliar</span>
          </button>
          <button type="button" aria-label="Redefinir visualização" onClick={resetView}>
            <PaperEditorIcon name="reset" />
            <span className="editor-action-label">Redefinir</span>
          </button>
          <span className="handwriting-commandbar__divider" />
          <button type="button" aria-label="Desfazer" disabled={!undoStack.length} onClick={undo}>
            <PaperEditorIcon name="undo" />
            <span className="editor-action-label">Desfazer</span>
          </button>
          <button type="button" aria-label="Refazer" disabled={!redoStack.length} onClick={redo}>
            <PaperEditorIcon name="redo" />
            <span className="editor-action-label">Refazer</span>
          </button>
          <button
            type="button"
            aria-label="Limpar folha"
            disabled={!strokes.length && !stickies.length && !coordinateSystems.length && !pageText}
            onClick={clearPage}
          >
            <PaperEditorIcon name="trash" />
            <span className="editor-action-label">Limpar</span>
          </button>
        </div>
      </div>

      {writingWindowOpen && (
        <section className="handwriting-writing-window" aria-label="Janela de escrita ampliada">
          <div>
            <strong>Escrita ampliada</strong>
            <span>Escreva aqui. Ao chegar à borda, a janela avança pela folha.</span>
          </div>
          <canvas
            ref={writingCanvasRef}
            width={600}
            height={220}
            aria-label="Área ampliada para escrever com dedo ou caneta"
            onPointerDown={startWritingWindow}
            onPointerMove={moveWritingWindow}
            onPointerUp={finishWritingWindow}
            onPointerCancel={finishWritingWindow}
          />
          <p className="handwriting-writing-window__status" aria-live="polite">
            {writingWindowStatus}
          </p>
          <div className="handwriting-writing-window__actions">
            <label>
              <input
                type="checkbox"
                checked={writingWindowAutoFollow}
                onChange={(event) => setWritingWindowAutoFollow(event.target.checked)}
              />
              Acompanhar escrita
            </label>
            <button
              type="button"
              onClick={() =>
                setWritingWindowX((current) => {
                  const next = Math.max(0, current - 300);
                  setWritingWindowStatus(
                    `Coluna ${Math.floor((next - 100) / 300) + 1}, linha ${Math.floor((writingWindowY - 110) / 48) + 1}`,
                  );
                  return next;
                })
              }
            >
              Voltar
            </button>
            <button type="button" onClick={advanceWritingWindow}>
              Avançar
            </button>
            <button
              type="button"
              onClick={() => {
                setWritingWindowX(100);
                setWritingWindowY((current) =>
                  Math.min(PAGE_HEIGHT - WRITING_WINDOW_HEIGHT, current + 48),
                );
                setWritingWindowStatus(
                  `Coluna 1, linha ${Math.floor((Math.min(PAGE_HEIGHT - WRITING_WINDOW_HEIGHT, writingWindowY + 48) - 110) / 48) + 1}`,
                );
              }}
            >
              Próxima linha
            </button>
          </div>
        </section>
      )}

      <div
        className={`handwriting-workspace${!textMode && (layersOpen || tool === "ruler" || (tool === "pen" && !writingWindowOpen)) ? " handwriting-workspace--brushes" : ""}`}
        inert={fileAction === "import"}
      >
        <aside className="handwriting-paper-picker" aria-label="Tipo e cor do papel">
          <strong>Tipo de papel</strong>
          {(
            [
              ["ruled", "Pautado"],
              ["grid", "Quadriculado"],
              ["dots", "Pontilhado"],
              ["blank", "Em branco"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              className={paper === value ? "is-active" : ""}
              aria-pressed={paper === value}
              onClick={() => setPaper(value)}
              key={value}
            >
              <span className={`paper-preview paper-preview--${value}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
          <strong>Cor da folha</strong>
          {(
            [
              ["light", "Clara"],
              ["aged", "Papel de livro"],
              ["night", "Escura"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              className={paperColor === value ? "is-active" : ""}
              aria-pressed={paperColor === value}
              onClick={() => selectPaperColor(value)}
              key={value}
            >
              <span className={`paper-preview paper-preview--tone-${value}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
          {tool === "coordinates" && !textMode && (
            <div className="handwriting-coordinate-picker" aria-label="Variações das coordenadas">
              <strong>Coordenadas</strong>
              {([1, 2, 5, 10] as const).map((step) => (
                <button
                  type="button"
                  key={step}
                  className={coordinateStep === step ? "is-active" : ""}
                  aria-pressed={coordinateStep === step}
                  onClick={() => setCoordinateStep(step)}
                >
                  <svg viewBox="0 0 64 52" aria-hidden="true">
                    <path
                      d="M10 43V8M10 43H57M10 10l-4 7m4-7 4 7m41 26-7-4m7 4-7 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path d="M26 38v10M42 38v10M5 27h10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Escala {step}</span>
                </button>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={coordinateMeasurements}
                  onChange={(event) => setCoordinateMeasurements(event.target.checked)}
                />
                <span>Medições</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={equalCoordinateAxes}
                  onChange={(event) => setEqualCoordinateAxes(event.target.checked)}
                />
                <span>Eixos iguais</span>
              </label>
            </div>
          )}
        </aside>

        <div className="handwriting-viewport" ref={viewportRef}>
          {(tool === "hand" || tool === "zoom-in" || tool === "zoom-out") && (
            <span className="handwriting-viewport-hint" aria-hidden="true">
              {tool === "hand"
                ? "Arraste para mover"
                : tool === "zoom-in"
                  ? "Toque para ampliar"
                  : "Toque para reduzir"}
            </span>
          )}
          <div
            className="handwriting-page-shell"
            style={{ width: displayWidth, height: (displayWidth / PAGE_WIDTH) * PAGE_HEIGHT }}
          >
            {background &&
              tool === "select" &&
              !textMode &&
              (() => {
                const frame = backgroundFrame ?? {
                  x: 0,
                  y: 0,
                  width: PAGE_WIDTH,
                  height: PAGE_HEIGHT,
                };
                return (
                  <div
                    className="handwriting-import-selection"
                    style={{
                      left: `${frame.x / 12}%`,
                      top: `${frame.y / 16}%`,
                      width: `${frame.width / 12}%`,
                      height: `${frame.height / 16}%`,
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      remember();
                      imageDrag.current = {
                        x: event.clientX,
                        y: event.clientY,
                        frame,
                        resize: (event.target as HTMLElement).closest("[data-resize]") !== null,
                      };
                    }}
                    onPointerMove={(event) => {
                      const drag = imageDrag.current;
                      if (!drag) return;
                      const scale =
                        PAGE_WIDTH /
                        (canvasRef.current?.getBoundingClientRect().width || displayWidth);
                      const dx = (event.clientX - drag.x) * scale;
                      const dy = (event.clientY - drag.y) * scale;
                      if (drag.resize) {
                        const ratio = drag.frame.height / drag.frame.width;
                        const width = Math.max(
                          Math.min(40, drag.frame.width),
                          Math.min(
                            PAGE_WIDTH - drag.frame.x,
                            (PAGE_HEIGHT - drag.frame.y) / ratio,
                            drag.frame.width + dx,
                          ),
                        );
                        setBackgroundFrame({ ...drag.frame, width, height: width * ratio });
                      } else
                        setBackgroundFrame({
                          ...drag.frame,
                          x: Math.max(
                            0,
                            Math.min(PAGE_WIDTH - drag.frame.width, drag.frame.x + dx),
                          ),
                          y: Math.max(
                            0,
                            Math.min(PAGE_HEIGHT - drag.frame.height, drag.frame.y + dy),
                          ),
                        });
                    }}
                    onPointerUp={() => {
                      imageDrag.current = null;
                    }}
                    onPointerCancel={() => {
                      imageDrag.current = null;
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Mover imagem importada"
                      onKeyDown={(event) => {
                        const delta = {
                          ArrowLeft: [-10, 0],
                          ArrowRight: [10, 0],
                          ArrowUp: [0, -10],
                          ArrowDown: [0, 10],
                        }[event.key];
                        if (!delta) return;
                        event.preventDefault();
                        remember();
                        setBackgroundFrame({
                          ...frame,
                          x: Math.max(0, Math.min(PAGE_WIDTH - frame.width, frame.x + delta[0]!)),
                          y: Math.max(0, Math.min(PAGE_HEIGHT - frame.height, frame.y + delta[1]!)),
                        });
                      }}
                    >
                      Arraste para mover
                    </button>
                    <button
                      type="button"
                      data-resize
                      className="handwriting-import-resize"
                      aria-label="Redimensionar imagem importada"
                      onKeyDown={(event) => {
                        if (
                          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
                        )
                          return;
                        event.preventDefault();
                        remember();
                        const ratio = frame.height / frame.width;
                        const width = Math.max(
                          Math.min(40, frame.width),
                          Math.min(
                            PAGE_WIDTH - frame.x,
                            (PAGE_HEIGHT - frame.y) / ratio,
                            frame.width +
                              (["ArrowRight", "ArrowDown"].includes(event.key) ? 10 : -10),
                          ),
                        );
                        setBackgroundFrame({ ...frame, width, height: width * ratio });
                      }}
                    >
                      ↘
                    </button>
                  </div>
                );
              })()}
            {layerVisibility.background &&
              tool === "select" &&
              !textMode &&
              importedImages.map((image) => (
                <div
                  key={image.id}
                  className={`handwriting-import-selection handwriting-import-selection--object${selectedIds.includes(image.id) ? " is-selected" : ""}`}
                  style={{
                    left: `${image.x / 12}%`,
                    top: `${image.y / 16}%`,
                    width: `${image.width / 12}%`,
                    height: `${image.height / 16}%`,
                    transform: `rotate(${image.rotation ?? 0}deg)`,
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedIds([image.id]);
                    event.currentTarget.setPointerCapture(event.pointerId);
                    remember();
                    importedImageDrag.current = {
                      id: image.id,
                      x: event.clientX,
                      y: event.clientY,
                      frame: image,
                      resize: (event.target as HTMLElement).closest("[data-resize]") !== null,
                    };
                  }}
                  onPointerMove={(event) => {
                    const drag = importedImageDrag.current;
                    if (!drag || drag.id !== image.id) return;
                    const scale =
                      PAGE_WIDTH /
                      (canvasRef.current?.getBoundingClientRect().width || displayWidth);
                    const dx = (event.clientX - drag.x) * scale;
                    const dy = (event.clientY - drag.y) * scale;
                    setImportedImages((current) =>
                      current.map((entry) => {
                        if (entry.id !== drag.id) return entry;
                        if (drag.resize) {
                          const ratio = drag.frame.height / drag.frame.width;
                          const width = Math.max(
                            40,
                            Math.min(
                              PAGE_WIDTH - drag.frame.x,
                              (PAGE_HEIGHT - drag.frame.y) / ratio,
                              drag.frame.width + dx,
                            ),
                          );
                          return { ...entry, width, height: width * ratio };
                        }
                        return {
                          ...entry,
                          x: Math.max(
                            0,
                            Math.min(PAGE_WIDTH - drag.frame.width, drag.frame.x + dx),
                          ),
                          y: Math.max(
                            0,
                            Math.min(PAGE_HEIGHT - drag.frame.height, drag.frame.y + dy),
                          ),
                        };
                      }),
                    );
                  }}
                  onPointerUp={() => {
                    importedImageDrag.current = null;
                  }}
                  onPointerCancel={() => {
                    importedImageDrag.current = null;
                  }}
                >
                  <button
                    type="button"
                    aria-label="Mover imagem importada"
                    onKeyDown={(event) => {
                      const delta = {
                        ArrowLeft: [-10, 0],
                        ArrowRight: [10, 0],
                        ArrowUp: [0, -10],
                        ArrowDown: [0, 10],
                      }[event.key];
                      if (!delta) return;
                      event.preventDefault();
                      remember();
                      setImportedImages((current) =>
                        current.map((entry) =>
                          entry.id === image.id
                            ? {
                                ...entry,
                                x: Math.max(
                                  0,
                                  Math.min(PAGE_WIDTH - entry.width, entry.x + delta[0]!),
                                ),
                                y: Math.max(
                                  0,
                                  Math.min(PAGE_HEIGHT - entry.height, entry.y + delta[1]!),
                                ),
                              }
                            : entry,
                        ),
                      );
                    }}
                  >
                    Arraste para mover
                  </button>
                  <button
                    type="button"
                    data-resize
                    className="handwriting-import-resize"
                    aria-label="Redimensionar imagem importada"
                    onKeyDown={(event) => {
                      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
                        return;
                      event.preventDefault();
                      remember();
                      const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
                      setImportedImages((current) =>
                        current.map((entry) => {
                          if (entry.id !== image.id) return entry;
                          const ratio = entry.height / entry.width;
                          const width = Math.max(
                            40,
                            Math.min(PAGE_WIDTH - entry.x, entry.width + direction * 10),
                          );
                          return {
                            ...entry,
                            width,
                            height: Math.min(PAGE_HEIGHT - entry.y, width * ratio),
                          };
                        }),
                      );
                    }}
                  >
                    ↘
                  </button>
                </div>
              ))}
            {rulerMeasure &&
              (() => {
                const { start, end } = rulerMeasure;
                const length = pointDistance(start, end);
                const step =
                  rulerUnit === "px" ? 25 : rulerUnit === "cm" ? 1200 / 210 : (1200 * 2.54) / 168;
                const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
                return (
                  <svg
                    className="handwriting-ruler-overlay"
                    viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
                    aria-label="Medição da régua"
                  >
                    <g transform={`translate(${start.x} ${start.y}) rotate(${angle})`}>
                      <path d={`M0 -8V-38H${length}V-8Z`} fill="#FACC15" fillOpacity="0.88" />
                      <path d={`M0 -38H${length}V-32H0Z`} fill="#FFE88D" />
                      {Array.from({ length: Math.floor(length / step) + 1 }, (_, index) => (
                        <path
                          key={index}
                          d={`M${index * step} -8v${index % 4 === 0 ? -22 : -12}`}
                          stroke="#292432"
                          strokeWidth="2"
                        />
                      ))}
                    </g>
                    <g
                      transform={`translate(${Math.max(66, Math.min(PAGE_WIDTH - 66, (start.x + end.x) / 2))} ${Math.max(28, (start.y + end.y) / 2 - 56)})`}
                    >
                      <rect x="-64" y="-22" width="128" height="40" rx="6" fill="#292432" />
                      <text
                        textAnchor="middle"
                        fill="#FFF9EF"
                        fontSize="24"
                        fontWeight="800"
                        dominantBaseline="middle"
                      >
                        {rulerLength(length, rulerUnit)}
                      </text>
                    </g>
                  </svg>
                );
              })()}
            {coordinateMeasure && (
              <svg
                className="handwriting-ruler-overlay"
                viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
                aria-label="Prévia do sistema de coordenadas"
              >
                <g opacity="0.9">
                  <path
                    d={`M${coordinateMeasure.start.x} ${coordinateMeasure.end.y}V${coordinateMeasure.start.y}H${coordinateMeasure.end.x}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={coordinateMeasure.start.x}
                    cy={coordinateMeasure.start.y}
                    r="8"
                    fill="#7433e0"
                  />
                </g>
              </svg>
            )}
            <canvas
              ref={canvasRef}
              className={`handwriting-canvas handwriting-canvas--${tool}`}
              width={PAGE_WIDTH}
              height={PAGE_HEIGHT}
              role={tool === "hand" || tool === "zoom-in" || tool === "zoom-out" ? "button" : "img"}
              tabIndex={0}
              aria-label={
                tool === "zoom-in"
                  ? "Toque na folha para ampliar"
                  : tool === "zoom-out"
                    ? "Toque na folha para reduzir"
                    : tool === "hand"
                      ? "Arraste a folha para mover"
                      : tool === "select"
                        ? "Arraste para selecionar traços"
                        : "Folha para escrita à mão com dedo ou caneta"
              }
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
              onLostPointerCapture={finish}
              onKeyDown={handleCanvasKeyDown}
            />
            {textMode && (
              <textarea
                className="handwriting-full-page-text"
                aria-label="Texto da página inteira"
                placeholder="Escreva aqui. Esta área ocupa a folha inteira."
                value={pageText}
                spellCheck
                lang="pt-BR"
                autoCorrect="on"
                autoCapitalize="sentences"
                wrap="off"
                style={{
                  left: `${(112 / PAGE_WIDTH) * 100}%`,
                  top: `${(80 / PAGE_HEIGHT) * 100}%`,
                  width: `${(980 / PAGE_WIDTH) * 100}%`,
                  height: `${(1440 / PAGE_HEIGHT) * 100}%`,
                  fontSize: `${(pageTextSize * displayWidth) / PAGE_WIDTH}px`,
                  lineHeight: `${(pageTextSize * (40 / 28) * displayWidth) / PAGE_WIDTH}px`,
                  color: paperColor === "night" ? "#fff9ef" : "#17151c",
                }}
                onFocus={() => remember()}
                onBlur={() => {
                  if (!textAutoCorrect) return;
                  const corrected = reviewPortugueseText(pageText);
                  if (corrected !== pageText) setPageText(corrected);
                }}
                onChange={(event) => {
                  const lines = pageTextLines(
                    event.target.value.replace(/\t/g, "    "),
                    pageTextSize,
                  );
                  if (lines.length > Math.floor(1440 / (pageTextSize * (40 / 28)))) {
                    setError("Esta folha está completa. Crie outra folha para continuar.");
                    return;
                  }
                  setError("");
                  setPageText(lines.join("\n"));
                  setRedoStack([]);
                }}
              />
            )}
            {stickies.map((sticky) => (
              <div
                className={`handwriting-sticky handwriting-sticky--${sticky.kind === "text" ? "text" : sticky.color}${sticky.formula ? " handwriting-sticky--formula" : ""}`}
                style={{
                  pointerEvents: tool === "eraser" && sticky.kind === "text" ? "none" : undefined,
                  left: `${(sticky.x / PAGE_WIDTH) * 100}%`,
                  top: `${(sticky.y / PAGE_HEIGHT) * 100}%`,
                  width: `${(stickyWidth(sticky) / PAGE_WIDTH) * 100}%`,
                  height: `${(stickyHeight(sticky) / PAGE_HEIGHT) * 100}%`,
                  ...(sticky.kind === "text" ? { color: sticky.ink ?? "#17151c" } : {}),
                }}
                key={sticky.id}
              >
                <div className="handwriting-sticky__bar">
                  <button
                    type="button"
                    aria-label={sticky.kind === "text" ? "Mover texto" : "Mover post-it"}
                    onKeyDown={(event) => {
                      const movement: Record<string, [number, number]> = {
                        ArrowLeft: [-10, 0],
                        ArrowRight: [10, 0],
                        ArrowUp: [0, -10],
                        ArrowDown: [0, 10],
                      };
                      const delta = movement[event.key];
                      if (!delta) return;
                      event.preventDefault();
                      remember();
                      updateSticky(sticky.id, {
                        x: Math.max(
                          0,
                          Math.min(PAGE_WIDTH - stickyWidth(sticky), sticky.x + delta[0]),
                        ),
                        y: Math.max(
                          0,
                          Math.min(PAGE_HEIGHT - stickyHeight(sticky), sticky.y + delta[1]),
                        ),
                      });
                    }}
                    onPointerDown={(event) => startStickyDrag(event, sticky)}
                    onPointerMove={(event) => moveSticky(event, sticky)}
                    onPointerUp={() => {
                      stickyDragRef.current = null;
                    }}
                    onPointerCancel={() => {
                      stickyDragRef.current = null;
                    }}
                  >
                    <PaperEditorIcon name="hand" />
                  </button>
                  {sticky.kind !== "text" && (
                    <button
                      type="button"
                      className={sticky.checklist?.length ? "is-active" : undefined}
                      aria-label={
                        sticky.checklist?.length ? "Voltar para nota" : "Transformar em checklist"
                      }
                      aria-pressed={Boolean(sticky.checklist?.length)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => toggleStickyChecklist(sticky)}
                    >
                      <PaperEditorIcon name="review" />
                    </button>
                  )}
                  {sticky.kind !== "text" && (
                    <>
                      <button
                        type="button"
                        aria-label="Trazer post-it para frente"
                        title="Trazer para frente"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => moveStickyLayer(sticky.id, "front")}
                      >
                        <PaperEditorIcon name="bringFront" />
                      </button>
                      <button
                        type="button"
                        aria-label="Enviar post-it para trás"
                        title="Enviar para trás"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => moveStickyLayer(sticky.id, "back")}
                      >
                        <PaperEditorIcon name="sendBack" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label={sticky.kind === "text" ? "Remover texto" : "Remover post-it"}
                    onClick={() => removeSticky(sticky.id)}
                  >
                    <PaperEditorIcon name="close" />
                  </button>
                </div>
                {sticky.checklist?.length ? (
                  <div className="handwriting-sticky__checklist">
                    <input
                      aria-label="Título do checklist"
                      value={sticky.text}
                      maxLength={80}
                      onFocus={() => remember()}
                      onChange={(event) => updateSticky(sticky.id, { text: event.target.value })}
                      placeholder="Título"
                    />
                    {sticky.checklist.map((item) => (
                      <div className="handwriting-sticky__checklist-item" key={item.id}>
                        <button
                          type="button"
                          className={item.done ? "is-done" : undefined}
                          aria-label={item.done ? "Marcar como pendente" : "Marcar como concluído"}
                          aria-pressed={item.done}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => {
                            remember();
                            updateChecklistItem(sticky, item.id, { done: !item.done });
                          }}
                        >
                          {item.done ? "✓" : ""}
                        </button>
                        <input
                          aria-label="Item do checklist"
                          value={item.text}
                          maxLength={120}
                          onChange={(event) =>
                            updateChecklistItem(sticky, item.id, { text: event.target.value })
                          }
                          placeholder="Próximo passo"
                        />
                        <button
                          type="button"
                          aria-label="Remover item"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => removeChecklistItem(sticky, item.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="handwriting-sticky__add-item"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => addChecklistItem(sticky)}
                    >
                      + Item
                    </button>
                  </div>
                ) : (
                  <textarea
                    aria-label={sticky.kind === "text" ? "Texto na folha" : "Texto do post-it"}
                    value={sticky.text}
                    maxLength={240}
                    onFocus={() => remember()}
                    onBlur={() => {
                      if (!textAutoCorrect) return;
                      const corrected = reviewPortugueseText(sticky.text);
                      if (corrected !== sticky.text) updateSticky(sticky.id, { text: corrected });
                    }}
                    onChange={(event) => updateSticky(sticky.id, { text: event.target.value })}
                    placeholder="Sua ideia aqui"
                  />
                )}
                {sticky.kind !== "text" && (
                  <div className="handwriting-sticky__colors" aria-label="Cor do post-it">
                    {(["yellow", "blue", "lilac"] as const).map((color) => (
                      <button
                        type="button"
                        className={sticky.color === color ? "is-active" : ""}
                        aria-label={`Post-it ${color === "yellow" ? "amarelo" : color === "blue" ? "azul" : "lilás"}`}
                        aria-pressed={sticky.color === color}
                        onClick={() => {
                          remember();
                          updateSticky(sticky.id, { color });
                        }}
                        key={color}
                      />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="handwriting-sticky__resize"
                  aria-label="Redimensionar post-it"
                  onPointerDown={(event) => startStickyResize(event, sticky)}
                  onPointerMove={(event) => resizeSticky(event, sticky)}
                  onPointerUp={() => {
                    stickyResizeRef.current = null;
                  }}
                  onPointerCancel={() => {
                    stickyResizeRef.current = null;
                  }}
                >
                  <PaperEditorIcon name="expand" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {tool === "pen" && !textMode && !writingWindowOpen && (
          <aside className="handwriting-brush-panel" aria-label="Pincéis da caneta">
            <header>
              <div>
                <small>SEU ESTOJO</small>
                <h3>Canetas e pincéis</h3>
              </div>
            </header>
            {(
              [
                ["fine", "Fineliner", "Ponta técnica · tinta uniforme", 2],
                ["ink", "Caneta-tinteiro", "Tinta expressiva · responde à pressão", 7],
                ["soft", "Pincel macio", "Cerdas suaves · camadas translúcidas", 14],
              ] as const
            ).map(([value, title, description, size]) => (
              <button
                type="button"
                key={value}
                aria-pressed={brush === value}
                onClick={() => setBrush(value)}
              >
                <span className="brush-card-title">{title}</span>
                <img className="brush-instrument" src={`/brushes/${value}.svg`} alt="" />
                <svg className="brush-sample" viewBox="0 0 180 46" aria-hidden="true">
                  <path
                    d="M10 31C36 32 39 9 66 19S104 39 130 24 158 15 170 19"
                    fill="none"
                    stroke={color}
                    strokeWidth={size}
                    strokeLinecap="round"
                    opacity={value === "soft" ? 0.3 : 1}
                  />
                </svg>
                <small>{description}</small>
              </button>
            ))}
          </aside>
        )}
        {tool === "ruler" && !textMode && (
          <aside className="handwriting-brush-panel" aria-label="Unidades da régua">
            <header>
              <div>
                <small>MEDIR NA FOLHA</small>
                <h3>Réguas</h3>
              </div>
            </header>
            {(
              [
                ["px", "Pixels"],
                ["cm", "Centímetros"],
                ["in", "Polegadas"],
              ] as const
            ).map(([unit, title]) => (
              <button
                type="button"
                key={unit}
                aria-pressed={rulerUnit === unit}
                onClick={() => setRulerUnit(unit)}
              >
                <span className="brush-card-title">{title}</span>
                <svg viewBox="0 0 180 44" aria-hidden="true">
                  <path
                    d="M4 4H176V40H4Z"
                    fill={unit === "px" ? "#FACC15" : unit === "cm" ? "#A779EF" : "#6BBF59"}
                  />
                  {Array.from({ length: 17 }, (_, index) => (
                    <path
                      key={index}
                      d={`M${10 + index * 10} 5v${index % 5 === 0 ? 20 : 10}`}
                      stroke="#292432"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
              </button>
            ))}
            <p>
              A folha digital mede 21 cm de largura. A medida acompanha o documento, não o tamanho
              físico da tela.
            </p>
          </aside>
        )}
        {tool === "coordinates" && !textMode && (
          <aside className="handwriting-brush-panel" aria-label="Opções do sistema de coordenadas">
            <header>
              <div>
                <small>MATEMÁTICA</small>
                <h3>Sistema de coordenadas</h3>
              </div>
            </header>
            <p>
              Arraste a partir da origem para criar os eixos. Cada divisão ocupa um quadrado da
              folha.
            </p>
            {([1, 2, 5, 10] as const).map((step) => (
              <button
                type="button"
                key={step}
                aria-pressed={coordinateStep === step}
                onClick={() => setCoordinateStep(step)}
              >
                <span className="brush-card-title">Cada divisão vale {step}</span>
                <svg viewBox="0 0 180 44" aria-hidden="true">
                  <path
                    d="M18 36V8M18 36H166M18 12l-5 8m5-8 5 8m139 16-8-5m8 5-8 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path d="M66 31v10M114 31v10M13 24h10" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            ))}
            <label className="handwriting-coordinate-toggle">
              <input
                type="checkbox"
                checked={equalCoordinateAxes}
                onChange={(event) => setEqualCoordinateAxes(event.target.checked)}
              />
              <span>Eixos com o mesmo tamanho</span>
            </label>
            {inspectedCoordinateStats && (
              <section className="handwriting-coordinate-inspector" aria-live="polite">
                <small>{liveCoordinateStats ? "PRÉVIA DO GESTO" : "LEITURA DO EIXO"}</small>
                <strong>
                  Δx {formatCoordinateNumber(inspectedCoordinateStats.deltaX)} · Δy{" "}
                  {formatCoordinateNumber(inspectedCoordinateStats.deltaY)}
                </strong>
                <dl>
                  <div>
                    <dt>Distância</dt>
                    <dd>{formatCoordinateNumber(inspectedCoordinateStats.distance)}</dd>
                  </div>
                  <div>
                    <dt>Inclinação</dt>
                    <dd>
                      {inspectedCoordinateStats.slope === null
                        ? "vertical"
                        : formatCoordinateNumber(inspectedCoordinateStats.slope)}
                    </dd>
                  </div>
                  <div>
                    <dt>Ângulo</dt>
                    <dd>{formatCoordinateNumber(inspectedCoordinateStats.angle)}°</dd>
                  </div>
                </dl>
                {liveCoordinateStats ? (
                  <p>Solte para salvar este sistema. A prévia acompanha o arraste.</p>
                ) : (
                  <p>Use Selecionar para inspecionar outro sistema desenhado.</p>
                )}
              </section>
            )}
          </aside>
        )}
        {layersOpen && !textMode && (
          <aside
            className="handwriting-brush-panel handwriting-layer-panel"
            aria-label="Camadas da folha"
          >
            <header>
              <div>
                <small>ORGANIZAR FOLHA</small>
                <h3>Camadas</h3>
              </div>
            </header>
            <p>
              Oculte partes da página sem apagar conteúdo. A configuração fica salva no caderno.
            </p>
            {(
              [
                ["background", "Documento importado", "Imagem ou PDF de fundo"],
                ["coordinates", "Coordenadas", "Eixos e marcações matemáticas"],
                ["strokes", "Escrita e marca-texto", "Traços feitos com caneta"],
                ["text", "Texto da página", "Texto digitado em tela cheia"],
                ["stickies", "Post-its", "Anotações móveis e lembretes"],
              ] as const
            ).map(([key, title, description]) => {
              const reorderable = key !== "background";
              const layerIndex = reorderable ? layerOrder.indexOf(key as HandwritingLayerKey) : -1;
              return (
                <label className="handwriting-layer-row" key={key}>
                  <input
                    type="checkbox"
                    checked={layerVisibility[key]}
                    onChange={(event) => {
                      remember();
                      setLayerVisibility((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }));
                    }}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                    <span className="handwriting-layer-reorder">
                      <button
                        type="button"
                        aria-label={`Subir camada ${title}`}
                        disabled={layerIndex <= 0}
                        onClick={(event) => {
                          event.preventDefault();
                          if (reorderable) moveLayer(key as HandwritingLayerKey, -1);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Descer camada ${title}`}
                        disabled={!reorderable || layerIndex >= layerOrder.length - 1}
                        onClick={(event) => {
                          event.preventDefault();
                          if (reorderable) moveLayer(key as HandwritingLayerKey, 1);
                        }}
                      >
                        ↓
                      </button>
                    </span>
                  </span>
                </label>
              );
            })}
            <button
              type="button"
              className="handwriting-layer-reset"
              onClick={() => {
                remember();
                setLayerVisibility({ ...DEFAULT_HANDWRITING_LAYER_VISIBILITY });
                setLayerOrder([...DEFAULT_HANDWRITING_LAYER_ORDER]);
              }}
            >
              Mostrar todas
            </button>
          </aside>
        )}
      </div>

      {error && <p className="capture-error">{error}</p>}
      <footer className="handwriting-footer" inert={fileAction === "import"}>
        <p>
          <strong>{draftStatus || "Escrita local e privada."}</strong>
          <span>Compatível com toque, mouse e pressão de canetas suportadas pelo navegador.</span>
        </p>
        <div className="handwriting-export-actions">
          <button
            type="button"
            aria-expanded={fileAction === "import"}
            ref={importButtonRef}
            onClick={() => setFileAction(fileAction === "import" ? null : "import")}
          >
            <PaperEditorIcon name="import" /> <span>Importar</span>
          </button>
          <div className="editor-export-menu">
            <button
              type="button"
              aria-expanded={fileAction === "export"}
              onClick={() => setFileAction(fileAction === "export" ? null : "export")}
            >
              <PaperEditorIcon name="download" /> <span>Exportar</span>
            </button>
            {fileAction === "export" && (
              <div
                className="editor-export-options"
                aria-label="Formatos de exportação"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setFileAction(null);
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportPng();
                    setFileAction(null);
                  }}
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportPdf();
                    setFileAction(null);
                  }}
                >
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printPage();
                    setFileAction(null);
                  }}
                >
                  Imprimir
                </button>
              </div>
            )}
          </div>
        </div>
        <button className="primary-button handwriting-save" type="button" onClick={save}>
          <PaperEditorIcon name="save" />
          Salvar folha no caderno
        </button>
      </footer>
      {fileAction === "import" && (
        <Suspense fallback={<HelenaLoading label="Abrindo importação" compact />}>
          <PageImport
            onClose={closeImport}
            onImportMany={(pages) => {
              onImportPages?.(pages);
              closeImport();
            }}
            onImport={(image, frame) => {
              if (!frame) return;
              if (importedImages.length >= 20) {
                setError("Esta folha chegou ao limite de 20 imagens importadas.");
                closeImport();
                return;
              }
              remember();
              setImportedImages((current) => [
                ...current,
                { id: strokeId(), dataUrl: image, ...frame },
              ]);
              setTool("select");
              closeImport();
              setError("");
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
