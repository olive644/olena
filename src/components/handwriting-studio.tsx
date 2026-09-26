import { useNotebookPreferences } from "../data/notebook-preferences";
import { NotebookSettings } from "./notebook-settings";
import { NotebookFileActions } from "./notebook-file-actions";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { StudyNote } from "../domain/workspace";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
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
import { isHandwritingDocument } from "../data/local-workspace";
import { fitHandwriting } from "../domain/resize-handwriting";
import { encodeHandwritingDraft } from "../data/handwriting-draft";
import { openPrintWindow } from "../data/print-window";
import type {
  HandwritingDocument,
  HandwritingImage,
  HandwritingCoordinateSystem,
  HandwritingPaperColor,
  HandwritingPoint,
  HandwritingSticky,
  HandwritingLayerVisibility,
  HandwritingLayerKey,
} from "../domain/handwriting";
import {
  DEFAULT_HANDWRITING_LAYER_ORDER,
  DEFAULT_HANDWRITING_LAYER_VISIBILITY,
  erasePageText,
  pageTextLines,
} from "../domain/handwriting";
import { rulerMeasurement, rulerPoints, type RulerKind, type RulerUnit } from "../domain/ruler";
import {
  createLiveStabilizer,
  straightenStroke,
  type LiveStabilizer,
} from "./handwriting-stabilization";
import { reviewPortugueseText } from "../domain/text-review";
import { coordinateStats, formatCoordinateNumber } from "../domain/coordinate-math";
import { normalizeMathOcrText } from "../domain/ocr";
import { HelenaLoading } from "./helena-loading";
import type { ImportedPage } from "./page-import";
import { NotebookPageBook } from "./notebook-page-book";
import { HandwritingHistoryBar } from "./handwriting-history-bar";
import { HandwritingPaperPicker } from "./handwriting-paper-picker";
import { HandwritingWritingWindow } from "./handwriting-writing-window";
import { HandwritingInkOptions } from "./handwriting-ink-options";
import { HandwritingSelectionActions } from "./handwriting-selection-actions";
import { OCR_WORKER_OPTIONS } from "./handwriting-ocr";
import { shouldIgnoreTouch, type PalmState } from "./handwriting-palm";
import { restoreStrokes } from "./handwriting-undo";
import { recognizeShape } from "./handwriting-shapes";
import {
  PASTE_OFFSET,
  copyItems,
  dragRotation,
  dragScaleFactor,
  hitSelectionHandle,
  lassoContainsStroke,
  mergeSelection,
  oppositeCorner,
  pasteItems,
  rotateItems,
  scaleItems,
  selectionHandles,
  SELECTION_PAD,
  type HandleKind,
  selectionSize,
  type SelectionClipboard,
} from "./handwriting-selection-ops";
import { predictedTip } from "./handwriting-ink";
import {
  newRemoteStrokes,
  partialStroke,
  planReveal,
  revealProgress,
  shouldReveal,
  type RevealingStroke,
} from "./handwriting-reveal";

// Quanto tempo depois da última amostra a ponta prevista ainda vale (ms).
const LIVE_PREDICTION_WINDOW_MS = 24;
import { HandwritingStickyNote } from "./handwriting-sticky-note";
import {
  HandwritingBrushPanel,
  HandwritingCoordinatePanel,
  HandwritingLayerPanel,
  HandwritingRulerPanel,
} from "./handwriting-side-panels";
import { HandwritingToolGroup } from "./handwriting-tool-group";
import {
  STICKY_MIN_WIDTH,
  STICKY_MAX_WIDTH,
  STICKY_MIN_HEIGHT,
  STICKY_MAX_HEIGHT,
  BASE_DISPLAY_WIDTH,
  WRITING_WINDOW_WIDTH,
  WRITING_WINDOW_HEIGHT,
  PAGE_TEXT_SELECTION_ID,
} from "./handwriting-types";
import type {
  HandwritingTool,
  PaperStyle,
  Stroke,
  Snapshot,
  SelectionBox,
  SelectionMode,
} from "./handwriting-types";
import {
  stickyWidth,
  stickyHeight,
  pointDistance,
  strokeBounds,
  coordinateBounds,
  stickyBounds,
  importedImageBounds,
  pageTextBounds,
  overlaps,
  pointInPolygon,
  unionBounds,
  strokeTouches,
} from "./handwriting-geometry";
import {
  canvasPoint,
  clearPageCanvas,
  drawStroke,
  pageContext,
  pageRenderScale,
  renderPage,
  sizePageCanvas,
} from "./handwriting-canvas";
import { exportPage, downloadCanvasAsPdf } from "./handwriting-export";
import { readDraft, strokeId } from "./handwriting-draft";

const PageImport = lazy(() =>
  import("./page-import").then((module) => ({ default: module.PageImport })),
);

type HandwritingStudioProps = {
  cloud?: CloudSyncState;
  notebookPages?: StudyNote[];
  currentPageId?: string;
  onSelectPage?: (id: string) => void;
  onCreatePage?: () => void;
  onRemovePage?: (id: string) => void;
  onAutosave?: (dataUrl: string, document: HandwritingDocument) => void;
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

// Área de transferência da seleção. Fica fora do componente para valer entre folhas.
let selectionClipboard: SelectionClipboard | null = null;

// Pausa, em milissegundos, para a forma desenhada ser acertada.
const SHAPE_HOLD_MS = 600;

export function HandwritingStudio({
  notebookPages = [],
  currentPageId,
  onSelectPage,
  onCreatePage,
  onRemovePage,
  onAutosave,
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
  const [recovered] = useState(() => readDraft(draftKey, initialDocument));
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
  const liveStabilizerRef = useRef<LiveStabilizer | null>(null);
  const writingCanvasRef = useRef<HTMLCanvasElement>(null);
  // Camada de tinta ao vivo: o traço em andamento é redesenhado por inteiro a cada
  // quadro aqui, e só vai para a folha ao soltar a caneta. Assim o que se vê
  // enquanto se escreve é exatamente o traço final, sem o salto ao terminar.
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveFrameRef = useRef<number | null>(null);
  const liveSettleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSampleAtRef = useRef(0);
  const paintLiveRef = useRef<() => void>(() => undefined);
  // Traços de colegas em revelação: são escritos na camada ao vivo, ao longo do
  // próprio caminho, e só entram na folha quando terminam.
  const revealsRef = useRef<RevealingStroke[]>([]);
  const writingPointerRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const [brush, setBrush] = useState<NonNullable<Stroke["brush"]>>("fine");
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>("cm");
  const [rulerKind, setRulerKind] = useState<RulerKind>("straight");
  const [coordinateStep, setCoordinateStep] = useState<1 | 2 | 5 | 10>(1);
  const { preferences, changePreference, preferenceError } = useNotebookPreferences();
  const {
    stabilization,
    shapeSnap,
    penOnly,
    textAutoCorrect,
    coordinateMeasurements,
    equalCoordinateAxes,
    writingWindowAutoFollow,
  } = preferences;
  const setCoordinateMeasurements = (value: boolean) =>
    changePreference("coordinateMeasurements", value);
  const setEqualCoordinateAxes = (value: boolean) => changePreference("equalCoordinateAxes", value);
  const [fileAction, setFileAction] = useState<"import" | "export" | null>(null);
  function closeImport() {
    setFileAction(null);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>('.notebook-file-tools button[aria-label="Upload"]')
        ?.focus(),
    );
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
  const rulerMeasureRef = useRef<{ start: HandwritingPoint; end: HandwritingPoint } | null>(null);
  const [coordinateMeasure, setCoordinateMeasure] = useState<{
    start: HandwritingPoint;
    end: HandwritingPoint;
  } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    centerX: number;
    centerY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
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
  // Ids dos traços que chegaram de colegas: desfazer e refazer não podem apagá-los.
  const remoteStrokeIdsRef = useRef(new Set<string>());
  // "Segurar para acertar": depois de uma pausa no fim do traço, a forma reconhecida substitui o
  // rabisco e o resto do gesto é ignorado até a caneta ser solta.
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shapeSnappedRef = useRef(false);
  const palmRef = useRef<PalmState>({ penDown: false, lastPenAt: null });
  const selectionRef = useRef<{
    pointerId: number;
    start: HandwritingPoint;
    origin: HandwritingPoint;
    ids: string[];
    coordinateIds: string[];
    moving: boolean;
    lasso: boolean;
    path: HandwritingPoint[];
    // Com Shift, o laço soma à seleção que já existia.
    previousIds?: string[];
    // Arrasto de uma alça da caixa da seleção: a folha de origem é guardada para cada quadro
    // ser calculado a partir dela, sem acumular erro.
    handle?: {
      kind: HandleKind;
      anchor: { x: number; y: number };
      center: { x: number; y: number };
      grab: { x: number; y: number };
      original: {
        strokes: Stroke[];
        stickies: HandwritingSticky[];
        coordinateSystems: HandwritingCoordinateSystem[];
        images: HandwritingImage[];
      };
    };
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
  const [pageTextFrame, setPageTextFrame] = useState(
    startingDocument?.pageTextFrame ?? { x: 112, y: 80, width: 980, height: 1440 },
  );
  const textFrameDrag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    frame: { x: number; y: number; width: number; height: number };
    mode: "move" | "resize";
  } | null>(null);
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
  const [textMode, setTextMode] = useState(false);
  const setTextAutoCorrect = (value: boolean) => changePreference("textAutoCorrect", value);
  const [stickies, setStickies] = useState<HandwritingSticky[]>(
    () => startingDocument?.stickies ?? [],
  );
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [canPaste, setCanPaste] = useState(() => selectionClipboard !== null);
  const pasteCountRef = useRef(0);
  const [selectedCoordinateIds, setSelectedCoordinateIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectionPath, setSelectionPath] = useState<HandwritingPoint[] | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("rectangle");
  const [formulaDraft, setFormulaDraft] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const [paperSectionsOpen, setPaperSectionsOpen] = useState({ paper: false, color: false });
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [stickyMenuId, setStickyMenuId] = useState<string | null>(null);
  const [stickyColorMenuId, setStickyColorMenuId] = useState<string | null>(null);
  const [tool, setActiveTool] = useState<HandwritingTool>("pen");
  const [phoneLayout, setPhoneLayout] = useState(
    () => window.matchMedia?.("(max-width: 680px)").matches ?? false,
  );
  const [mobileDrawer, setMobileDrawer] = useState<"tool" | "history" | null>(null);
  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 680px)");
    if (!query) return;
    const update = () => setPhoneLayout(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const penInk = useRef(legacyPaperColor === "night" ? "#fff9ef" : "#17151c");
  function setTool(next: HandwritingTool) {
    setMobileDrawer(["pen", "ruler", "coordinates", "select"].includes(next) ? "tool" : null);
    // A janela de escrita fica sobre a folha e captura os ponteiros. Fechá-la
    // ao trocar de ferramenta garante que régua, borracha e seleção recebam
    // os próximos gestos imediatamente.
    setWritingWindowOpen(false);
    setStickyMenuId(null);
    setStickyColorMenuId(null);
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
      : (startingDocument?.paper ?? "board"),
  );
  const [canvasSize, setCanvasSize] = useState(
    startingDocument?.canvasSize ??
      (startingDocument?.paper && startingDocument.paper !== "board"
        ? { width: 1200, height: 1600 }
        : { width: 3200, height: 2400 }),
  );
  const PAGE_WIDTH = canvasSize.width;
  const PAGE_HEIGHT = canvasSize.height;
  function selectPaper(next: PaperStyle) {
    if (next !== "board" && PAGE_WIDTH > 1200) {
      const fitted = fitHandwriting(currentDocument, 1200, 1600);
      setStrokes(fitted.strokes);
      setStickies(fitted.stickies ?? []);
      setImportedImages(fitted.images ?? []);
      setCoordinateSystems(fitted.coordinateSystems ?? []);
      setBackgroundFrame(fitted.backgroundFrame);
      if (pageText.trim() && fitted.pageTextFrame) setPageTextFrame(fitted.pageTextFrame);
    }
    if (next === "board") setCanvasSize({ width: 3200, height: 2400 });
    else {
      setCanvasSize({ width: 1200, height: 1600 });
      setPageTextFrame((frame) => ({
        x: Math.min(frame.x, 1080),
        y: Math.min(frame.y, 1540),
        width: Math.max(120, Math.min(frame.width, 1200 - Math.min(frame.x, 1080))),
        height: Math.max(60, Math.min(frame.height, 1600 - Math.min(frame.y, 1540))),
      }));
    }
    setPaper(next);
  }
  const [paperColor, setPaperColor] = useState<HandwritingPaperColor>(legacyPaperColor);
  const [color, setColor] = useState(legacyPaperColor === "night" ? "#fff9ef" : "#17151c");
  const [width, setWidth] = useState(5);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(BASE_DISPLAY_WIDTH);
  // Resolução do bitmap da folha: acompanha a densidade da tela e o zoom para a
  // tinta ficar nítida. Muda com um pequeno atraso para o zoom não redesenhar a
  // folha a cada passo.
  const [renderScale, setRenderScale] = useState(() =>
    pageRenderScale(
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      BASE_DISPLAY_WIDTH * (PAGE_WIDTH / 1200),
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ),
  );
  const [error, setError] = useState("");
  const [writingWindowOpen, setWritingWindowOpen] = useState(false);
  const [writingWindowX, setWritingWindowX] = useState(100);
  const [writingWindowY, setWritingWindowY] = useState(110);
  const setWritingWindowAutoFollow = (value: boolean) =>
    changePreference("writingWindowAutoFollow", value);
  const [writingWindowStatus, setWritingWindowStatus] = useState("Coluna 1, linha 1");
  const [draftStatus, setDraftStatus] = useState(recovered ? "Rascunho recuperado" : "");

  function selectPaperColor(nextColor: HandwritingPaperColor) {
    setPaperColor(nextColor);
    if (nextColor === "night" && color === "#17151c") setColor("#fff9ef");
    if (nextColor !== "night" && color === "#fff9ef") setColor("#17151c");
  }

  const currentDocument: HandwritingDocument = useMemo(
    () => ({
      version: 1,
      canvasSize,
      paper,
      paperColor,
      strokes,
      stickies,
      pageText,
      pageTextSize,
      pageTextFrame,
      coordinateSystems,
      images: importedImages,
      layers: { visibility: layerVisibility, order: layerOrder },
      background,
      backgroundFrame,
    }),
    [
      canvasSize,
      paper,
      paperColor,
      strokes,
      stickies,
      pageText,
      pageTextSize,
      pageTextFrame,
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
    canvasSize:
      initialDocument?.canvasSize ??
      (initialDocument?.paper && initialDocument.paper !== "board"
        ? { width: 1200, height: 1600 }
        : { width: 3200, height: 2400 }),
    paper:
      (initialDocument?.paper as string | undefined) === "night" ||
      (initialDocument?.paper as string | undefined) === "aged"
        ? "blank"
        : (initialDocument?.paper ?? "board"),
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
    pageTextFrame: initialDocument?.pageTextFrame ?? { x: 112, y: 80, width: 980, height: 1440 },
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
    setCanvasSize(
      remoteDocument.canvasSize ??
        (remoteDocument.paper === "board"
          ? { width: 3200, height: 2400 }
          : { width: 1200, height: 1600 }),
    );
    setPaperColor(remoteDocument.paperColor ?? "light");
    setColor(remoteDocument.paperColor === "night" ? "#fff9ef" : "#17151c");
    const incoming = newRemoteStrokes(
      remoteDocument.strokes,
      new Set(strokes.map((stroke) => stroke.id)),
    );
    for (const stroke of incoming) remoteStrokeIdsRef.current.add(stroke.id);
    // Traços novos de um colega são escritos na folha em vez de aparecerem de uma vez.
    const stillHere = revealsRef.current.filter((reveal) =>
      remoteDocument.strokes.some((stroke) => stroke.id === reveal.stroke.id),
    );
    revealsRef.current = stillHere;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (remoteAuthor && !reducedMotion && shouldReveal(incoming)) {
      revealsRef.current = [...stillHere, ...planReveal(incoming, performance.now())];
      scheduleLivePaint();
    }
    setStrokes(remoteDocument.strokes);
    setStickies(remoteDocument.stickies ?? []);
    setPageText(remoteDocument.pageText ?? "");
    setPageTextSize(remoteDocument.pageTextSize ?? 28);
    setPageTextFrame(remoteDocument.pageTextFrame ?? { x: 112, y: 80, width: 980, height: 1440 });
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

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  useEffect(() => {
    onDraftChangeRef.current?.(currentDocument);
  }, [currentDocument]);

  const autosaveRef = useRef<() => void>(() => {});
  const autosavedRef = useRef("");
  useEffect(() => {
    autosaveRef.current = () => {
      const serialized = JSON.stringify(currentDocument);
      if (!dirty || !onAutosave || drawingRef.current || serialized === autosavedRef.current)
        return;
      if ((background && !backgroundImage) || !importedImagesReady) return;
      try {
        onAutosave(pageImage(), buildDocument());
        autosavedRef.current = serialized;
        setDraftStatus("Folha salva automaticamente");
      } catch (caught) {
        setDraftStatus(
          caught instanceof Error
            ? `Não foi possível salvar: ${caught.message}`
            : "Não foi possível salvar a folha. Tente salvar novamente.",
        );
      }
    };
  });
  useEffect(() => {
    const timer = window.setTimeout(() => autosaveRef.current(), 900);
    return () => window.clearTimeout(timer);
  }, [currentDocument, backgroundImage, importedImagesReady]);
  useEffect(() => {
    const flush = () => autosaveRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(
          `helenastudy.handwriting.draft.${draftKey}`,
          encodeHandwritingDraft(currentDocument, initialDocument),
        );
        setDraftStatus("Rascunho salvo neste dispositivo");
      } catch {
        setDraftStatus("Sem espaço para salvar rascunho neste dispositivo");
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [currentDocument, dirty, draftKey, initialDocument]);

  useEffect(() => {
    if (!dirty) return;
    const persistBeforeLeaving = () => {
      try {
        localStorage.setItem(
          `helenastudy.handwriting.draft.${draftKey}`,
          encodeHandwritingDraft(currentDocument, initialDocument),
        );
      } catch {
        // The visible quota warning remains handled by the regular draft save.
      }
    };
    window.addEventListener("pagehide", persistBeforeLeaving);
    return () => window.removeEventListener("pagehide", persistBeforeLeaving);
  }, [currentDocument, dirty, draftKey, initialDocument]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sizePageCanvas(canvas, renderScale, PAGE_WIDTH, PAGE_HEIGHT);
    if (liveCanvasRef.current)
      sizePageCanvas(liveCanvasRef.current, renderScale, PAGE_WIDTH, PAGE_HEIGHT);
    // O traço em andamento fica só na camada ao vivo até a caneta ser solta.
    const hidden = new Set(revealsRef.current.map((reveal) => reveal.stroke.id));
    const liveId = liveStrokeRef.current?.id;
    if (liveId) hidden.add(liveId);
    renderPage(
      canvas,
      hidden.size > 0 ? strokes.filter((stroke) => !hidden.has(stroke.id)) : strokes,
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
      pageTextFrame,
    );
    // O traço em andamento fica na camada ao vivo, não na folha.
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
      const box = pageTextBounds(pageText, pageTextSize, pageTextFrame);
      context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
    }
    if (layerVisibility.background) {
      for (const image of importedImages) {
        if (!selectedIds.includes(image.id)) continue;
        const box = importedImageBounds(image);
        context.strokeRect(box.x - 8, box.y - 8, box.width + 16, box.height + 16);
      }
    }
    const boxes = [
      ...strokes.filter((stroke) => selectedIds.includes(stroke.id)).map(strokeBounds),
      ...(layerVisibility.coordinates
        ? coordinateSystems
            .filter((system) => selectedIds.includes(system.id))
            .map(coordinateBounds)
        : []),
      ...(layerVisibility.stickies
        ? stickies.filter((sticky) => selectedIds.includes(sticky.id)).map(stickyBounds)
        : []),
      ...(layerVisibility.background
        ? importedImages.filter((image) => selectedIds.includes(image.id)).map(importedImageBounds)
        : []),
    ];
    const selectionFrame = unionBounds(boxes);
    if (selectionFrame && !selectionBox && !selectionPath) {
      const handles = selectionHandles(selectionFrame);
      context.save();
      context.setLineDash([10, 8]);
      context.strokeRect(
        selectionFrame.x - SELECTION_PAD,
        selectionFrame.y - SELECTION_PAD,
        selectionFrame.width + SELECTION_PAD * 2,
        selectionFrame.height + SELECTION_PAD * 2,
      );
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(handles.rotate.x, handles.rotate.y);
      context.lineTo(handles.rotate.x, selectionFrame.y - SELECTION_PAD);
      context.stroke();
      context.fillStyle = "#ffffff";
      for (const kind of ["nw", "ne", "se", "sw", "rotate"] as const) {
        const handle = handles[kind];
        context.beginPath();
        context.arc(handle.x, handle.y, kind === "rotate" ? 13 : 11, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
      context.restore();
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
    pageTextFrame,
    coordinateSystems,
    importedImages,
    layerVisibility,
    layerOrder,
    textMode,
    backgroundImage,
    backgroundFrame,
    renderableImportedImages,
    renderScale,
    PAGE_WIDTH,
    PAGE_HEIGHT,
  ]);

  useEffect(() => {
    if (!writingWindowOpen) return;
    const source = canvasRef.current;
    const target = writingCanvasRef.current;
    const context = target?.getContext("2d");
    if (!source || !target || !context) return;
    context.clearRect(0, 0, target.width, target.height);
    const mirrorScale = source.width / PAGE_WIDTH;
    context.drawImage(
      source,
      writingWindowX * mirrorScale,
      writingWindowY * mirrorScale,
      WRITING_WINDOW_WIDTH * mirrorScale,
      WRITING_WINDOW_HEIGHT * mirrorScale,
      0,
      0,
      target.width,
      target.height,
    );
    context.fillStyle = "#7433e055";
    context.fillRect(target.width - 14, 0, 2, target.height);
  }, [
    PAGE_WIDTH,
    paper,
    stickies,
    strokes,
    writingWindowOpen,
    writingWindowX,
    writingWindowY,
    backgroundImage,
    renderScale,
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
    copy: () => void;
    cut: () => void;
    paste: () => void;
    duplicate: () => void;
    selectAll: () => void;
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
    copy: () => undefined,
    cut: () => undefined,
    paste: () => undefined,
    duplicate: () => undefined,
    selectAll: () => undefined,
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
      if (ctrlOrCmd && current.tool === "select") {
        const shortcut = event.key.toLowerCase();
        const actions: Record<string, () => void> = {
          c: current.copy,
          x: current.cut,
          v: current.paste,
          d: current.duplicate,
          a: current.selectAll,
        };
        const action = actions[shortcut];
        if (action) {
          event.preventDefault();
          action();
          return;
        }
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

  // Scroll vertical faz zoom centralizado no cursor, como em apps de desenho
  // profissionais. Ctrl/Cmd continua funcionando como atalho explícito; o
  // listener nativo permite preventDefault sem eventos passivos.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(event: WheelEvent) {
      if (event.shiftKey && !event.ctrlKey && !event.metaKey) return;
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
        pageTextFrame,
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

  function startTextFrameDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const handle = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-text-frame-handle]",
    );
    if (!handle) return;
    event.preventDefault();
    event.stopPropagation();
    remember();
    textFrameDrag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      frame: pageTextFrame,
      mode: handle.dataset["textFrameHandle"] === "resize" ? "resize" : "move",
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveTextFrame(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = textFrameDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const scale = PAGE_WIDTH / displayWidth;
    const dx = (event.clientX - drag.x) * scale;
    const dy = (event.clientY - drag.y) * scale;
    const nextWidth = Math.max(120, Math.min(PAGE_WIDTH - drag.frame.x, drag.frame.width + dx));
    const contentHeight =
      pageTextLines(pageText, pageTextSize, nextWidth).length * pageTextSize * (40 / 28);
    if (drag.mode === "resize" && contentHeight > PAGE_HEIGHT - drag.frame.y) {
      setError("O texto não cabe nesta largura. Aumente a caixa.");
      return;
    }
    setError("");
    setPageTextFrame(
      drag.mode === "move"
        ? {
            ...drag.frame,
            x: Math.max(0, Math.min(PAGE_WIDTH - drag.frame.width, drag.frame.x + dx)),
            y: Math.max(0, Math.min(PAGE_HEIGHT - drag.frame.height, drag.frame.y + dy)),
          }
        : {
            ...drag.frame,
            width: nextWidth,
            height: Math.max(
              60,
              Math.min(PAGE_HEIGHT - drag.frame.y, Math.max(contentHeight, drag.frame.height + dy)),
            ),
          },
    );
  }

  function adjustTextFrameWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const delta = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, -10],
      ArrowDown: [0, 10],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    remember();
    const resize = event.currentTarget.dataset["textFrameHandle"] === "resize";
    const [dx, dy] = delta;
    if (dx === undefined || dy === undefined) return;
    setPageTextFrame((frame) =>
      resize
        ? (() => {
            const nextWidth = Math.max(120, Math.min(PAGE_WIDTH - frame.x, frame.width + dx));
            const contentHeight =
              pageTextLines(pageText, pageTextSize, nextWidth).length * pageTextSize * (40 / 28);
            if (contentHeight > PAGE_HEIGHT - frame.y) return frame;
            return {
              ...frame,
              width: nextWidth,
              height: Math.max(
                60,
                Math.min(PAGE_HEIGHT - frame.y, Math.max(contentHeight, frame.height + dy)),
              ),
            };
          })()
        : {
            ...frame,
            x: Math.max(0, Math.min(PAGE_WIDTH - frame.width, frame.x + dx)),
            y: Math.max(0, Math.min(PAGE_HEIGHT - frame.height, frame.y + dy)),
          },
    );
  }

  function zoomTo(clientX: number, clientY: number, nextZoom: number) {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const bounds = canvas.getBoundingClientRect();
    const relativeX = (clientX - bounds.left) / bounds.width;
    const relativeY = (clientY - bounds.top) / bounds.height;
    const clampedZoom = Math.max(0.7, Math.min(2, Math.round(nextZoom * 100) / 100));
    if (clampedZoom === zoom) return;
    setZoom(clampedZoom);
    requestAnimationFrame(() => {
      const nextBounds = canvas.getBoundingClientRect();
      viewport.scrollLeft += nextBounds.left + relativeX * nextBounds.width - clientX;
      viewport.scrollTop += nextBounds.top + relativeY * nextBounds.height - clientY;
    });
  }

  function zoomAt(clientX: number, clientY: number, direction: 1 | -1) {
    zoomTo(clientX, clientY, zoom + direction * 0.15);
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
        const next = erasePageText(current, points, glyphWidth, pageTextSize, pageTextFrame);
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

  function paintLive() {
    liveFrameRef.current = null;
    const overlay = liveCanvasRef.current;
    if (!overlay) return;
    clearPageCanvas(overlay);
    const context = pageContext(overlay);
    if (!context) return;
    const stroke = liveStrokeRef.current;
    let tip: HandwritingPoint | undefined;
    if (stroke) {
      // A ponta prevista cobre o atraso do filtro e do quadro, mas só enquanto a mão
      // se move: parada, a ponta prevista ficaria à frente da caneta.
      const fresh = performance.now() - lastSampleAtRef.current < LIVE_PREDICTION_WINDOW_MS;
      tip = fresh ? predictedTip(stroke.points) : undefined;
      const drawn = tip ? { ...stroke, points: [...stroke.points, tip] } : stroke;
      drawStroke(context, drawn);
      if (writingWindowOpen) paintWritingWindowLive(drawn);
    }
    paintReveals(context);
    clearTimeout(liveSettleRef.current);
    if (tip) liveSettleRef.current = setTimeout(scheduleLivePaint, LIVE_PREDICTION_WINDOW_MS + 8);
  }

  // Escreve, quadro a quadro, os traços novos de colegas. Ao terminar, cada um é
  // desenhado na folha no mesmo quadro em que sai da camada ao vivo.
  function paintReveals(context: CanvasRenderingContext2D) {
    const reveals = revealsRef.current;
    if (reveals.length === 0) return;
    const now = performance.now();
    const active: RevealingStroke[] = [];
    const finished: Stroke[] = [];
    for (const reveal of reveals) {
      const progress = revealProgress(reveal, now);
      if (progress >= 1) finished.push(reveal.stroke);
      else {
        active.push(reveal);
        if (progress > 0) drawStroke(context, partialStroke(reveal.stroke, progress));
      }
    }
    revealsRef.current = active;
    const main = canvasRef.current;
    const mainContext = finished.length > 0 && main ? pageContext(main) : null;
    if (mainContext) for (const stroke of finished) drawStroke(mainContext, stroke);
    if (active.length > 0) scheduleLivePaint();
  }
  paintLiveRef.current = paintLive;

  function scheduleLivePaint() {
    if (liveFrameRef.current !== null) return;
    liveFrameRef.current = requestAnimationFrame(() => paintLiveRef.current());
  }

  function clearLive() {
    if (liveFrameRef.current !== null) cancelAnimationFrame(liveFrameRef.current);
    liveFrameRef.current = null;
    clearTimeout(liveSettleRef.current);
    // Revelações de colegas continuam: repinta a camada só com elas, no mesmo quadro.
    if (revealsRef.current.length > 0) {
      paintLive();
      return;
    }
    if (liveCanvasRef.current) clearPageCanvas(liveCanvasRef.current);
  }

  // Ao soltar a caneta o traço final é desenhado na folha no mesmo instante em que
  // a camada ao vivo é limpa, para não haver um quadro sem tinta entre os dois.
  function commitLiveStroke(stroke: Stroke) {
    const main = canvasRef.current;
    const context = main ? pageContext(main) : null;
    if (context) drawStroke(context, stroke);
    clearLive();
  }

  // A janela de escrita espelha a folha; o traço em andamento é vetorial e vai por
  // cima, na resolução da janela, para ficar nítido.
  function paintWritingWindowLive(stroke: Stroke) {
    const source = canvasRef.current;
    const target = writingCanvasRef.current;
    const context = target?.getContext("2d");
    if (!source || !target || !context) return;
    context.clearRect(0, 0, target.width, target.height);
    const mirrorScale = source.width / PAGE_WIDTH;
    context.drawImage(
      source,
      writingWindowX * mirrorScale,
      writingWindowY * mirrorScale,
      WRITING_WINDOW_WIDTH * mirrorScale,
      WRITING_WINDOW_HEIGHT * mirrorScale,
      0,
      0,
      target.width,
      target.height,
    );
    context.save();
    context.scale(target.width / WRITING_WINDOW_WIDTH, target.height / WRITING_WINDOW_HEIGHT);
    context.translate(-writingWindowX, -writingWindowY);
    drawStroke(context, stroke);
    context.restore();
    context.fillStyle = "#7433e055";
    context.fillRect(target.width - 14, 0, 2, target.height);
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "pen") {
      palmRef.current = { penDown: true, lastPenAt: performance.now() };
    } else if (
      event.pointerType === "touch" &&
      shouldIgnoreTouch(palmRef.current, performance.now())
    ) {
      // Palma apoiada enquanto a caneta escreve: não é gesto e não pode cancelar o traço.
      event.preventDefault();
      return;
    }
    if (event.pointerType === "touch") {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size >= 2) {
        const points = [...touchPointersRef.current.values()].slice(0, 2);
        const first = points[0];
        const second = points[1];
        if (first && second) {
          const viewport = viewportRef.current;
          pinchRef.current = {
            distance: Math.hypot(second.x - first.x, second.y - first.y),
            zoom,
            centerX: (first.x + second.x) / 2,
            centerY: (first.y + second.y) / 2,
            scrollLeft: viewport?.scrollLeft ?? 0,
            scrollTop: viewport?.scrollTop ?? 0,
          };
          const unfinishedStroke = liveStrokeRef.current;
          if (unfinishedStroke)
            setStrokes((current) => current.filter((stroke) => stroke.id !== unfinishedStroke.id));
          drawingRef.current = false;
          liveStrokeRef.current = null;
          liveStabilizerRef.current = null;
          clearLive();
          selectionRef.current = null;
          panRef.current = null;
          activePointerRef.current = null;
          event.preventDefault();
          return;
        }
      }
    }
    // Ponta de borracha invertida e botao de barril sao comuns em mesas
    // digitalizadoras (Wacom, Huion, Surface Pen). O navegador reporta a
    // ponta de borracha como button 5 e o botao de barril como button 2 em
    // pointerType "pen". Tratamos os dois sem exigir que a pessoa troque de
    // ferramenta manualmente.
    const isPenEraserTip = event.pointerType === "pen" && event.button === 5;
    const isPenBarrelButton = event.pointerType === "pen" && event.button === 2;
    if (event.button !== 0 && !isPenEraserTip && !isPenBarrelButton) return;
    if (event.pointerType === "pen" && !penDetectedRef.current) {
      penDetectedRef.current = true;
      changePreference("penOnly", true);
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
    liveStabilizerRef.current = null;
    clearLive();
    setError("");
    const point = canvasPoint(canvas, event);
    if (effectiveTool === "ruler") {
      const measurement = { start: point, end: point };
      rulerMeasureRef.current = measurement;
      setRulerMeasure(measurement);
    }
    if (effectiveTool === "coordinates") {
      remember();
      setCoordinateMeasure({ start: point, end: point });
      return;
    }
    if (effectiveTool === "select") {
      const frame = unionBounds([
        ...strokes.filter((stroke) => selectedIds.includes(stroke.id)).map(strokeBounds),
        ...(layerVisibility.coordinates
          ? coordinateSystems
              .filter((system) => selectedIds.includes(system.id))
              .map(coordinateBounds)
          : []),
        ...(layerVisibility.stickies
          ? stickies.filter((sticky) => selectedIds.includes(sticky.id)).map(stickyBounds)
          : []),
        ...(layerVisibility.background
          ? importedImages
              .filter((image) => selectedIds.includes(image.id))
              .map(importedImageBounds)
          : []),
      ]);
      // Alça maior no toque, para o dedo acertar.
      const grabRadius = event.pointerType === "touch" ? 34 : 22;
      const grabbed = frame ? hitSelectionHandle(point, frame, grabRadius) : null;
      if (frame && grabbed) {
        remember();
        drawingRef.current = true;
        selectionRef.current = {
          pointerId: event.pointerId,
          start: point,
          origin: point,
          ids: selectedIds,
          coordinateIds: selectedCoordinateIds,
          moving: true,
          lasso: false,
          path: [],
          handle: {
            kind: grabbed,
            anchor: grabbed === "rotate" ? point : oppositeCorner(frame, grabbed),
            center: { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 },
            grab: point,
            original: { strokes, stickies, coordinateSystems, images: importedImages },
          },
        };
        return;
      }
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
          previousIds: event.shiftKey ? selectedIds : [],
        };
        if (!event.shiftKey) setSelectedIds([]);
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
          overlaps(pageTextBounds(pageText, pageTextSize, pageTextFrame), {
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
    liveStabilizerRef.current =
      stabilization && effectiveTool !== "ruler" ? createLiveStabilizer(point) : null;
    clearTimeout(holdTimerRef.current);
    shapeSnappedRef.current = false;
    // O traço em andamento fica só na camada ao vivo; a folha o recebe ao soltar a caneta.
    if (effectiveTool !== "ruler") {
      lastSampleAtRef.current = performance.now();
      scheduleLivePaint();
    }
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "pen") {
      palmRef.current = { ...palmRef.current, lastPenAt: performance.now() };
    } else if (
      event.pointerType === "touch" &&
      shouldIgnoreTouch(palmRef.current, performance.now())
    ) {
      return;
    }
    if (event.pointerType === "touch") {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const pinch = pinchRef.current;
      if (pinch && touchPointersRef.current.size >= 2) {
        const points = [...touchPointersRef.current.values()].slice(0, 2);
        const first = points[0];
        const second = points[1];
        if (first && second && pinch.distance > 0) {
          const centerX = (first.x + second.x) / 2;
          const centerY = (first.y + second.y) / 2;
          const viewport = viewportRef.current;
          if (viewport) {
            viewport.scrollLeft = pinch.scrollLeft + pinch.centerX - centerX;
            viewport.scrollTop = pinch.scrollTop + pinch.centerY - centerY;
          }
          const distance = Math.hypot(second.x - first.x, second.y - first.y);
          zoomTo(centerX, centerY, pinch.zoom * (distance / pinch.distance));
          return;
        }
      }
    }
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
      const handle = selection.handle;
      if (handle) {
        const chosen = new Set(selection.ids);
        const next =
          handle.kind === "rotate"
            ? rotateItems(
                handle.original,
                chosen,
                dragRotation(handle.center, handle.grab, point, event.shiftKey),
                handle.center,
              )
            : scaleItems(
                handle.original,
                chosen,
                dragScaleFactor(handle.anchor, handle.grab, point),
                handle.anchor,
              );
        setStrokes([...next.strokes]);
        setStickies([...next.stickies]);
        setCoordinateSystems([...next.coordinateSystems]);
        setImportedImages([...next.images]);
        return;
      }
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
    const sampleEvents = coalesced.length > 0 ? coalesced : [event.nativeEvent];
    const bounds = canvas.getBoundingClientRect();
    const points = sampleEvents.map((point) => canvasPoint(canvas, point, bounds));
    const sampleTimes = sampleEvents.map((sample) => sample.timeStamp);
    if (activeToolRef.current === "ruler") {
      const end = points.at(-1);
      if (end)
        setRulerMeasure((measurement) => {
          if (!measurement) return null;
          const guide = rulerPoints(measurement.start, end, rulerKind);
          const snappedEnd = guide[1];
          const nextMeasurement = {
            ...measurement,
            end: rulerKind === "circle" || rulerKind === "curve" || !snappedEnd ? end : snappedEnd,
          };
          rulerMeasureRef.current = nextMeasurement;
          return nextMeasurement;
        });
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
    const liveStroke = liveStrokeRef.current;
    if (!liveStroke) return;
    if (shapeSnappedRef.current) return;
    const previous = liveStroke.points.at(-1);
    const added = (liveStabilizerRef.current?.push(points, sampleTimes) ?? points).reduce<
      HandwritingPoint[]
    >((accepted, point) => {
      const lastPoint = accepted.at(-1) ?? previous;
      if (
        !lastPoint ||
        pointDistance(lastPoint, point) >= 0.65 ||
        Math.abs(lastPoint.pressure - point.pressure) >= 0.015
      )
        accepted.push(point);
      return accepted;
    }, []);
    if (added.length === 0) return;
    liveStroke.points.push(...added);
    lastSampleAtRef.current = performance.now();
    scheduleLivePaint();
    clearTimeout(holdTimerRef.current);
    if (shapeSnap && (activeToolRef.current === "pen" || activeToolRef.current === "highlighter")) {
      holdTimerRef.current = setTimeout(snapHeldStroke, SHAPE_HOLD_MS);
    }
  }

  function snapHeldStroke() {
    const live = liveStrokeRef.current;
    if (!live || !drawingRef.current || shapeSnappedRef.current) return;
    const shape = recognizeShape(live.points);
    if (!shape) return;
    live.points = shape.points;
    liveStabilizerRef.current = null;
    shapeSnappedRef.current = true;
    scheduleLivePaint();
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    clearTimeout(holdTimerRef.current);
    if (event.pointerType === "pen") {
      palmRef.current = { penDown: false, lastPenAt: performance.now() };
    }
    if (event.pointerType === "touch") {
      touchPointersRef.current.delete(event.pointerId);
      if (pinchRef.current && touchPointersRef.current.size < 2) pinchRef.current = null;
    }
    if (event.pointerId !== activePointerRef.current) return;
    if (activeToolRef.current === "ruler") {
      const measurement = rulerMeasureRef.current;
      const canvas = canvasRef.current;
      const end = canvas && measurement ? canvasPoint(canvas, event) : measurement?.end;
      if (measurement && end && pointDistance(measurement.start, end) >= 4) {
        setStrokes((current) => [
          ...current,
          {
            id: strokeId(),
            tool: "pen",
            color,
            width,
            points: rulerPoints(
              measurement.start,
              { ...end, pressure: measurement.start.pressure },
              rulerKind,
            ),
          },
        ]);
      } else {
        setUndoStack((history) => history.slice(0, -1));
      }
      rulerMeasureRef.current = null;
      setRulerMeasure(null);
      activePointerRef.current = null;
      drawingRef.current = false;
      return;
    }
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
            measurements: coordinateMeasurements,
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
        const selectedStrokeIds = strokes
          .filter((stroke) => lassoContainsStroke(polygon, stroke))
          .map((stroke) => stroke.id);
        const selectedCoordinateIds = layerVisibility.coordinates
          ? coordinateSystems
              .filter((system) => {
                const box = coordinateBounds(system);
                return pointInPolygon(
                  { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 },
                  polygon,
                );
              })
              .map((system) => system.id)
          : [];
        const selectedStickyIds = layerVisibility.stickies
          ? stickies
              .filter((sticky) => {
                const box = stickyBounds(sticky);
                return pointInPolygon(
                  { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 },
                  polygon,
                );
              })
              .map((sticky) => sticky.id)
          : [];
        const selectedTextIds =
          layerVisibility.text && pageText
            ? pointInPolygon(
                {
                  x:
                    pageTextBounds(pageText, pageTextSize, pageTextFrame).x +
                    pageTextBounds(pageText, pageTextSize, pageTextFrame).width / 2,
                  y:
                    pageTextBounds(pageText, pageTextSize, pageTextFrame).y +
                    pageTextBounds(pageText, pageTextSize, pageTextFrame).height / 2,
                  pressure: 0.5,
                },
                polygon,
              )
              ? [PAGE_TEXT_SELECTION_ID]
              : []
            : [];
        const selectedImageIds = layerVisibility.background
          ? importedImages
              .filter((image) => {
                const box = importedImageBounds(image);
                return pointInPolygon(
                  { x: box.x + box.width / 2, y: box.y + box.height / 2, pressure: 0.5 },
                  polygon,
                );
              })
              .map((image) => image.id)
          : [];
        setSelectedIds(
          mergeSelection(
            selection.previousIds ?? [],
            [
              ...selectedStrokeIds,
              ...selectedCoordinateIds,
              ...selectedStickyIds,
              ...selectedTextIds,
              ...selectedImageIds,
            ],
            (selection.previousIds?.length ?? 0) > 0,
          ),
        );
        setSelectedCoordinateIds(selectedCoordinateIds);
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
        const selectedStrokeIds = strokes
          .filter((stroke) => overlaps(strokeBounds(stroke), box))
          .map((stroke) => stroke.id);
        const selectedCoordinateIds = layerVisibility.coordinates
          ? coordinateSystems
              .filter((system) => overlaps(coordinateBounds(system), box))
              .map((system) => system.id)
          : [];
        const selectedStickyIds = layerVisibility.stickies
          ? stickies
              .filter((sticky) => overlaps(stickyBounds(sticky), box))
              .map((sticky) => sticky.id)
          : [];
        const selectedTextIds =
          layerVisibility.text &&
          pageText &&
          overlaps(pageTextBounds(pageText, pageTextSize, pageTextFrame), box)
            ? [PAGE_TEXT_SELECTION_ID]
            : [];
        const selectedImageIds = layerVisibility.background
          ? importedImages
              .filter((image) => overlaps(importedImageBounds(image), box))
              .map((image) => image.id)
          : [];
        setSelectedIds([
          ...selectedStrokeIds,
          ...selectedCoordinateIds,
          ...selectedStickyIds,
          ...selectedTextIds,
          ...selectedImageIds,
        ]);
        setSelectedCoordinateIds(selectedCoordinateIds);
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
    const liveStroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (!liveStroke) return;
    const settledPoints = settleLiveStroke(liveStroke.points);
    const points = (
      stabilization && !shapeSnappedRef.current ? straightenStroke(settledPoints) : settledPoints
    ).map((point) => ({
      ...point,
      x: Math.max(0, Math.min(PAGE_WIDTH, point.x)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, point.y)),
    }));
    commitLiveStroke({ ...liveStroke, points });
    setStrokes((current) => [...current, { ...liveStroke, points }]);
  }

  function settleLiveStroke(points: HandwritingPoint[]): HandwritingPoint[] {
    const stabilizer = liveStabilizerRef.current;
    liveStabilizerRef.current = null;
    return stabilizer ? [...points, ...stabilizer.finish()] : points;
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
        pageTextFrame,
        coordinateSystems,
        layerVisibility,
        layerOrder,
        images: importedImages,
        background,
        backgroundFrame,
      },
    ]);
    setStrokes(restoreStrokes(previous.strokes, strokes, remoteStrokeIdsRef.current));
    setStickies(previous.stickies);
    setPageText(previous.pageText);
    setPageTextSize(previous.pageTextSize);
    setPageTextFrame(previous.pageTextFrame);
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
        pageTextFrame,
        coordinateSystems,
        layerVisibility,
        layerOrder,
        images: importedImages,
        background,
        backgroundFrame,
      },
    ]);
    setStrokes(restoreStrokes(next.strokes, strokes, remoteStrokeIdsRef.current));
    setStickies(next.stickies);
    setPageText(next.pageText);
    setPageTextSize(next.pageTextSize);
    setPageTextFrame(next.pageTextFrame);
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
        ? [pageTextBounds(pageText, pageTextSize, pageTextFrame)]
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
      const scale = 3;
      temporaryCanvas.width = Math.ceil((bounds.width + padding * 2) * scale);
      temporaryCanvas.height = Math.ceil((bounds.height + padding * 2) * scale);
      const context = temporaryCanvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a seleção para OCR.");
      context.scale(scale, scale);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, bounds.width + padding * 2, bounds.height + padding * 2);
      context.translate(padding - bounds.x, padding - bounds.y);
      for (const stroke of selectedStrokes) drawStroke(context, stroke);

      // O Tesseract reconhece melhor tinta preta em fundo branco puro do que
      // os tons de papel da folha. Binarizamos a prévia sem alterar o desenho.
      const pixels = context.getImageData(0, 0, temporaryCanvas.width, temporaryCanvas.height);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index] ?? 255;
        const green = pixels.data[index + 1] ?? 255;
        const blue = pixels.data[index + 2] ?? 255;
        const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
        const value = luminance < 220 ? 0 : 255;
        pixels.data[index] = value;
        pixels.data[index + 1] = value;
        pixels.data[index + 2] = value;
        pixels.data[index + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
      const ocrImage = temporaryCanvas.toDataURL("image/png");

      const { createWorker, PSM } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        ...OCR_WORKER_OPTIONS,
        logger: (message) => setOcrProgress(Math.round(message.progress * 100)),
      });
      const parameters = {
        tessedit_char_whitelist:
          "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-=()[]{}.,/:^*xXyY",
        preserve_interword_spaces: "1",
      } as const;
      await worker.setParameters({ ...parameters, tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const blockResult = await worker.recognize(ocrImage);
      let recognized = normalizeMathOcrText(blockResult.data.text ?? "");
      const blockConfidence = Number(blockResult.data.confidence ?? 0);
      if (!recognized || blockConfidence < 35) {
        await worker.setParameters({ ...parameters, tessedit_pageseg_mode: PSM.SINGLE_LINE });
        const lineResult = await worker.recognize(ocrImage);
        const lineText = normalizeMathOcrText(lineResult.data.text ?? "");
        if (
          lineText &&
          (!recognized || Number(lineResult.data.confidence ?? 0) > blockConfidence)
        ) {
          recognized = lineText;
        }
      }
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

  function selectedItems() {
    const ids = new Set(selectedIds);
    return {
      ids,
      copy: copyItems({ strokes, stickies, coordinateSystems, images: importedImages }, ids),
    };
  }

  function copySelection(): boolean {
    const { copy } = selectedItems();
    if (selectionSize(copy) === 0) return false;
    selectionClipboard = copy;
    pasteCountRef.current = 0;
    setCanPaste(true);
    return true;
  }

  function cutSelection() {
    if (!copySelection()) return;
    deleteSelection();
  }

  function pasteSelection() {
    if (!selectionClipboard) return;
    remember();
    pasteCountRef.current += 1;
    const { items, ids } = pasteItems(
      selectionClipboard,
      PASTE_OFFSET * pasteCountRef.current,
      strokeId,
    );
    setStrokes((current) => [...current, ...items.strokes]);
    setStickies((current) => [...current, ...items.stickies]);
    setCoordinateSystems((current) => [...current, ...items.coordinateSystems]);
    setImportedImages((current) => [...current, ...items.images]);
    setSelectedIds(ids);
    setSelectedCoordinateIds(items.coordinateSystems.map((system) => system.id));
  }

  function duplicateSelection() {
    const { copy } = selectedItems();
    if (selectionSize(copy) === 0) return;
    remember();
    const { items, ids } = pasteItems(copy, PASTE_OFFSET, strokeId);
    setStrokes((current) => [...current, ...items.strokes]);
    setStickies((current) => [...current, ...items.stickies]);
    setCoordinateSystems((current) => [...current, ...items.coordinateSystems]);
    setImportedImages((current) => [...current, ...items.images]);
    setSelectedIds(ids);
    setSelectedCoordinateIds(items.coordinateSystems.map((system) => system.id));
  }

  function selectAll() {
    setTool("select");
    setSelectedIds([
      ...strokes.map((stroke) => stroke.id),
      ...(layerVisibility.coordinates ? coordinateSystems.map((system) => system.id) : []),
      ...(layerVisibility.stickies ? stickies.map((sticky) => sticky.id) : []),
      ...(layerVisibility.text && pageText ? [PAGE_TEXT_SELECTION_ID] : []),
      ...(layerVisibility.background ? importedImages.map((image) => image.id) : []),
    ]);
    setSelectedCoordinateIds(coordinateSystems.map((system) => system.id));
  }

  function rotateSelection(direction: -1 | 1) {
    const bounds = selectionBounds();
    if (!bounds) return;
    remember();
    const rotated = rotateItems(
      { strokes, stickies, coordinateSystems, images: importedImages },
      new Set(selectedIds),
      direction * 15,
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    );
    setStrokes([...rotated.strokes]);
    setStickies([...rotated.stickies]);
    setCoordinateSystems([...rotated.coordinateSystems]);
    setImportedImages([...rotated.images]);
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

  function setStickyMoving(sticky: HandwritingSticky) {
    setTool("select");
    setSelectedIds([sticky.id]);
    setSelectedCoordinateIds([]);
    setSelectionBox(stickyBounds(sticky));
    setSelectionPath(null);
    setStickyMenuId(null);
    setStickyColorMenuId(null);
  }

  function toggleLayerVisibility(layer: keyof HandwritingLayerVisibility) {
    remember();
    setLayerVisibility((current) => ({ ...current, [layer]: !current[layer] }));
  }

  function moveLayer(layer: HandwritingLayerKey, direction: -1 | 1) {
    const available = layerOrder.filter((key) => layerAvailability[key]);
    const visibleIndex = available.indexOf(layer);
    const swapWith = available[visibleIndex + direction];
    const index = layerOrder.indexOf(layer);
    const swapIndex = swapWith ? layerOrder.indexOf(swapWith) : -1;
    if (index < 0 || swapIndex < 0) return;
    remember();
    setLayerOrder((current) => {
      const next = [...current];
      [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
      return next;
    });
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

  function startStickyDrag(event: ReactPointerEvent<HTMLElement>, sticky: HandwritingSticky) {
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

  function moveSticky(event: ReactPointerEvent<HTMLElement>, sticky: HandwritingSticky) {
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
    event: Pick<PointerEvent, "clientX" | "clientY" | "pressure"> &
      Partial<Pick<PointerEvent, "tiltX" | "tiltY">>,
    measuredBounds?: DOMRect,
  ): HandwritingPoint {
    const canvas = writingCanvasRef.current;
    if (!canvas) return { x: writingWindowX, y: writingWindowY, pressure: 0.5 };
    const bounds = measuredBounds ?? canvas.getBoundingClientRect();
    return {
      tiltX: event.tiltX ?? 0,
      tiltY: event.tiltY ?? 0,
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
    // Na janela ampliada a tinta tem que ficar sob a caneta enquanto se escreve.
    // A inércia do estabilizador ao vivo, calibrada para a folha inteira, aparece
    // ampliada aqui e faz a tinta ficar atrás da ponta, então só se suaviza ao
    // terminar o traço.
    liveStabilizerRef.current = null;
    lastSampleAtRef.current = performance.now();
    scheduleLivePaint();
  }

  function moveWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    const liveStroke = liveStrokeRef.current;
    if (!liveStroke) return;
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const bounds = event.currentTarget.getBoundingClientRect();
    const points = (coalesced.length > 0 ? coalesced : [event.nativeEvent]).map((sample) =>
      writingPoint(sample, bounds),
    );
    const previous = liveStroke.points.at(-1);
    const added = points.reduce<HandwritingPoint[]>((accepted, point) => {
      const lastPoint = accepted.at(-1) ?? previous;
      if (
        !lastPoint ||
        pointDistance(lastPoint, point) >= 0.65 ||
        Math.abs(lastPoint.pressure - point.pressure) >= 0.015
      )
        accepted.push(point);
      return accepted;
    }, []);
    if (added.length === 0) return;
    liveStroke.points.push(...added);
    // A folha e a janela mostram a escrita enquanto ela acontece, desenhada por
    // inteiro a cada quadro, sem atualizar o estado a cada ponto.
    lastSampleAtRef.current = performance.now();
    scheduleLivePaint();
  }

  function finishWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    writingPointerRef.current = null;
    const liveStroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (liveStroke) {
      const points = stabilization ? straightenStroke(liveStroke.points) : liveStroke.points;
      commitLiveStroke({ ...liveStroke, points });
      setStrokes((current) => [...current, { ...liveStroke, points }]);
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    if (writingWindowAutoFollow && (relativeX > 0.82 || relativeY > 0.84)) advanceWritingWindow();
  }

  function goBackWritingWindow() {
    setWritingWindowX((current) => {
      const next = Math.max(0, current - 300);
      setWritingWindowStatus(
        `Coluna ${Math.floor((next - 100) / 300) + 1}, linha ${Math.floor((writingWindowY - 110) / 48) + 1}`,
      );
      return next;
    });
  }

  function nextWritingLine() {
    setWritingWindowX(100);
    setWritingWindowY((current) => Math.min(PAGE_HEIGHT - WRITING_WINDOW_HEIGHT, current + 48));
    setWritingWindowStatus(
      `Coluna 1, linha ${Math.floor((Math.min(PAGE_HEIGHT - WRITING_WINDOW_HEIGHT, writingWindowY + 48) - 110) / 48) + 1}`,
    );
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
      canvasSize,
      pageText,
      pageTextSize,
      pageTextFrame,
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
          ...point,
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
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, 1, PAGE_WIDTH, PAGE_HEIGHT);
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
      pageTextFrame,
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
        pageTextFrame,
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
      const printWindow = openPrintWindow();
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
        pageTextFrame,
      );
      downloadCanvasAsPdf(canvas, "folha-do-caderno.pdf");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível exportar o PDF.");
    }
  }

  function switchPage(navigate: () => void) {
    try {
      if (dirty) onSave(pageImage(), buildDocument());
      navigate();
      requestAnimationFrame(resetView);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar antes de trocar de folha.",
      );
    }
  }

  function resetView() {
    setZoom(1);
    const viewport = viewportRef.current;
    if (!viewport) return;
    // Use an immediate reset: smooth scrolling can leave the editor in an
    // intermediate position when the user starts drawing right away.
    viewport.scrollTo({ top: 0, left: 0, behavior: "auto" });
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
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
      copy: () => void copySelection(),
      cut: cutSelection,
      paste: pasteSelection,
      duplicate: duplicateSelection,
      selectAll,
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

  function save(closeAfter = true) {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError("Aguarde a folha carregar antes de salvar.");
      return;
    }
    try {
      const document = buildDocument();
      onSave(pageImage(), document);
      localStorage.removeItem(`helenastudy.handwriting.draft.${draftKey}`);
      setDraftStatus("Folha salva no caderno");
      setError("");
      if (closeAfter) onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a folha.");
    }
  }

  const displayWidth = Math.max(260, Math.round(fitWidth * zoom * (PAGE_WIDTH / 1200)));
  const wantedScale = pageRenderScale(
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
    displayWidth,
    PAGE_WIDTH,
    PAGE_HEIGHT,
  );
  useEffect(() => {
    if (wantedScale === renderScale) return;
    const timer = setTimeout(() => setRenderScale(wantedScale), 150);
    return () => clearTimeout(timer);
  }, [wantedScale, renderScale]);
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
  const layerAvailability: Record<HandwritingLayerKey, boolean> = {
    coordinates: coordinateSystems.length > 0,
    text: Boolean(pageText.trim()),
    strokes: strokes.length > 0,
    stickies: stickies.length > 0,
  };
  const hasBackgroundLayer = Boolean(background || importedImages.length > 0);
  const visibleLayerOrder = layerOrder.filter((layer) => layerAvailability[layer]);
  const showBrushPanel = tool === "pen" && !textMode && !writingWindowOpen;
  const showRulerPanel = tool === "ruler" && !textMode;
  const showCoordinatePanel = tool === "coordinates" && !textMode;
  const rightPanelCount =
    Number(showBrushPanel) +
    Number(showRulerPanel) +
    Number(showCoordinatePanel) +
    Number(layersOpen);

  return (
    <div
      className="handwriting-studio"
      data-mobile-drawer={mobileDrawer ?? "closed"}
      data-tool={textMode ? "text" : tool}
    >
      {phoneLayout && (
        <div className="notebook-mobile-dock" aria-label="Opções do editor">
          <button
            type="button"
            aria-expanded={mobileDrawer === "tool"}
            onClick={() => setMobileDrawer(mobileDrawer === "tool" ? null : "tool")}
          >
            <PaperEditorIcon name="pen" />
            <span>Opções</span>
          </button>
          <button
            type="button"
            aria-expanded={mobileDrawer === "history"}
            onClick={() => setMobileDrawer(mobileDrawer === "history" ? null : "history")}
          >
            <PaperEditorIcon name="undo" />
            <span>Histórico e zoom</span>
          </button>
          {mobileDrawer && (
            <button
              type="button"
              aria-label="Recolher opções"
              onClick={() => setMobileDrawer(null)}
            >
              <PaperEditorIcon name="close" />
            </button>
          )}
        </div>
      )}
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
        <HandwritingToolGroup
          textMode={textMode}
          tool={tool}
          rulerUnit={rulerUnit}
          layersOpen={layersOpen}
          writingWindowOpen={writingWindowOpen}
          onSelectTool={setTool}
          onToggleLayers={() => {
            setLayersOpen((open) => !open);
            setMobileDrawer("tool");
          }}
          onToggleText={() => {
            setMobileDrawer(null);
            setWritingWindowOpen(false);
            setTextMode((active) => !active);
          }}
          onAddSticky={() => addSticky()}
          onToggleWritingWindow={() => {
            setTextMode(false);
            setWritingWindowOpen((open) => !open);
          }}
        />

        {(selectedIds.length > 0 || tool === "select") && (
          <HandwritingSelectionActions
            tool={tool}
            selectionMode={selectionMode}
            onSelectionModeChange={setSelectionMode}
            selectedIds={selectedIds}
            selectedCoordinateIds={selectedCoordinateIds}
            canAlign={strokes.some((stroke) => selectedIds.includes(stroke.id))}
            onAlign={alignSelection}
            onScale={scaleSelection}
            onDelete={deleteSelection}
            hasBackground={Boolean(background)}
            onRemoveBackground={removeBackground}
            hasSelectedImages={importedImages.some((image) => selectedIds.includes(image.id))}
            onRemoveSelectedImages={removeSelectedImages}
            onRotate={rotateSelection}
            onCopy={copySelection}
            onCut={cutSelection}
            onPaste={pasteSelection}
            onDuplicate={duplicateSelection}
            onSelectAll={selectAll}
            canPaste={canPaste}
            hasPageText={Boolean(pageText)}
            pageTextSize={pageTextSize}
            onChangeTextSize={(delta) => {
              remember();
              setPageTextSize((size) =>
                delta < 0 ? Math.max(16, size + delta) : Math.min(72, size + delta),
              );
            }}
            hasSelectedCoordinateSystem={Boolean(selectedCoordinateSystem)}
            selectedStrokeCount={selectedStrokeCount}
            formulaDraft={formulaDraft}
            onFormulaDraftChange={setFormulaDraft}
            ocrBusy={ocrBusy}
            ocrProgress={ocrProgress}
            onUseCoordinateFormula={useCoordinateFormula}
            onRecognizeFormula={recognizeSelectedFormula}
            onInsertFormula={insertFormulaAnnotation}
          />
        )}

        <HandwritingInkOptions
          tool={tool}
          color={color}
          onColorChange={setColor}
          width={width}
          onWidthChange={setWidth}
        />

        <HandwritingHistoryBar
          textMode={textMode}
          textAutoCorrect={textAutoCorrect}
          onToggleAutoCorrect={() => setTextAutoCorrect(!textAutoCorrect)}
          zoom={zoom}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          canClear={
            strokes.length > 0 ||
            stickies.length > 0 ||
            coordinateSystems.length > 0 ||
            pageText.length > 0
          }
          onClear={clearPage}
        />

        <NotebookFileActions
          settings={<NotebookSettings preferences={preferences} onChange={changePreference} />}
          pages={notebookPages}
          currentPageId={currentPageId ?? draftKey}
          currentImage={pageImage}
          onUpload={() => setFileAction("import")}
          onSave={() => save(false)}
          onPng={exportPng}
          onPdf={exportPdf}
          onPrint={printPage}
          menuOpen={fileMenuOpen}
          onMenuChange={(open) => {
            setFileMenuOpen(open);
            if (open) setPaperSectionsOpen({ paper: false, color: false });
          }}
        />
      </div>

      {writingWindowOpen && (
        <HandwritingWritingWindow
          canvasRef={writingCanvasRef}
          status={writingWindowStatus}
          autoFollow={writingWindowAutoFollow}
          onAutoFollowChange={setWritingWindowAutoFollow}
          onStart={startWritingWindow}
          onMove={moveWritingWindow}
          onFinish={finishWritingWindow}
          onBack={goBackWritingWindow}
          onAdvance={advanceWritingWindow}
          onNextLine={nextWritingLine}
        />
      )}

      <div
        className={`handwriting-workspace${rightPanelCount ? " handwriting-workspace--brushes" : ""}${rightPanelCount > 1 ? " handwriting-workspace--panels-two" : ""}`}
        inert={fileAction === "import"}
      >
        <HandwritingPaperPicker
          paper={paper}
          paperColor={paperColor}
          sectionsOpen={paperSectionsOpen}
          onToggleSection={(section) => {
            setFileMenuOpen(false);
            setPaperSectionsOpen((current) => ({
              paper: section === "paper" ? !current.paper : false,
              color: section === "color" ? !current.color : false,
            }));
          }}
          onSelectPaper={(next) => {
            selectPaper(next);
            setPaperSectionsOpen({ paper: false, color: false });
          }}
          onSelectPaperColor={(next) => {
            selectPaperColor(next);
            setPaperSectionsOpen({ paper: false, color: false });
          }}
        />

        <div
          className={`handwriting-viewport${paper === "board" ? " handwriting-viewport--board" : ""}`}
          ref={viewportRef}
        >
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
            {layerVisibility.background &&
              background &&
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
                      left: `${(frame.x / PAGE_WIDTH) * 100}%`,
                      top: `${(frame.y / PAGE_HEIGHT) * 100}%`,
                      width: `${(frame.width / PAGE_WIDTH) * 100}%`,
                      height: `${(frame.height / PAGE_HEIGHT) * 100}%`,
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
                    left: `${(image.x / PAGE_WIDTH) * 100}%`,
                    top: `${(image.y / PAGE_HEIGHT) * 100}%`,
                    width: `${(image.width / PAGE_WIDTH) * 100}%`,
                    height: `${(image.height / PAGE_HEIGHT) * 100}%`,
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
                    {rulerKind === "circle" ? (
                      <g>
                        <circle
                          cx={start.x}
                          cy={start.y}
                          r={Math.max(1, length)}
                          fill="#FACC15"
                          fillOpacity="0.2"
                          stroke="#DFA900"
                          strokeWidth="10"
                        />
                        <circle
                          cx={start.x}
                          cy={start.y}
                          r={Math.max(1, length)}
                          fill="none"
                          stroke="#292432"
                          strokeWidth="2"
                          strokeDasharray="2 12"
                        />
                        <line
                          x1={start.x - length}
                          y1={start.y}
                          x2={start.x + length}
                          y2={start.y}
                          stroke="#292432"
                          strokeWidth="2"
                          strokeDasharray="8 8"
                          opacity="0.7"
                        />
                      </g>
                    ) : (
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
                    )}
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
                        {rulerMeasurement(
                          rulerKind === "circle" ? length * 2 : length,
                          rulerUnit,
                          rulerKind,
                        )}
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
            <canvas
              ref={liveCanvasRef}
              className="handwriting-live-layer"
              width={PAGE_WIDTH}
              height={PAGE_HEIGHT}
              aria-hidden="true"
            />
            {textMode && layerVisibility.text && (
              <div
                className="handwriting-text-frame"
                style={{
                  left: `${(pageTextFrame.x / PAGE_WIDTH) * 100}%`,
                  top: `${(pageTextFrame.y / PAGE_HEIGHT) * 100}%`,
                  width: `${(pageTextFrame.width / PAGE_WIDTH) * 100}%`,
                  height: `${(pageTextFrame.height / PAGE_HEIGHT) * 100}%`,
                }}
                onPointerDown={startTextFrameDrag}
                onPointerMove={moveTextFrame}
                onPointerUp={() => (textFrameDrag.current = null)}
                onPointerCancel={() => (textFrameDrag.current = null)}
              >
                <button
                  type="button"
                  className="handwriting-text-frame-handle handwriting-text-frame-handle--move"
                  data-text-frame-handle="move"
                  aria-label="Mover caixa de texto"
                  onKeyDown={adjustTextFrameWithKeyboard}
                >
                  <PaperEditorIcon name="hand" />
                </button>
                <div className="handwriting-text-frame-size" aria-label="Tamanho do texto">
                  <button
                    type="button"
                    aria-label="Diminuir tamanho do texto"
                    disabled={pageTextSize <= 16}
                    onClick={() => {
                      remember();
                      setPageTextSize((size) => Math.max(16, size - 2));
                    }}
                  >
                    A−
                  </button>
                  <span>{pageTextSize}px</span>
                  <button
                    type="button"
                    aria-label="Aumentar tamanho do texto"
                    disabled={pageTextSize >= 72}
                    onClick={() => {
                      remember();
                      setPageTextSize((size) => Math.min(72, size + 2));
                    }}
                  >
                    A+
                  </button>
                </div>
                <textarea
                  className="handwriting-full-page-text"
                  aria-label="Texto da página inteira"
                  placeholder="Escreva aqui. Arraste as alças para mover e ajustar a caixa."
                  value={pageText}
                  spellCheck
                  lang="pt-BR"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  wrap="soft"
                  style={{
                    fontSize: `${(pageTextSize * displayWidth) / PAGE_WIDTH}px`,
                    lineHeight: `${(pageTextSize * (40 / 28) * displayWidth) / PAGE_WIDTH}px`,
                    color: paperColor === "night" ? "#fff9ef" : "#17151c",
                  }}
                  onFocus={() => remember()}
                  onBlur={() => {
                    if (!textAutoCorrect) return;
                    const corrected = reviewPortugueseText(pageText);
                    if (corrected !== pageText) {
                      remember();
                      setPageText(corrected);
                    }
                  }}
                  onChange={(event) => {
                    const lines = pageTextLines(
                      event.target.value.replace(/\t/g, "    "),
                      pageTextSize,
                      pageTextFrame.width,
                    );
                    if (
                      lines.length > Math.floor(pageTextFrame.height / (pageTextSize * (40 / 28)))
                    ) {
                      setError("Esta caixa está completa. Aumente-a ou crie outra folha.");
                      return;
                    }
                    setError("");
                    setPageText(event.target.value.replace(/\t/g, "    "));
                    setRedoStack([]);
                  }}
                />
                <button
                  type="button"
                  className="handwriting-text-frame-handle handwriting-text-frame-handle--resize"
                  data-text-frame-handle="resize"
                  aria-label="Redimensionar caixa de texto"
                  onKeyDown={adjustTextFrameWithKeyboard}
                >
                  <PaperEditorIcon name="resize" />
                </button>
              </div>
            )}
            {layerVisibility.stickies &&
              stickies.map((sticky) => (
                <HandwritingStickyNote
                  key={sticky.id}
                  sticky={sticky}
                  pageWidth={PAGE_WIDTH}
                  pageHeight={PAGE_HEIGHT}
                  isSelected={selectedIds.includes(sticky.id)}
                  ignorePointer={tool === "eraser" && sticky.kind === "text"}
                  menuOpen={stickyMenuId === sticky.id}
                  colorMenuOpen={stickyColorMenuId === sticky.id}
                  textAutoCorrect={textAutoCorrect}
                  onRemember={remember}
                  onUpdate={(change) => updateSticky(sticky.id, change)}
                  onDragStart={startStickyDrag}
                  onDragMove={moveSticky}
                  onDragEnd={() => {
                    stickyDragRef.current = null;
                  }}
                  onResizeStart={startStickyResize}
                  onResizeMove={resizeSticky}
                  onResizeEnd={() => {
                    stickyResizeRef.current = null;
                  }}
                  onToggleMenu={() => {
                    setStickyMenuId((current) => (current === sticky.id ? null : sticky.id));
                    setStickyColorMenuId(null);
                  }}
                  onToggleColorMenu={() =>
                    setStickyColorMenuId((current) => (current === sticky.id ? null : sticky.id))
                  }
                  onMoveMode={() => setStickyMoving(sticky)}
                  onToggleChecklist={() => {
                    toggleStickyChecklist(sticky);
                    setStickyMenuId(null);
                  }}
                  onChangeColor={(nextColor) => {
                    remember();
                    updateSticky(sticky.id, { color: nextColor });
                    setStickyMenuId(null);
                    setStickyColorMenuId(null);
                  }}
                  onLayer={(direction) => moveStickyLayer(sticky.id, direction)}
                  onRemove={() => {
                    removeSticky(sticky.id);
                    setStickyMenuId(null);
                  }}
                  onUpdateChecklistItem={(itemId, change) =>
                    updateChecklistItem(sticky, itemId, change)
                  }
                  onRemoveChecklistItem={(itemId) => removeChecklistItem(sticky, itemId)}
                  onAddChecklistItem={() => addChecklistItem(sticky)}
                />
              ))}
          </div>
        </div>
        {showBrushPanel && (
          <HandwritingBrushPanel brush={brush} color={color} onBrushChange={setBrush} />
        )}
        {showRulerPanel && (
          <HandwritingRulerPanel
            rulerUnit={rulerUnit}
            rulerKind={rulerKind}
            onRulerUnitChange={setRulerUnit}
            onRulerKindChange={setRulerKind}
          />
        )}
        {showCoordinatePanel && (
          <HandwritingCoordinatePanel
            coordinateStep={coordinateStep}
            onStepChange={setCoordinateStep}
            coordinateMeasurements={coordinateMeasurements}
            onMeasurementsChange={setCoordinateMeasurements}
            equalCoordinateAxes={equalCoordinateAxes}
            onEqualAxesChange={setEqualCoordinateAxes}
            inspectedCoordinateStats={inspectedCoordinateStats}
            isLivePreview={Boolean(liveCoordinateStats)}
          />
        )}
        {layersOpen && (
          <HandwritingLayerPanel
            hasBackgroundLayer={hasBackgroundLayer}
            layerVisibility={layerVisibility}
            visibleLayerOrder={visibleLayerOrder}
            onToggleLayer={toggleLayerVisibility}
            onMoveLayer={moveLayer}
          />
        )}
      </div>

      {/Falha|Sem espaço/.test(draftStatus) && <p role="alert">{draftStatus}</p>}
      {preferenceError && <p role="status">{preferenceError}</p>}
      {error && <p className="capture-error">{error}</p>}
      {onSelectPage && onCreatePage && (
        <NotebookPageBook
          pages={notebookPages}
          currentPageId={currentPageId ?? draftKey}
          inert={fileAction === "import"}
          onSelect={(id) => switchPage(() => onSelectPage?.(id))}
          onCreate={() => switchPage(() => onCreatePage())}
          {...(onRemovePage ? { onRemove: onRemovePage } : {})}
        />
      )}
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
