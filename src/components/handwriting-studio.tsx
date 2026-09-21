import {
  Download,
  Eraser,
  Hand,
  Highlighter,
  MousePointer2,
  PenLine,
  Printer,
  Redo2,
  RotateCcw,
  StickyNote,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
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
  HandwritingPaper,
  HandwritingPoint,
  HandwritingStroke,
  HandwritingSticky,
} from "../domain/handwriting";
import { stabilizeHandwriting } from "./handwriting-stabilization";

const PAGE_WIDTH = 1200;
const PAGE_HEIGHT = 1600;
const BASE_DISPLAY_WIDTH = 760;
const WRITING_WINDOW_WIDTH = 500;
const WRITING_WINDOW_HEIGHT = 185;

type HandwritingTool =
  "pen" | "highlighter" | "eraser" | "hand" | "select" | "zoom-in" | "zoom-out" | "ruler";
type PaperStyle = HandwritingPaper;
type Stroke = HandwritingStroke;
type Snapshot = { strokes: Stroke[]; stickies: HandwritingSticky[] };
type SelectionBox = { x: number; y: number; width: number; height: number };

type HandwritingStudioProps = {
  onClose: () => void;
  onSave: (dataUrl: string, document: HandwritingDocument) => void;
  initialDocument?: HandwritingDocument;
  draftKey: string;
  onDirtyChange?: (dirty: boolean) => void;
  onDraftChange?: (document: HandwritingDocument) => void;
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
  context.fillStyle = paper === "night" ? "#292432" : paper === "aged" ? "#f3e6c8" : "#fffdf7";
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.save();
  context.strokeStyle = paper === "night" ? "#51465d" : paper === "aged" ? "#d4bd91" : "#dcd8ee";
  context.fillStyle = paper === "night" ? "#6d5f78" : paper === "aged" ? "#d4bd91" : "#d5d0e8";
  context.lineWidth = 1.4;
  const gap = 48;
  if (paper === "ruled" || paper === "grid" || paper === "night" || paper === "aged") {
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
  if (paper !== "blank" && paper !== "night") {
    context.strokeStyle = paper === "aged" ? "#c78f78" : "#e9b9b1";
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

function renderPage(
  canvas: HTMLCanvasElement,
  strokes: readonly Stroke[],
  paper: PaperStyle,
  stickies: readonly HandwritingSticky[],
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  drawPaper(context, paper);
  for (const stroke of strokes) drawStroke(context, stroke);
  for (const sticky of stickies) {
    context.save();
    context.fillStyle = "#bfb7a7";
    context.fillRect(sticky.x + 8, sticky.y + 9, 260, 220);
    context.fillStyle = stickyColor(sticky.color);
    context.fillRect(sticky.x, sticky.y, 260, 220);
    context.fillStyle = "#17151c";
    context.font = "bold 25px sans-serif";
    const words = sticky.text.split(/\s+/);
    let line = "";
    let y = sticky.y + 54;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > 224 && line) {
        context.fillText(line, sticky.x + 18, y, 224);
        y += 34;
        line = word;
      } else line = candidate;
      if (y > sticky.y + 185) break;
    }
    if (y <= sticky.y + 185) context.fillText(line, sticky.x + 18, y, 224);
    context.restore();
  }
}

function strokeBounds(stroke: Stroke): SelectionBox {
  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function overlaps(first: SelectionBox, second: SelectionBox): boolean {
  return (
    first.x <= second.x + second.width &&
    first.x + first.width >= second.x &&
    first.y <= second.y + second.height &&
    first.y + first.height >= second.y
  );
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

export function HandwritingStudio({
  onClose,
  onSave,
  initialDocument,
  draftKey,
  onDirtyChange,
  onDraftChange,
}: HandwritingStudioProps) {
  const recovered = useRef(readDraft(draftKey));
  const startingDocument = recovered.current ?? initialDocument;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const writingCanvasRef = useRef<HTMLCanvasElement>(null);
  const writingPointerRef = useRef<number | null>(null);
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
  const selectionRef = useRef<{
    pointerId: number;
    start: HandwritingPoint;
    origin: HandwritingPoint;
    ids: string[];
    moving: boolean;
  } | null>(null);
  const stickyDragRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => startingDocument?.strokes ?? []);
  const [stickies, setStickies] = useState<HandwritingSticky[]>(
    () => startingDocument?.stickies ?? [],
  );
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [tool, setTool] = useState<HandwritingTool>("pen");
  const [paper, setPaper] = useState<PaperStyle>(startingDocument?.paper ?? "ruled");
  const [color, setColor] = useState("#17151c");
  const [width, setWidth] = useState(5);
  const [stabilization, setStabilization] = useState(true);
  const [penOnly, setPenOnly] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(BASE_DISPLAY_WIDTH);
  const [error, setError] = useState("");
  const [writingWindowOpen, setWritingWindowOpen] = useState(false);
  const [writingWindowX, setWritingWindowX] = useState(100);
  const [writingWindowY, setWritingWindowY] = useState(110);
  const [draftStatus, setDraftStatus] = useState(recovered.current ? "Rascunho recuperado" : "");

  useEffect(() => {
    if (paper === "night" && color === "#17151c") setColor("#fff9ef");
    if (paper !== "night" && color === "#fff9ef") setColor("#17151c");
  }, [paper, color]);

  const currentDocument: HandwritingDocument = useMemo(
    () => ({ version: 1, paper, strokes, stickies }),
    [paper, strokes, stickies],
  );
  const baseline = JSON.stringify({
    version: 1,
    paper: initialDocument?.paper ?? "ruled",
    strokes: initialDocument?.strokes ?? [],
    stickies: initialDocument?.stickies ?? [],
  });
  const dirty = JSON.stringify(currentDocument) !== baseline;

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
    renderPage(canvas, strokes, paper, stickies);
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
    if (selectionBox) {
      context.fillStyle = "#7433e026";
      context.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      context.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
    }
    context.restore();
  }, [paper, selectedIds, selectionBox, stickies, strokes]);

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
  }, [paper, stickies, strokes, writingWindowOpen, writingWindowX, writingWindowY]);

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

  function remember(
    currentStrokes: Stroke[] = strokes,
    currentStickies: HandwritingSticky[] = stickies,
  ) {
    setUndoStack((history) => [
      ...history.slice(-39),
      { strokes: currentStrokes, stickies: currentStickies },
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
    if (tool === "select") {
      const hitSelected = strokes.some(
        (stroke) => selectedIds.includes(stroke.id) && strokeTouches(stroke, point, 24),
      );
      selectionRef.current = {
        pointerId: event.pointerId,
        start: point,
        origin: point,
        ids: hitSelected ? selectedIds : [],
        moving: hitSelected,
      };
      if (hitSelected) remember();
      else {
        setSelectedIds([]);
        setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
      }
      return;
    }
    remember();
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
      {
        id: strokeId(),
        tool: tool === "ruler" ? "pen" : tool,
        color,
        width: activeWidth,
        points: [point],
      },
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
    const selection = selectionRef.current;
    if (selection && selection.pointerId === event.pointerId) {
      const point = canvasPoint(canvas, event);
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
      if (tool === "ruler") {
        const start = last.points[0];
        const end = points.at(-1);
        if (!start || !end) return current;
        return [
          ...current.slice(0, -1),
          { ...last, points: [start, { ...end, pressure: start.pressure }] },
        ];
      }
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
    if (selectionRef.current) {
      const selection = selectionRef.current;
      selectionRef.current = null;
      drawingRef.current = false;
      if (!selection.moving) {
        const point = canvasRef.current ? canvasPoint(canvasRef.current, event) : selection.start;
        const box = {
          x: Math.min(selection.start.x, point.x),
          y: Math.min(selection.start.y, point.y),
          width: Math.abs(point.x - selection.start.x),
          height: Math.abs(point.y - selection.start.y),
        };
        setSelectedIds(
          strokes
            .filter((stroke) => overlaps(strokeBounds(stroke), box))
            .map((stroke) => stroke.id),
        );
        setSelectionBox(null);
      }
      return;
    }
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
    if (!stabilization || tool === "ruler") return;
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
    setRedoStack((history) => [...history, { strokes, stickies }]);
    setStrokes(previous.strokes);
    setStickies(previous.stickies);
    setSelectedIds([]);
    setUndoStack((history) => history.slice(0, -1));
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((history) => [...history, { strokes, stickies }]);
    setStrokes(next.strokes);
    setStickies(next.stickies);
    setSelectedIds([]);
    setRedoStack((history) => history.slice(0, -1));
  }

  function clearPage() {
    if (strokes.length === 0 && stickies.length === 0) return;
    remember();
    setStrokes([]);
    setStickies([]);
    setSelectedIds([]);
  }

  function deleteSelection() {
    if (!selectedIds.length) return;
    remember();
    setStrokes((current) => current.filter((stroke) => !selectedIds.includes(stroke.id)));
    setSelectedIds([]);
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

  function addSticky() {
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
      },
    ]);
  }

  function updateSticky(id: string, change: Partial<HandwritingSticky>) {
    setStickies((current) =>
      current.map((sticky) => (sticky.id === id ? { ...sticky, ...change } : sticky)),
    );
  }

  function removeSticky(id: string) {
    remember();
    setStickies((current) => current.filter((sticky) => sticky.id !== id));
  }

  function startStickyDrag(event: ReactPointerEvent<HTMLButtonElement>, sticky: HandwritingSticky) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    stickyDragRef.current = { id: sticky.id, x: event.clientX, y: event.clientY };
    remember();
  }

  function moveSticky(event: ReactPointerEvent<HTMLButtonElement>, sticky: HandwritingSticky) {
    const drag = stickyDragRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.id !== sticky.id || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) * PAGE_WIDTH) / bounds.width;
    const dy = ((event.clientY - drag.y) * PAGE_HEIGHT) / bounds.height;
    updateSticky(sticky.id, {
      x: Math.round(Math.max(0, Math.min(940, sticky.x + dx))),
      y: Math.round(Math.max(0, Math.min(1380, sticky.y + dy))),
    });
    drag.x = event.clientX;
    drag.y = event.clientY;
  }

  function writingPoint(event: ReactPointerEvent<HTMLCanvasElement>): HandwritingPoint {
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
    setStrokes((current) => [
      ...current,
      {
        id: strokeId(),
        tool: "pen",
        color,
        width,
        points: [writingPoint(event)],
      },
    ]);
  }

  function moveWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    const point = writingPoint(event);
    setStrokes((current) => {
      const last = current.at(-1);
      if (!last || pointDistance(last.points.at(-1) ?? point, point) < 1.4) return current;
      return [...current.slice(0, -1), { ...last, points: [...last.points, point] }];
    });
  }

  function finishWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    writingPointerRef.current = null;
    if (stabilization)
      setStrokes((current) => {
        const last = current.at(-1);
        return last
          ? [...current.slice(0, -1), { ...last, points: stabilizeHandwriting(last.points) }]
          : current;
      });
    const bounds = event.currentTarget.getBoundingClientRect();
    if ((event.clientX - bounds.left) / bounds.width > 0.88) advanceWritingWindow();
  }

  function advanceWritingWindow() {
    if (writingWindowX + WRITING_WINDOW_WIDTH + 300 < PAGE_WIDTH) {
      setWritingWindowX((current) => current + 300);
    } else {
      setWritingWindowX(100);
      setWritingWindowY((current) => Math.min(PAGE_HEIGHT - WRITING_WINDOW_HEIGHT, current + 48));
    }
  }

  function buildDocument(): HandwritingDocument {
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
      stickies,
    };
    if (!isHandwritingDocument(document)) {
      throw new Error("A folha ficou grande demais. Divida suas anotações em outra folha.");
    }
    return document;
  }

  function pageImage(): string {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Não foi possível preparar a folha.");
    renderPage(canvas, strokes, paper, stickies);
    return exportPage(canvas);
  }

  function exportPng() {
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Não foi possível preparar a folha.");
      renderPage(canvas, strokes, paper, stickies);
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
    if (!canvas || (strokes.length === 0 && stickies.length === 0)) {
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

  return (
    <div className="handwriting-studio">
      <div className="handwriting-commandbar" aria-label="Ferramentas de escrita">
        <div className="handwriting-tool-group" aria-label="Instrumentos">
          <button
            type="button"
            className={tool === "ruler" ? "is-active" : ""}
            aria-label="Régua"
            title="Régua: arraste para traçar uma linha reta"
            aria-pressed={tool === "ruler"}
            onClick={() => setTool("ruler")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#B88C13" d="m2 15 14-13 7 7-14 14Z" />
              <path fill="#FACC15" d="m2 13 14-12 6 6L8 20Z" />
              <path fill="#FFE88D" d="m2 13 14-12 2 2L4 15Z" />
              <path stroke="#51465D" strokeWidth="1.5" d="m6 10 2 2m1-5 3 3m0-6 2 2m1-5 3 3" />
            </svg>
          </button>
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
          <button
            type="button"
            className={tool === "select" ? "is-active" : ""}
            aria-label="Selecionar traços"
            aria-pressed={tool === "select"}
            onClick={() => setTool("select")}
          >
            <MousePointer2 size={18} /> <span>Selecionar</span>
          </button>
          <button type="button" aria-label="Adicionar post-it" onClick={addSticky}>
            <StickyNote size={18} /> <span>Post-it</span>
          </button>
          <button
            type="button"
            className={writingWindowOpen ? "is-active" : ""}
            aria-label="Janela de escrita ampliada"
            aria-pressed={writingWindowOpen}
            onClick={() => setWritingWindowOpen((open) => !open)}
          >
            <ZoomIn size={18} /> <span>Janela de escrita</span>
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="handwriting-selection-actions" aria-label="Traços selecionados">
            <span>
              {selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"}
            </span>
            <button type="button" onClick={alignSelection}>
              Alinhar
            </button>
            <button type="button" onClick={deleteSelection}>
              Apagar
            </button>
          </div>
        )}

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
          <div className="handwriting-writing-window__actions">
            <button
              type="button"
              onClick={() => setWritingWindowX((current) => Math.max(0, current - 300))}
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
              }}
            >
              Próxima linha
            </button>
          </div>
        </section>
      )}

      <div className="handwriting-workspace">
        <aside className="handwriting-paper-picker" aria-label="Tipo de papel">
          <strong>Papel</strong>
          {(
            [
              ["ruled", "Pautado"],
              ["grid", "Quadriculado"],
              ["dots", "Pontilhado"],
              ["blank", "Em branco"],
              ["aged", "Papel de livro"],
              ["night", "Escuro, tinta branca"],
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
                      : tool === "select"
                        ? "Arraste para selecionar traços"
                        : "Folha para escrita à mão com dedo ou caneta"
              }
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
              onKeyDown={handleCanvasKeyDown}
            />
            {stickies.map((sticky) => (
              <div
                className={`handwriting-sticky handwriting-sticky--${sticky.color}`}
                style={{
                  left: `${(sticky.x / PAGE_WIDTH) * 100}%`,
                  top: `${(sticky.y / PAGE_HEIGHT) * 100}%`,
                  width: `${(260 / PAGE_WIDTH) * 100}%`,
                  height: `${(220 / PAGE_HEIGHT) * 100}%`,
                }}
                key={sticky.id}
              >
                <div className="handwriting-sticky__bar">
                  <button
                    type="button"
                    aria-label="Mover post-it"
                    onPointerDown={(event) => startStickyDrag(event, sticky)}
                    onPointerMove={(event) => moveSticky(event, sticky)}
                    onPointerUp={() => {
                      stickyDragRef.current = null;
                    }}
                    onPointerCancel={() => {
                      stickyDragRef.current = null;
                    }}
                  >
                    <Hand size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remover post-it"
                    onClick={() => removeSticky(sticky.id)}
                  >
                    ×
                  </button>
                </div>
                <textarea
                  aria-label="Texto do post-it"
                  value={sticky.text}
                  maxLength={240}
                  onFocus={() => remember()}
                  onChange={(event) => updateSticky(sticky.id, { text: event.target.value })}
                  placeholder="Sua ideia aqui"
                />
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
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="capture-error">{error}</p>}
      <footer className="handwriting-footer">
        <p>
          <strong>{draftStatus || "Escrita local e privada."}</strong>
          <span>Compatível com toque, mouse e pressão de canetas suportadas pelo navegador.</span>
        </p>
        <div className="handwriting-export-actions">
          <button type="button" onClick={exportPng}>
            <Download size={16} /> PNG
          </button>
          <button type="button" onClick={printPage}>
            <Printer size={16} /> Imprimir/PDF
          </button>
        </div>
        <button className="primary-button" type="button" onClick={save}>
          Salvar folha no caderno
        </button>
      </footer>
    </div>
  );
}
