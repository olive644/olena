import {
  DEFAULT_HANDWRITING_LAYER_ORDER,
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  pageTextLines,
} from "../domain/handwriting";
import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingPaperColor,
  HandwritingPoint,
  HandwritingSticky,
} from "../domain/handwriting";
import { stickyColor, stickyHeight, stickyWidth } from "./handwriting-geometry";
import { PAGE_HEIGHT, PAGE_WIDTH, type PaperStyle, type Stroke } from "./handwriting-types";
import { stickyTextLayout } from "./sticky-text-layout";

export function canvasPoint(
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

export function tiltShading(point: HandwritingPoint): number {
  // Inclinacao da caneta (graus, -90 a 90) simula uma ponta caligrafica: mais
  // deitada = traco mais largo, em pe = mais fino. Mouse/toque nao reportam
  // tilt, entao o efeito fica neutro (1) para esses dispositivos.
  const tiltX = point.tiltX ?? 0;
  const tiltY = point.tiltY ?? 0;
  const magnitude = Math.min(1, Math.hypot(tiltX, tiltY) / 90);
  return 1 + magnitude * 0.6;
}

export function drawPaper(
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

export function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
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

export function renderPage(
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

export function drawCoordinateSystem(
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
  if (system.measurements === false) {
    context.restore();
    return;
  }
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
