import {
  Eraser,
  Hand,
  Highlighter,
  PenLine,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MAX_NOTE_ASSET_DATA_URL_LENGTH } from "../data/local-workspace";
import type {
  HandwritingDocument,
  HandwritingPaper,
  HandwritingPoint,
  HandwritingStroke,
} from "../domain/handwriting";
import { stabilizeHandwriting } from "./handwriting-stabilization";

const PAGE_WIDTH = 1200;
const PAGE_HEIGHT = 1600;
const BASE_DISPLAY_WIDTH = 760;

type HandwritingTool = "pen" | "highlighter" | "eraser" | "hand" | "zoom-in" | "zoom-out";
type PaperStyle = HandwritingPaper;
type Stroke = HandwritingStroke;

type HandwritingStudioProps = {
  onClose: () => void;
  onSave: (dataUrl: string, document: HandwritingDocument) => void;
  initialDocument?: HandwritingDocument;
};

function pointDistance(first: HandwritingPoint, second: HandwritingPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent, "clientX" | "clientY" | "pressure">,
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
  for (let index = 0; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    const next = stroke.points[index + 1];
    if (!current) continue;
    const pressure = stroke.tool === "pen" ? current.pressure : 0.7;
    context.lineWidth = stroke.width * (0.72 + pressure * 0.55);
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

export function HandwritingStudio({ onClose, onSave, initialDocument }: HandwritingStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const panRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const eraserChangedRef = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>(() => initialDocument?.strokes ?? []);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<HandwritingTool>("pen");
  const [paper, setPaper] = useState<PaperStyle>(initialDocument?.paper ?? "ruled");
  const [color, setColor] = useState("#17151c");
  const [width, setWidth] = useState(5);
  const [stabilization, setStabilization] = useState(true);
  const [penOnly, setPenOnly] = useState(false);
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

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (tool === "zoom-in" || tool === "zoom-out") {
      zoomAt(event.clientX, event.clientY, tool === "zoom-in" ? 1 : -1);
      return;
    }
    if (activePointerRef.current !== null) return;
    canvas.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    if (tool === "hand" || (penOnly && event.pointerType === "touch")) {
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
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = (coalesced.length > 0 ? coalesced : [event.nativeEvent]).map((point) =>
      canvasPoint(canvas, point),
    );
    if (tool === "eraser") {
      setStrokes((current) => {
        const next = current.filter(
          (stroke) => !points.some((point) => strokeTouches(stroke, point, 30)),
        );
        if (next.length !== current.length) eraserChangedRef.current = true;
        return next;
      });
      return;
    }
    setStrokes((current) => {
      const last = current.at(-1);
      if (!last) return current;
      const added = points.reduce<HandwritingPoint[]>((accepted, point) => {
        const previous = accepted.at(-1) ?? last.points.at(-1);
        if (!previous || pointDistance(previous, point) >= 1.4) accepted.push(point);
        return accepted;
      }, []);
      if (added.length === 0) return current;
      return [...current.slice(0, -1), { ...last, points: [...last.points, ...added] }];
    });
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerId !== activePointerRef.current) return;
    activePointerRef.current = null;
    if (panRef.current) {
      panRef.current = null;
      return;
    }
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
      return [
        ...current.slice(0, -1),
        {
          ...last,
          points: stabilizeHandwriting(last.points).map((point) => ({
            ...point,
            x: Math.max(0, Math.min(PAGE_WIDTH, point.x)),
            y: Math.max(0, Math.min(PAGE_HEIGHT, point.y)),
          })),
        },
      ];
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
    if (!canvas || strokes.length === 0) {
      setError("Escreva algo na folha antes de salvar.");
      return;
    }
    try {
      const document: HandwritingDocument = {
        version: 1,
        paper,
        strokes: strokes.map((stroke) => ({
          ...stroke,
          points: stroke.points.map((point) => ({
            x: Math.round(point.x * 100) / 100,
            y: Math.round(point.y * 100) / 100,
            pressure: Math.round(point.pressure * 1000) / 1000,
          })),
        })),
      };
      if (JSON.stringify(document).length > 800_000) {
        throw new Error("A folha tem traços demais. Divida as anotações em outra folha.");
      }
      renderPage(canvas, strokes, paper);
      onSave(exportPage(canvas), document);
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
          <button
            type="button"
            className={tool === "hand" ? "is-active" : ""}
            aria-label="Mover folha"
            aria-pressed={tool === "hand"}
            onClick={() => setTool("hand")}
          >
            <Hand size={18} /> <span>Mover</span>
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
          <button
            type="button"
            className={tool === "zoom-out" ? "is-active" : ""}
            aria-label="Lupa para reduzir"
            aria-pressed={tool === "zoom-out"}
            onClick={() => setTool("zoom-out")}
          >
            <ZoomOut size={18} />
          </button>
          <button className="handwriting-zoom-value" type="button" onClick={resetView}>
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className={tool === "zoom-in" ? "is-active" : ""}
            aria-label="Lupa para ampliar"
            aria-pressed={tool === "zoom-in"}
            onClick={() => setTool("zoom-in")}
          >
            <ZoomIn size={18} />
          </button>
          <button type="button" aria-label="Redefinir visualização" onClick={resetView}>
            <RotateCcw size={18} />
          </button>
          <span className="handwriting-commandbar__divider" />
          <button type="button" aria-label="Desfazer" disabled={!undoStack.length} onClick={undo}>
            <Undo2 size={18} />
          </button>
          <button type="button" aria-label="Refazer" disabled={!redoStack.length} onClick={redo}>
            <Redo2 size={18} />
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
                      : "Folha para escrita à mão com dedo ou caneta"
              }
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
              onKeyDown={handleCanvasKeyDown}
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
