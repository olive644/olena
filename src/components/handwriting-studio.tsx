import {
  Eraser,
  Highlighter,
  Minus,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MAX_NOTE_ASSET_DATA_URL_LENGTH } from "../data/local-workspace";
import { stabilizeHandwriting, type HandwritingPoint } from "./handwriting-stabilization";

const PAGE_WIDTH = 1200;
const PAGE_HEIGHT = 1600;
const BASE_DISPLAY_WIDTH = 760;

type HandwritingTool = "pen" | "highlighter" | "eraser";
type PaperStyle = "ruled" | "grid" | "dots" | "blank";
type Stroke = {
  id: string;
  tool: Exclude<HandwritingTool, "eraser">;
  color: string;
  width: number;
  points: HandwritingPoint[];
};

type HandwritingStudioProps = {
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

function pointDistance(first: HandwritingPoint, second: HandwritingPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  event: ReactPointerEvent<HTMLCanvasElement>,
): HandwritingPoint {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    pressure: event.pressure > 0 ? event.pressure : 0.5,
  };
}

function drawPaper(context: CanvasRenderingContext2D, paper: PaperStyle) {
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.save();
  context.strokeStyle = "#dcd8ee";
  context.fillStyle = "#d5d0e8";
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
  if (paper !== "blank") {
    context.strokeStyle = "#e9b9b1";
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
  context.globalAlpha = stroke.tool === "highlighter" ? 0.3 : 1;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }
  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    if (!previous || !current) continue;
    const pressure = stroke.tool === "pen" ? (previous.pressure + current.pressure) / 2 : 0.7;
    context.lineWidth = stroke.width * (0.72 + pressure * 0.55);
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
  }
  context.restore();
}

function renderPage(canvas: HTMLCanvasElement, strokes: readonly Stroke[], paper: PaperStyle) {
  const context = canvas.getContext("2d");
  if (!context) return;
  drawPaper(context, paper);
  for (const stroke of strokes) drawStroke(context, stroke);
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

function strokeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function HandwritingStudio({ onClose, onSave }: HandwritingStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const eraserChangedRef = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<HandwritingTool>("pen");
  const [paper, setPaper] = useState<PaperStyle>("ruled");
  const [color, setColor] = useState("#17151c");
  const [width, setWidth] = useState(5);
  const [stabilization, setStabilization] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(BASE_DISPLAY_WIDTH);
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) renderPage(canvas, strokes, paper);
  }, [paper, strokes]);

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

  function remember(current: Stroke[]) {
    setUndoStack((history) => [...history.slice(-39), current]);
    setRedoStack([]);
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    setError("");
    const point = canvasPoint(canvas, event);
    remember(strokes);
    if (tool === "eraser") {
      eraserChangedRef.current = false;
      setStrokes((current) => {
        const next = current.filter((stroke) => !strokeTouches(stroke, point, 30));
        eraserChangedRef.current = next.length !== current.length;
        return next;
      });
      return;
    }
    const activeWidth = tool === "highlighter" ? Math.max(22, width * 4) : width;
    setStrokes((current) => [
      ...current,
      { id: strokeId(), tool, color, width: activeWidth, points: [point] },
    ]);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPoint(canvas, event);
    if (tool === "eraser") {
      setStrokes((current) => {
        const next = current.filter((stroke) => !strokeTouches(stroke, point, 30));
        if (next.length !== current.length) eraserChangedRef.current = true;
        return next;
      });
      return;
    }
    setStrokes((current) => {
      const last = current.at(-1);
      if (!last) return current;
      const previous = last.points.at(-1);
      if (previous && pointDistance(previous, point) < 1.4) return current;
      return [...current.slice(0, -1), { ...last, points: [...last.points, point] }];
    });
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (tool === "eraser") {
      if (!eraserChangedRef.current) setUndoStack((history) => history.slice(0, -1));
      return;
    }
    if (!stabilization) return;
    setStrokes((current) => {
      const last = current.at(-1);
      if (!last) return current;
      return [...current.slice(0, -1), { ...last, points: stabilizeHandwriting(last.points) }];
    });
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((history) => [...history, strokes]);
    setStrokes(previous);
    setUndoStack((history) => history.slice(0, -1));
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((history) => [...history, strokes]);
    setStrokes(next);
    setRedoStack((history) => history.slice(0, -1));
  }

  function clearPage() {
    if (strokes.length === 0) return;
    remember(strokes);
    setStrokes([]);
  }

  function resetView() {
    setZoom(1);
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      setError("Escreva algo na folha antes de salvar.");
      return;
    }
    try {
      renderPage(canvas, strokes, paper);
      onSave(exportPage(canvas));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a folha.");
    }
  }

  const displayWidth = Math.max(260, Math.round(fitWidth * zoom));

  return (
    <div className="handwriting-studio">
      <div className="handwriting-commandbar" aria-label="Ferramentas de escrita">
        <div className="handwriting-tool-group" aria-label="Instrumentos">
          <button
            type="button"
            className={tool === "pen" ? "is-active" : ""}
            aria-label="Caneta"
            aria-pressed={tool === "pen"}
            onClick={() => setTool("pen")}
          >
            <PenLine size={18} /> <span>Caneta</span>
          </button>
          <button
            type="button"
            className={tool === "highlighter" ? "is-active" : ""}
            aria-label="Marca-texto"
            aria-pressed={tool === "highlighter"}
            onClick={() => setTool("highlighter")}
          >
            <Highlighter size={18} /> <span>Marca-texto</span>
          </button>
          <button
            type="button"
            className={tool === "eraser" ? "is-active" : ""}
            aria-label="Borracha"
            aria-pressed={tool === "eraser"}
            onClick={() => setTool("eraser")}
          >
            <Eraser size={18} /> <span>Borracha</span>
          </button>
        </div>

        <div className="handwriting-ink-options">
          <label>
            <span>Cor da tinta</span>
            <input
              type="color"
              aria-label="Cor da tinta"
              value={color}
              disabled={tool === "eraser"}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label>
            <span>Traço</span>
            <select
              aria-label="Espessura do traço"
              value={width}
              disabled={tool === "eraser"}
              onChange={(event) => setWidth(Number(event.target.value))}
            >
              <option value="3">Fino</option>
              <option value="5">Regular</option>
              <option value="8">Forte</option>
            </select>
          </label>
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
        </div>

        <div className="handwriting-history" aria-label="Histórico e zoom">
          <button type="button" aria-label="Desfazer" disabled={!undoStack.length} onClick={undo}>
            <Undo2 size={18} />
          </button>
          <button type="button" aria-label="Refazer" disabled={!redoStack.length} onClick={redo}>
            <Redo2 size={18} />
          </button>
          <span className="handwriting-commandbar__divider" />
          <button
            type="button"
            aria-label="Diminuir zoom"
            disabled={zoom <= 0.7}
            onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))}
          >
            <Minus size={18} />
          </button>
          <button className="handwriting-zoom-value" type="button" onClick={resetView}>
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="Aumentar zoom"
            disabled={zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.15))}
          >
            <Plus size={18} />
          </button>
          <button type="button" aria-label="Redefinir visualização" onClick={resetView}>
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            aria-label="Limpar folha"
            disabled={!strokes.length}
            onClick={clearPage}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="handwriting-workspace">
        <aside className="handwriting-paper-picker" aria-label="Tipo de papel">
          <strong>Papel</strong>
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
        </aside>

        <div className="handwriting-viewport" ref={viewportRef}>
          <div
            className="handwriting-page-shell"
            style={{ width: displayWidth, height: (displayWidth / PAGE_WIDTH) * PAGE_HEIGHT }}
          >
            <canvas
              ref={canvasRef}
              className={`handwriting-canvas handwriting-canvas--${tool}`}
              width={PAGE_WIDTH}
              height={PAGE_HEIGHT}
              aria-label="Folha para escrita à mão com dedo ou caneta"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
            />
          </div>
        </div>
      </div>

      {error && <p className="capture-error">{error}</p>}
      <footer className="handwriting-footer">
        <p>
          <strong>Escrita local e privada.</strong>
          <span>Compatível com toque, mouse e pressão de canetas suportadas pelo navegador.</span>
        </p>
        <button className="primary-button" type="button" onClick={save}>
          Salvar folha no caderno
        </button>
      </footer>
    </div>
  );
}
