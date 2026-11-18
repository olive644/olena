import { pencilCursor } from "./handwriting-pencil-cursor";
import { writingViewSize, type WritingView } from "./handwriting-writing-view";
import { createPortal } from "react-dom";
import { ShelfToolIcon } from "./shelf-tool-icon";
import { useNotebookShortcuts } from "../data/notebook-shortcuts";
import { pickAt } from "./handwriting-selection-scene";
import { PAGE_TEXT_SELECTION_ID } from "./handwriting-types";
import { HandwritingSelectionToolbar } from "./handwriting-selection-toolbar";
import { pickInBox } from "./handwriting-selection-scene";
import { HandwritingToolTips } from "./handwriting-tool-tips";
import { PaperDigits } from "./paper-digits";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { uiText, useLanguage, uiLocale } from "../i18n/runtime";
import { useMiddleMousePan } from "../hooks/use-middle-mouse-pan";
import { useNotebookPreferences } from "../data/notebook-preferences";
import { isMotionReduced } from "../data/accessibility-preferences";
import { NotebookSettings } from "./notebook-settings";
import { NotebookFileActions } from "./notebook-file-actions";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperCloseIcon } from "./paper-close-icon";
import type { StudyNote } from "../domain/workspace";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { isHandwritingDocument } from "../data/local-workspace";
import { mergeHandwriting } from "../domain/merge-handwriting";
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
  DEFAULT_LIVE_STABILIZER,
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
import { HandwritingPaperPicker, type NotebookPaperChange } from "./handwriting-paper-picker";
import { HandwritingWritingWindow } from "./handwriting-writing-window";
import { HandwritingColorDock } from "./handwriting-color-dock";
import { HandwritingPenMeterPanel } from "./handwriting-pen-meter-panel";
import { useHandwritingPenMeter } from "./use-handwriting-pen-meter";
import { HandwritingInkOptions } from "./handwriting-ink-options";
import { HandwritingSelectionActions } from "./handwriting-selection-actions";
import { OCR_WORKER_OPTIONS } from "./handwriting-ocr";
import { shouldIgnoreTouch, type PalmState } from "./handwriting-palm";
import { restoreStrokes } from "./handwriting-undo";
import type { RemoteCursor } from "../hooks/use-notebook-collaboration";
import { cursorColor } from "./handwriting-cursor";
import { canonicalShape, recognizeShape, type ShapeKind } from "./handwriting-shapes";
import { createShapeAdjuster, type ShapeAdjuster } from "./handwriting-shape-adjust";
import { HandwritingShapeInsert, type InsertKind } from "./handwriting-shape-insert";
import { predictedTail, withPredictedTail } from "./handwriting-prediction";
import { denoiseMousePath } from "./handwriting-denoise";
import { recognizeScribble, scribbleTargets } from "./handwriting-scribble";
import { isInFoldCorner } from "./handwriting-fold";
import { compactPoints } from "./handwriting-precision";
import { useSelectionActions } from "../hooks/use-selection-actions";
import { useSelectionGesture } from "../hooks/use-selection-gesture";
import { usePinchZoom } from "../hooks/use-pinch-zoom";
import { useEditorShortcuts } from "../hooks/use-editor-shortcuts";
import { renderPageScene, type PageScene } from "./handwriting-page-scene";
import {
  drawSelectionOverlay,
  moveCoordinateSystems,
  moveImages,
  moveStickies,
  moveStrokes,
  moveTextFrame as shiftTextFrame,
  type SelectionScene,
} from "./handwriting-selection-scene";
import {
  combineWithRecentLines,
  pruneRecentLines,
  type RecentLine,
} from "./handwriting-multi-stroke";
import { MAX_CONTROL_POINTS, dedupeControls, splinePoints } from "./handwriting-spline";
import { clampSpaceShift, itemsBelowLine } from "./handwriting-vertical-space";
import { hitSelectionHandle } from "./handwriting-selection-ops";
import { eraseInkArea, eraseWholeStrokes } from "./handwriting-eraser";
import {
  isPenBarrelButton,
  isPenEraserTip,
  isPenSecondButton,
  pointerSamples,
} from "./handwriting-pointer";
import {
  newRemoteStrokes,
  partialStroke,
  planReveal,
  revealProgress,
  shouldReveal,
  type RevealingStroke,
} from "./handwriting-reveal";

import { HandwritingStickyNote } from "./handwriting-sticky-note";
import {
  HandwritingBrushPanel,
  HandwritingToolCase,
  HandwritingCoordinatePanel,
  HandwritingLayerPanel,
  HandwritingRulerPanel,
} from "./handwriting-side-panels";
import { HandwritingToolGroup } from "./handwriting-tool-group";
import { STICKY_MIN_WIDTH, STICKY_MIN_HEIGHT, BASE_DISPLAY_WIDTH } from "./handwriting-types";
import type {
  HandwritingTool,
  PaperStyle,
  Stroke,
  Snapshot,
  SelectionMode,
} from "./handwriting-types";
import {
  stickyWidth,
  stickyHeight,
  pointDistance,
  strokeBounds,
  coordinateBounds,
  stickyBounds,
  unionBounds,
} from "./handwriting-geometry";
import {
  canvasPoint,
  clearPageCanvas,
  drawEraserPreview,
  drawHoverPreview,
  drawStroke,
  pageContext,
  pageRenderScale,
  sizePageCanvas,
} from "./handwriting-canvas";
import { exportPage, downloadCanvasAsPdf } from "./handwriting-export";
import { brandedExportCanvas, loadPaperExportMascot } from "../data/paper-export-art";
import { readDraft, strokeId } from "./handwriting-draft";

const PageImport = lazy(() =>
  import("./page-import").then((module) => ({ default: module.PageImport })),
);

type HandwritingStudioProps = {
  captureActions?: import("react").ReactNode;
  cloud?: CloudSyncState;
  notebookPages?: StudyNote[];
  /** Troca o papel e/ou a cor de todas as folhas do caderno; devolve quantas folhas mudaram. */
  onApplyPaperToNotebook?: (change: NotebookPaperChange) => Promise<number> | number;
  currentPageId?: string;
  onSelectPage?: (id: string) => void;
  onCreatePage?: () => void;
  onRemovePage?: (id: string) => void;
  onMovePage?: (id: string, direction: -1 | 1) => void;
  onAutosave?: (dataUrl: string, document: HandwritingDocument) => void;
  onClose: () => void;
  flushOnClose?: { current: (() => boolean) | null };
  onSave: (dataUrl: string, document: HandwritingDocument) => void;
  onConfirmSave?: (document: HandwritingDocument) => Promise<void>;
  initialDocument?: HandwritingDocument;
  draftKey: string;
  onDirtyChange?: (dirty: boolean) => void;
  onDraftChange?: (document: HandwritingDocument) => void;
  onImportPages?: (pages: ImportedPage[]) => void;
  remoteDocument?: HandwritingDocument;
  remoteAuthor?: string;
  // Cursores dos colegas e envio do meu, em unidades da folha (só em cadernos compartilhados).
  remoteCursors?: readonly RemoteCursor[];
  onCursorMove?: (x: number, y: number) => void;
  collaborationActivity?: string;
};

// Pausa, em milissegundos, para a forma desenhada ser acertada.
const SHAPE_HOLD_MS = 600;
// Tremor da mão parada: até esta distância (em pixels da tela) a pausa continua valendo.
const SHAPE_HOLD_JITTER_PX = 3;

export function HandwritingStudio({
  captureActions,
  notebookPages = [],
  onApplyPaperToNotebook,
  currentPageId,
  onSelectPage,
  onCreatePage,
  onRemovePage,
  onMovePage,
  onAutosave,
  onClose,
  flushOnClose,
  onSave,
  onConfirmSave,
  initialDocument,
  draftKey,
  onDirtyChange,
  onDraftChange,
  onImportPages,
  remoteDocument,
  remoteAuthor,
  remoteCursors,
  onCursorMove,
  collaborationActivity,
}: HandwritingStudioProps) {
  const currentUiLanguage = useLanguage();

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
  const objectClickRef = useRef<{ id: string; x: number; y: number } | null>(null);

  function editObject(id: string, x?: number, y?: number) {
    setEditingTextId(id === PAGE_TEXT_SELECTION_ID ? null : id);
    setTextMode(true);
    requestAnimationFrame(() => {
      const root = canvasRef.current?.parentElement;
      const at = x !== undefined && y !== undefined ? document.elementFromPoint?.(x, y) : null;
      const input =
        at instanceof HTMLTextAreaElement || at instanceof HTMLInputElement
          ? at
          : id === PAGE_TEXT_SELECTION_ID
            ? root?.querySelector(".handwriting-full-page-text")
            : root?.querySelector(
                '[data-sticky-id="' +
                  CSS.escape(id) +
                  '"] textarea, [data-sticky-id="' +
                  CSS.escape(id) +
                  '"] input',
              );
      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) input.focus();
    });
  }
  const paperTransition = useRef<Animation | null>(null);

  function animatePaperChange() {
    paperTransition.current?.cancel();
    const source = canvasRef.current;
    const sheet = source?.closest(".handwriting-page-shell");
    if (!source || !sheet || isMotionReduced() || !sheet.animate) return;
    const previous = document.createElement("canvas");
    previous.width = Math.min(source.width, 1600);
    previous.height = Math.round((source.height * previous.width) / source.width);
    const context = previous.getContext("2d");
    if (!context) return;
    context.drawImage(source, 0, 0, previous.width, previous.height);
    previous.className = "handwriting-paper-transition";
    previous.setAttribute("aria-hidden", "true");
    sheet.append(previous);
    const animation = previous.animate(
      [
        { clipPath: "inset(0 0 0 0)", opacity: 1 },
        { clipPath: "inset(0 0 0 100%)", opacity: 0 },
      ],
      { duration: 420, easing: "ease-in-out" },
    );
    paperTransition.current = animation;
    void animation.finished.then(
      () => previous.remove(),
      () => previous.remove(),
    );
  }
  const liveStrokeRef = useRef<Stroke | null>(null);
  const liveStabilizerRef = useRef<LiveStabilizer | null>(null);
  const writingCanvasRef = useRef<HTMLCanvasElement>(null);
  // Camada de tinta ao vivo: o traço em andamento é redesenhado por inteiro a cada
  // quadro aqui, e só vai para a folha ao soltar a caneta. Assim o que se vê
  // enquanto se escreve é exatamente o traço final, sem o salto ao terminar.
  const coordinateCanvasRef = useRef<HTMLCanvasElement>(null);
  const textCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveFrameRef = useRef<number | null>(null);
  const paintLiveRef = useRef<() => void>(() => undefined);
  // Traços de colegas em revelação: são escritos na camada ao vivo, ao longo do
  // próprio caminho, e só entram na folha quando terminam.
  const revealsRef = useRef<RevealingStroke[]>([]);
  const writingToolRef = useRef<"pen" | "highlighter" | "eraser">("pen");
  const writingPointerRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const middleMousePan = useMiddleMousePan();
  const drawingRef = useRef(false);
  const [brush, setBrush] = useState<NonNullable<Stroke["brush"]>>("fine");
  const [dash, setDash] = useState<Stroke["dash"]>(undefined);
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>("cm");
  const [rulerKind, setRulerKind] = useState<RulerKind>("straight");
  const [coordinateStep, setCoordinateStep] = useState<1 | 2 | 5 | 10>(1);
  const { preferences, changePreference, preferenceError } = useNotebookPreferences();
  const { settings: shortcutSettings } = useNotebookShortcuts();
  const {
    stabilization,
    shapeSnap,
    scribbleErase,
    inkPrediction,
    penHoverPreview,
    penDiagnostics,
    penOnly,
    textAutoCorrect,
    coordinateMeasurements,
    equalCoordinateAxes,
  } = preferences;
  const penMeter = useHandwritingPenMeter(penDiagnostics);
  const setCoordinateMeasurements = (value: boolean) =>
    changePreference("coordinateMeasurements", value);
  const setEqualCoordinateAxes = (value: boolean) => changePreference("equalCoordinateAxes", value);
  const [fileAction, setFileAction] = useState<"import" | "export" | null>(null);
  type Upload = {
    id: string;
    file: File;
    name?: string;
    preview?: { image: string; width: number; height: number };
    error?: string;
  };
  const [uploads, setUploads] = useState<Upload[]>([]);
  const decodedUploads = useRef(new Map<string, HTMLImageElement>());
  const uploadQueue = useRef(Promise.resolve());
  const uploadCount = useRef(0);
  const [uploadMenu, setUploadMenu] = useState<string>();
  const [uploadMenuAnchor, setUploadMenuAnchor] = useState<DOMRect>();
  const [uploadView, setUploadView] = useState<"actions" | "rename" | "details" | "remove">(
    "actions",
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dropPoint, setDropPoint] = useState<HandwritingPoint>();
  const [incomingFile, setIncomingFile] = useState<File>();
  function addUploads(files: File[]) {
    const items: Upload[] = files.slice(0, 20 - uploadCount.current).map((file) => {
      const pdf = file.name.toLowerCase().endsWith(".pdf");
      const limit = pdf ? 20 : 10;
      const error =
        !pdf && !["image/png", "image/jpeg", "image/webp"].includes(file.type)
          ? uiText(1879)
          : !file.size || file.size > limit * 1024 * 1024
            ? "Limite por arquivo: " + limit + " MB."
            : "";
      return { id: strokeId(), file, ...(error ? { error } : {}) };
    });
    uploadCount.current += items.length;
    setError(items.length < files.length ? "Limite de 20 arquivos por sessão." : "");
    setUploads((current) => [...current, ...items]);
    for (const item of items) {
      if (item.error) continue;
      uploadQueue.current = uploadQueue.current.then(async () => {
        let result: Pick<Upload, "preview" | "error">;
        try {
          const { prepareUploadImage } = await import("./page-import");
          const preview = await prepareUploadImage(item.file);
          if (!item.file.name.toLowerCase().endsWith(".pdf")) {
            const image = new Image();
            image.src = preview.image;
            await image.decode();
            decodedUploads.current.set(preview.image, image);
          }
          result = { preview };
        } catch (caught) {
          result = { error: caught instanceof Error ? caught.message : uiText(798) };
        }
        setUploads((current) =>
          current.map((entry) => (entry.id === item.id ? { ...entry, ...result } : entry)),
        );
      });
    }
  }

  function placeUpload(image: string, width: number, height: number, point?: HandwritingPoint) {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current?.getBoundingClientRect();
    const bounds = canvas?.getBoundingClientRect();
    const center =
      point ??
      (canvas && viewport && bounds
        ? canvasPoint(canvas, {
            clientX:
              (Math.max(bounds.left, viewport.left) + Math.min(bounds.right, viewport.right)) / 2,
            clientY:
              (Math.max(bounds.top, viewport.top) + Math.min(bounds.bottom, viewport.bottom)) / 2,
            pressure: 0.5,
          })
        : { x: PAGE_WIDTH / 2, y: PAGE_HEIGHT / 2 });
    if (importedImages.length >= 20) {
      setError(uiText(1709));
      return;
    }
    const scale = Math.min(1, PAGE_WIDTH / width, PAGE_HEIGHT / height);
    width *= scale;
    height *= scale;
    const id = strokeId();
    remember();
    setImportedImages((current) =>
      current.length >= 20
        ? current
        : [
            ...current,
            {
              id,
              dataUrl: image,
              width,
              height,
              x: Math.max(0, Math.min(PAGE_WIDTH - width, center.x - width / 2)),
              y: Math.max(0, Math.min(PAGE_HEIGHT - height, center.y - height / 2)),
            },
          ],
    );
    setLayerVisibility((current) => ({ ...current, background: true }));
    setTool("select");
    setSelectedIds([id]);
    setSelectedCoordinateIds([]);
    setUploadOpen(false);
    setError("");
  }

  function insertUpload({ file, preview }: Upload, point?: HandwritingPoint) {
    if (!preview) return;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setDropPoint(point);
      setIncomingFile(file);
      setUploadOpen(false);
      setFileAction("import");
      return;
    }
    placeUpload(preview.image, preview.width, preview.height, point);
  }

  function closeImport() {
    setIncomingFile(undefined);
    setDropPoint(undefined);
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
  const [decodedImages, setDecodedImages] = useState(new Map<string, HTMLImageElement>());
  useEffect(() => {
    let cancelled = false;
    const sources = [...new Set(importedImages.map((entry) => entry.dataUrl))];
    for (const source of sources) {
      if (decodedImages.has(source) || decodedUploads.current.has(source)) continue;
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          setDecodedImages((current) => new Map(current).set(source, image));
        }
      };
      image.src = source;
    }
    return () => {
      cancelled = true;
    };
  }, [importedImages, decodedImages]);
  const renderableImportedImages = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- Used by the imperative editor effects and pointer handlers.
      importedImages.flatMap((entry) => {
        const image = decodedUploads.current.get(entry.dataUrl) ?? decodedImages.get(entry.dataUrl);
        return image
          ? [
              {
                id: entry.id,
                image,
                frame: entry,
                ...(entry.rotation === undefined ? {} : { rotation: entry.rotation }),
              },
            ]
          : [];
      }),
    [importedImages, decodedImages],
  );
  const importedImagesReady = renderableImportedImages.length === importedImages.length;
  const [rulerMeasure, setRulerMeasure] = useState<{
    start: HandwritingPoint;
    end: HandwritingPoint;
  } | null>(null);
  const rulerMeasureRef = useRef<{ start: HandwritingPoint; end: HandwritingPoint } | null>(null);
  const [coordinateMeasure, setCoordinateMeasure] = useState<{
    start: HandwritingPoint;
    end: HandwritingPoint;
  } | null>(null);
  // Espaço vertical: `y` é a linha de corte e `shift` o quanto abrir (positivo) ou fechar.
  const [spaceDrag, setSpaceDrag] = useState<{ y: number; shift: number } | null>(null);
  const spaceDragRef = useRef<{ y: number; shift: number } | null>(null);
  const [spaceGuide, setSpaceGuide] = useState<number | null>(null);
  // Curva: pontos de controle já marcados, o ponto em arrasto (ainda não marcado) e o cursor do
  // teclado. `curveClickRef` guarda o último toque para reconhecer o toque duplo que conclui.
  const [curveControls, setCurveControls] = useState<HandwritingPoint[]>([]);
  const [curveDrag, setCurveDrag] = useState<HandwritingPoint | null>(null);
  const [curveCursor, setCurveCursor] = useState<HandwritingPoint | null>(null);
  const curveClickRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const panRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const eraserChangedRef = useRef(false);
  const eraserPointRef = useRef<HandwritingPoint | null>(null);
  const eraseQueueRef = useRef<HandwritingPoint[]>([]);
  const eraseFrameRef = useRef<number | null>(null);
  const flushEraseRef = useRef<() => void>(() => {});
  useEffect(
    () => () => {
      if (eraseFrameRef.current !== null) cancelAnimationFrame(eraseFrameRef.current);
    },
    [],
  );
  const activeToolRef = useRef<HandwritingTool>("pen");
  const penDetectedRef = useRef(false);
  // Ids dos traços que chegaram de colegas: desfazer e refazer não podem apagá-los.
  const remoteStrokeIdsRef = useRef(new Set<string>());
  // "Segurar para acertar": depois de uma pausa no fim do traço, a forma reconhecida substitui o
  // rabisco e o resto do gesto é ignorado até a caneta ser solta.
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shapeSnappedRef = useRef(false);
  // Tipo da forma em que o "segurar para acertar" transformou o traço de agora, e as retas
  // acertadas há pouco: uma nova reta pode fechar com elas um triângulo ou um retângulo.
  const shapeKindRef = useRef<ShapeKind | null>(null);
  // Depois de acertar, arrastar de novo refaz a forma (tamanho, giro, ângulo) sem levantar a caneta.
  const shapeAdjusterRef = useRef<ShapeAdjuster | null>(null);
  const holdAnchorRef = useRef<HandwritingPoint | null>(null);
  const [shapeBadge, setShapeBadge] = useState<{ kind: ShapeKind; detail: string } | null>(null);
  const recentLinesRef = useRef<RecentLine[]>([]);
  // Ponta prevista pelo navegador: só é desenhada na tela, nunca entra no traço.
  const predictedRef = useRef<HandwritingPoint[]>([]);
  // Ponto onde a caneta paira sem tocar a folha (prévia da ponta); nulo quando não paira,
  // quando solta a folha ou assim que começa a escrever de verdade.
  const hoverPointRef = useRef<HandwritingPoint | null>(null);
  // Posição do anel da borracha enquanto se apaga (o gesto não tem traço ao vivo).
  const eraserCursorRef = useRef<HandwritingPoint | null>(null);
  const palmRef = useRef<PalmState>({ penDown: false, lastPenAt: null });
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
  const [rotationSide, setRotationSide] = useState<"top" | "left" | "right">("top");
  const [copiedTextStyle, setCopiedTextStyle] = useState<{ ink: string; textSize: number } | null>(
    null,
  );
  const [styleMessage, setStyleMessage] = useState("");
  useEffect(() => {
    if (!styleMessage || copiedTextStyle) return;
    const timeout = window.setTimeout(() => setStyleMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [styleMessage, copiedTextStyle]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const setTextAutoCorrect = (value: boolean) => changePreference("textAutoCorrect", value);
  const [stickies, setStickies] = useState<HandwritingSticky[]>(
    () => startingDocument?.stickies ?? [],
  );
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCoordinateIds, setSelectedCoordinateIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("rectangle");
  const [formulaDraft, setFormulaDraft] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const [shapeInsertOpen, setShapeInsertOpen] = useState(false);
  const [pageNavigationOpen, setPageNavigationOpen] = useState(true);
  const [paperSectionsOpen, setPaperSectionsOpen] = useState({ paper: false, color: false });
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [stickyMenuId, setStickyMenuId] = useState<string | null>(null);
  const [stickyColorMenuId, setStickyColorMenuId] = useState<string | null>(null);
  const [toolPresses, setToolPresses] = useState(0);
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
  function setTool(next: HandwritingTool) {
    setToolPresses(0);
    setMobileDrawer(
      ["pen", "eraser", "highlighter", "ruler", "space", "curve", "coordinates", "select"].includes(
        next,
      )
        ? "tool"
        : null,
    );
    setStickyMenuId(null);
    setStickyColorMenuId(null);
    // Segurar Espaço troca para a mão (rolar a folha) e volta: a curva em andamento continua.
    if (next !== "curve" && next !== "hand" && curveControls.length > 0) finishCurve();
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
    if (next !== paper) animatePaperChange();
    // A pauta muda sem encolher, reposicionar ou cortar o conteúdo já escrito.
    setCanvasSize((size) => ({
      width: Math.max(3200, size.width),
      height: Math.max(2400, size.height),
    }));
    setPaper(next);
  }
  const [paperColor, setPaperColor] = useState<HandwritingPaperColor>(legacyPaperColor);
  const [brushSettings, setBrushSettings] = useState<
    Record<string, { color: string; width: number }>
  >({});
  const brushKey = tool === "pen" ? `pen:${brush}` : tool;
  const defaultInk = paperColor === "night" ? "#fff9ef" : "#17151c";
  const settings = brushSettings[brushKey] ?? {
    color: tool === "highlighter" ? "#facc15" : defaultInk,
    width: 5,
  };
  const { color, width } = settings;
  function setColor(next: string) {
    setBrushSettings((current) => ({
      ...current,
      [brushKey]: { ...(current[brushKey] ?? settings), color: next },
    }));
  }
  function setWidth(next: number) {
    setBrushSettings((current) => ({
      ...current,
      [brushKey]: { ...(current[brushKey] ?? settings), width: next },
    }));
  }
  const [eraserWidth, setEraserWidth] = useState(10);
  const [eraserWholeStroke, setEraserWholeStroke] = useState(false);
  const [eraserBackground, setEraserBackground] = useState(false);
  // A borracha de fundo só faz sentido com uma página ou imagem importada na folha.
  const backgroundAvailable = Boolean(background) || importedImages.length > 0;
  const [highlighterOpacity, setHighlighterOpacity] = useState(0.3);
  const [gestureRevision, setGestureRevision] = useState(0);
  const remoteBaseRef = useRef<HandwritingDocument | undefined>(initialDocument);
  const [zoom, setZoom] = useState(0.7);
  const zoomRef = useRef(zoom);
  const zoomAnchorRef = useRef<{
    x: number;
    y: number;
    relativeX: number;
    relativeY: number;
  } | null>(null);
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
  const [writingWindowZoom, setWritingWindowZoom] = useState(1);
  const [writingWindowAspect, setWritingWindowAspect] = useState(500 / 185);
  const writingSize = writingViewSize(writingWindowZoom, writingWindowAspect);
  function navigateWritingWindow(view: WritingView) {
    setWritingWindowX(view.x);
    setWritingWindowY(view.y);
    setWritingWindowZoom(view.zoom);
    if (view.aspect) setWritingWindowAspect(view.aspect);
  }
  const [draftStatus, setDraftStatus] = useState(recovered ? uiText(1697) : "");
  const [saveConfirmation, setSaveConfirmation] = useState(0);
  useEffect(() => {
    if (!saveConfirmation) return;
    const timer = window.setTimeout(() => setSaveConfirmation(0), 4000);
    return () => window.clearTimeout(timer);
  }, [saveConfirmation]);

  // Varredura de brilho sobre a folha quando o caderno inteiro é trocado.
  function sweepNotebook() {
    const sheet = canvasRef.current?.closest(".handwriting-page-shell");
    if (!sheet || isMotionReduced()) return;
    const overlay = document.createElement("div");
    overlay.className = "handwriting-notebook-sweep";
    overlay.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) {
      const band = document.createElement("span");
      band.style.setProperty("--i", String(index));
      overlay.append(band);
    }
    for (let index = 0; index < 8; index += 1) {
      const spark = document.createElement("i");
      spark.style.setProperty("--i", String(index));
      spark.style.setProperty("--x", `${8 + ((index * 37) % 84)}%`);
      spark.style.setProperty("--y", `${10 + ((index * 53) % 76)}%`);
      overlay.append(spark);
    }
    sheet.append(overlay);
    window.setTimeout(() => overlay.remove(), 1700);
  }

  async function applyPaperToNotebook(change: NotebookPaperChange): Promise<number> {
    if (change.paper) selectPaper(change.paper);
    if (change.paperColor) selectPaperColor(change.paperColor);
    // As opções ficam abertas: o brilho do botão e o aviso mostram o que aconteceu.
    sweepNotebook();
    return (await onApplyPaperToNotebook?.(change)) ?? 0;
  }

  function selectPaperColor(nextColor: HandwritingPaperColor) {
    if (nextColor !== paperColor) animatePaperChange();
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
      currentUiLanguage,
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
  const [savedBaseline, setSavedBaseline] = useState(baseline);
  const eraseSnapshotRef = useRef({ strokes, pageText, stickies });
  // eslint-disable-next-line react-hooks/refs -- Used by the imperative editor effects and pointer handlers.
  eraseSnapshotRef.current = { strokes, pageText, stickies };
  const dirty = JSON.stringify(currentDocument) !== savedBaseline;

  useEffect(() => {
    if (drawingRef.current) return;
    if (!remoteDocument) return;
    if (remoteBaseRef.current === remoteDocument) return;
    if (JSON.stringify(remoteDocument) === JSON.stringify(currentDocument)) {
      remoteBaseRef.current = remoteDocument;
      return;
    }
    const reconciled = remoteBaseRef.current
      ? mergeHandwriting(remoteBaseRef.current, currentDocument, remoteDocument)
      : remoteDocument;
    remoteBaseRef.current = remoteDocument;
    // A collaborator's document is an external subscription update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaper(reconciled.paper);
    setCanvasSize(
      reconciled.canvasSize ??
        (reconciled.paper === "board"
          ? { width: 3200, height: 2400 }
          : { width: 1200, height: 1600 }),
    );
    setPaperColor(reconciled.paperColor ?? "light");
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
    const reducedMotion = isMotionReduced();
    if (remoteAuthor && !reducedMotion && shouldReveal(incoming)) {
      // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
      revealsRef.current = [...stillHere, ...planReveal(incoming, performance.now())];
      // eslint-disable-next-line react-hooks/immutability -- Used by the imperative editor effects and pointer handlers.
      scheduleLivePaint();
    }
    setStrokes(reconciled.strokes);
    setStickies(reconciled.stickies ?? []);
    setPageText(reconciled.pageText ?? "");
    setPageTextSize(reconciled.pageTextSize ?? 28);
    setPageTextFrame(reconciled.pageTextFrame ?? { x: 112, y: 80, width: 980, height: 1440 });
    setCoordinateSystems(reconciled.coordinateSystems ?? []);
    setImportedImages(reconciled.images ?? []);
    setLayerVisibility({
      ...DEFAULT_HANDWRITING_LAYER_VISIBILITY,
      ...(reconciled.layers?.visibility ?? {}),
    });
    setLayerOrder(reconciled.layers?.order ?? DEFAULT_HANDWRITING_LAYER_ORDER);
    setBackground(reconciled.background);
    setBackgroundFrame(reconciled.backgroundFrame);
    setDraftStatus(remoteAuthor ? uiText(1698, [remoteAuthor]) : uiText(1699));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteAuthor, remoteDocument, gestureRevision]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const onDraftChangeRef = useRef(onDraftChange);
  // eslint-disable-next-line react-hooks/refs -- Used by the imperative editor effects and pointer handlers.
  onDraftChangeRef.current = onDraftChange;
  useEffect(() => {
    if (!drawingRef.current) onDraftChangeRef.current?.(currentDocument);
  }, [currentDocument, gestureRevision]);

  const autosaveRef = useRef<() => void>(() => {});
  const autosavedRef = useRef("");
  useEffect(() => {
    autosaveRef.current = () => {
      const serialized = JSON.stringify(currentDocument);
      if (!dirty || !onAutosave || drawingRef.current || serialized === autosavedRef.current)
        return;
      if ((background && !backgroundImage) || !importedImagesReady) return;
      try {
        // eslint-disable-next-line react-hooks/immutability -- Used by the imperative editor effects and pointer handlers.
        onAutosave(pageImage(), buildDocument());
        autosavedRef.current = serialized;
        setDraftStatus(uiText(1700));
      } catch (caught) {
        setDraftStatus(caught instanceof Error ? uiText(1701, [caught.message]) : uiText(294));
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
        setDraftStatus(uiText(1702));
      } catch {
        setDraftStatus(uiText(295));
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

  // A folha como se desenha: tela, PNG, PDF e impressão usam a mesma cena.
  const pageScene = useMemo<PageScene>(
    () => ({
      strokes,
      paper,
      paperColor,
      stickies,
      pageText,
      pageTextSize,
      pageTextFrame,
      coordinateSystems,
      backgroundImage,
      backgroundFrame,
      layers: layerVisibility,
      layerOrder,
      images: renderableImportedImages,
    }),
    [
      strokes,
      paper,
      paperColor,
      stickies,
      pageText,
      pageTextSize,
      pageTextFrame,
      coordinateSystems,
      backgroundImage,
      backgroundFrame,
      layerVisibility,
      layerOrder,
      renderableImportedImages,
      currentUiLanguage,
    ],
  );

  // A folha vista pela seleção: as regras de escolher, acertar e mover itens ficam em
  // handwriting-selection-scene.ts, e as ações (copiar, colar, girar...) em use-selection-actions.ts.
  const selectionScene = useMemo<SelectionScene>(
    () => ({
      strokes,
      coordinateSystems,
      stickies,
      images: importedImages,
      pageText,
      pageTextSize,
      pageTextFrame,
      layers: layerVisibility,
      layerOrder,
    }),
    [
      strokes,
      coordinateSystems,
      stickies,
      importedImages,
      pageText,
      pageTextSize,
      pageTextFrame,
      layerVisibility,
      layerOrder,
      currentUiLanguage,
    ],
  );

  const {
    canPaste,
    deleteSelection,
    selectionBounds,
    scaleSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    duplicateSelection,
    selectAll,
    allSelected,
    rotateSelection,
    alignSelection,
    nudgeSelection,
    hasSelection,
  } = useSelectionActions({
    scene: selectionScene,
    selectedIds,
    selectedCoordinateIds,
    page: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
    remember,
    setTool,
    setStrokes,
    setStickies,
    setCoordinateSystems,
    setImportedImages,
    setPageText,
    setPageTextFrame,
    setSelectedIds,
    setSelectedCoordinateIds,
  });
  const selectionGesture = useSelectionGesture({
    selectionSnap: preferences.selectionSnap,
    selectionGuides: preferences.selectionGuides,
    scene: selectionScene,
    rotationSide,
    selectionMode,
    selectedIds,
    selectedCoordinateIds,
    page: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
    remember,
    setSelectedIds,
    setSelectedCoordinateIds,
    setStrokes,
    setStickies,
    setCoordinateSystems,
    setImportedImages,
    setPageTextFrame,
    setPageTextSize,
  });
  const { selectionBox, setSelectionBox, selectionPath, transforming, guides } = selectionGesture;
  const zoomTo = useCallback((clientX: number, clientY: number, nextZoom: number) => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !Number.isFinite(nextZoom)) return;
    const relativeX = (clientX - bounds.left) / bounds.width;
    const relativeY = (clientY - bounds.top) / bounds.height;
    const clampedZoom = Math.max(0.7, Math.min(2, Math.round(nextZoom * 100) / 100));
    if (clampedZoom === zoomRef.current) return;
    zoomAnchorRef.current = { x: clientX, y: clientY, relativeX, relativeY };
    zoomRef.current = clampedZoom;
    setZoom(clampedZoom);
  }, []);

  const pinch = usePinchZoom({
    viewportRef,
    zoom,
    zoomTo,
    // O segundo dedo cancela o traço que o primeiro estava fazendo.
    onPinchStart: () => {
      const unfinishedStroke = liveStrokeRef.current;
      if (unfinishedStroke)
        setStrokes((current) => current.filter((stroke) => stroke.id !== unfinishedStroke.id));
      drawingRef.current = false;
      liveStrokeRef.current = null;
      liveStabilizerRef.current = null;
      clearLive();
      selectionGesture.cancel();
      panRef.current = null;
      activePointerRef.current = null;
    },
  });

  const paintedPageRef = useRef<{
    scene: PageScene;
    scale: number;
    width: number;
    height: number;
    text: string;
    hidden: string;
  } | null>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const previous = paintedPageRef.current;
    const before = previous?.scene;
    const resized =
      !previous ||
      previous.scale !== renderScale ||
      previous.width !== PAGE_WIDTH ||
      previous.height !== PAGE_HEIGHT;
    sizePageCanvas(canvas, renderScale, PAGE_WIDTH, PAGE_HEIGHT);
    if (liveCanvasRef.current)
      sizePageCanvas(liveCanvasRef.current, renderScale, PAGE_WIDTH, PAGE_HEIGHT);
    // Redimensionar o bitmap apaga a tinta ainda pressionada. Repinta no mesmo
    // efeito para preservar a ponta mesmo quando o zoom muda durante o gesto.
    if (liveStrokeRef.current) paintLiveRef.current();
    // O traço em andamento fica só na camada ao vivo até a caneta ser solta.
    const hidden = new Set(revealsRef.current.map((reveal) => reveal.stroke.id));
    const liveId = liveStrokeRef.current?.id;
    if (liveId) hidden.add(liveId);
    const hiddenKey = [...hidden].join(",");
    const visibleText = textMode && !editingTextId ? "" : pageText;
    const coversChanged =
      before?.strokes !== strokes &&
      (before?.strokes.some((stroke) => stroke.cover) || strokes.some((stroke) => stroke.cover));
    const paperChanged =
      resized ||
      before?.paper !== pageScene.paper ||
      before?.paperColor !== pageScene.paperColor ||
      before?.backgroundImage !== pageScene.backgroundImage ||
      before?.backgroundFrame !== pageScene.backgroundFrame ||
      before?.images !== pageScene.images ||
      before?.layers.background !== pageScene.layers.background ||
      coversChanged;
    if (paperChanged) renderPageScene(canvas, pageScene, { onlyLayer: "paper" });
    const changedLayers = {
      coordinates:
        resized ||
        before?.coordinateSystems !== pageScene.coordinateSystems ||
        before?.layers.coordinates !== pageScene.layers.coordinates,
      text:
        resized ||
        previous?.text !== visibleText ||
        before?.pageTextSize !== pageScene.pageTextSize ||
        before?.pageTextFrame !== pageScene.pageTextFrame ||
        before?.paperColor !== pageScene.paperColor ||
        before?.layers.text !== pageScene.layers.text,
      strokes:
        resized ||
        before?.strokes !== strokes ||
        previous?.hidden !== hiddenKey ||
        before?.layers.strokes !== pageScene.layers.strokes,
    };
    const canvases = [
      ["coordinates", coordinateCanvasRef.current],
      ["text", textCanvasRef.current],
      ["strokes", inkCanvasRef.current],
    ] as const;
    for (const [layer, overlay] of canvases) {
      if (!overlay || !changedLayers[layer]) continue;
      sizePageCanvas(overlay, renderScale, PAGE_WIDTH, PAGE_HEIGHT);
      renderPageScene(overlay, pageScene, {
        onlyLayer: layer,
        strokes: hidden.size > 0 ? strokes.filter((stroke) => !hidden.has(stroke.id)) : strokes,
        pageText: visibleText,
      });
    }
    // Camadas vazias não entram na composição: cada canvas do tamanho da folha custa uns milissegundos
    // por quadro enquanto se escreve. A tinta confirmada fica sempre visível porque o traço é
    // desenhado direto nela ao soltar a caneta.
    const emptyLayer = {
      coordinates: !pageScene.layers.coordinates || pageScene.coordinateSystems.length === 0,
      text: !pageScene.layers.text || visibleText === "",
      strokes: false,
    };
    for (const [layer, overlay] of canvases)
      if (overlay) overlay.style.display = emptyLayer[layer] ? "none" : "";
    paintedPageRef.current = {
      scene: pageScene,
      scale: renderScale,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      text: visibleText,
      hidden: hiddenKey,
    };
  }, [pageScene, strokes, pageText, textMode, editingTextId, renderScale, PAGE_WIDTH, PAGE_HEIGHT]);

  const displayWidth = Math.max(1, Math.round(fitWidth * (zoom / 0.7)));
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    const anchor = zoomAnchorRef.current;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!anchor || !canvas || !viewport) return;
    const bounds = canvas.getBoundingClientRect();
    viewport.scrollLeft += bounds.left + anchor.relativeX * bounds.width - anchor.x;
    viewport.scrollTop += bounds.top + anchor.relativeY * bounds.height - anchor.y;
    zoomAnchorRef.current = null;
  }, [zoom, displayWidth]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      zoomTo(
        event.clientX,
        event.clientY,
        zoomRef.current * Math.exp(-event.deltaY * unit * 0.002),
      );
    };
    viewport.addEventListener("wheel", wheel, { passive: false });
    return () => viewport.removeEventListener("wheel", wheel);
  }, [zoomTo]);
  useLayoutEffect(() => {
    const canvas = selectionCanvasRef.current;
    if (!canvas) return;
    sizePageCanvas(canvas, renderScale, PAGE_WIDTH, PAGE_HEIGHT);
    clearPageCanvas(canvas);
    // Sem seleção, caixa, laço nem guias a camada não tem o que mostrar: sai da composição.
    canvas.style.display =
      !textMode &&
      (selectedIds.length > 0 ||
        Boolean(selectionBox) ||
        Boolean(selectionPath?.length) ||
        guides.length > 0)
        ? ""
        : "none";
    const context = pageContext(canvas);
    if (context && !textMode)
      drawSelectionOverlay(
        context,
        selectionScene,
        selectedIds,
        selectionBox,
        selectionPath,
        transforming,
        guides,
        rotationSide,
        phoneLayout ? (PAGE_WIDTH / Math.max(1, displayWidth)) * (24 / 22) : 1,
      );
  }, [
    selectionScene,
    phoneLayout,
    displayWidth,
    textMode,
    selectedIds,
    transforming,
    guides,
    rotationSide,
    selectionBox,
    selectionPath,
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
    const overlays = {
      coordinates: coordinateCanvasRef.current,
      text: textCanvasRef.current,
      strokes: inkCanvasRef.current,
      stickies: null,
    };
    for (const image of [source, ...pageScene.layerOrder.map((layer) => overlays[layer])]) {
      if (!image) continue;
      context.drawImage(
        image,
        writingWindowX * mirrorScale,
        writingWindowY * mirrorScale,
        writingSize.width * mirrorScale,
        writingSize.height * mirrorScale,
        0,
        0,
        target.width,
        target.height,
      );
    }
  }, [
    PAGE_WIDTH,
    paper,
    stickies,
    strokes,
    writingWindowOpen,
    writingWindowX,
    writingWindowY,
    writingWindowZoom,
    writingWindowAspect,
    backgroundImage,
    renderScale,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const { paddingLeft, paddingRight, paddingTop, paddingBottom } = getComputedStyle(viewport);
      const width = viewport.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
      const height = viewport.clientHeight - parseFloat(paddingTop) - parseFloat(paddingBottom);
      setFitWidth(phoneLayout ? Math.max(width, (height * PAGE_WIDTH) / PAGE_HEIGHT) : width);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [phoneLayout, PAGE_WIDTH, PAGE_HEIGHT]);

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
      setError(uiText(296));
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

  function zoomAt(clientX: number, clientY: number, direction: 1 | -1) {
    zoomTo(clientX, clientY, zoomRef.current + direction * 0.15);
  }

  function eraseAt(points: HandwritingPoint[]) {
    eraseQueueRef.current.push(...points);
    if (eraseFrameRef.current === null)
      eraseFrameRef.current = requestAnimationFrame(() => flushEraseRef.current());
  }
  function flushErase() {
    if (eraseFrameRef.current !== null) cancelAnimationFrame(eraseFrameRef.current);
    eraseFrameRef.current = null;
    const points = eraseQueueRef.current;
    eraseQueueRef.current = [];
    if (!points.length) return;
    const path = eraserPointRef.current ? [eraserPointRef.current, ...points] : points;
    eraserPointRef.current = points.at(-1) ?? eraserPointRef.current;
    const current = eraseSnapshotRef.current;
    const nextStrokes = eraserWholeStroke
      ? eraseWholeStrokes(current.strokes, path, eraserWidth * 3)
      : eraseInkArea(current.strokes, path, eraserWidth * 3, strokeId);
    if (nextStrokes !== current.strokes) eraserChangedRef.current = true;
    setStrokes(nextStrokes);
    let nextText = current.pageText;
    const context = canvasRef.current?.getContext("2d");
    if (context) {
      context.save();
      context.font = `${pageTextSize}px monospace`;
      const glyphWidth = context.measureText("M").width;
      context.restore();
      nextText = erasePageText(
        current.pageText,
        points,
        glyphWidth,
        pageTextSize,
        pageTextFrame,
        eraserWidth * 3,
      );
      if (nextText !== current.pageText) eraserChangedRef.current = true;
      setPageText(nextText);
    }
    const nextStickies = current.stickies.filter(
      (sticky) =>
        sticky.kind !== "text" ||
        !points.some(
          ({ x, y }) =>
            x >= sticky.x - eraserWidth * 3 &&
            x <= sticky.x + stickyWidth(sticky) + eraserWidth * 3 &&
            y >= sticky.y - eraserWidth * 3 &&
            y <= sticky.y + stickyHeight(sticky) + eraserWidth * 3,
        ),
    );
    if (nextStickies.length !== current.stickies.length) {
      eraserChangedRef.current = true;
      setStickies(nextStickies);
    }
    eraseSnapshotRef.current = { strokes: nextStrokes, pageText: nextText, stickies: nextStickies };
  }
  // eslint-disable-next-line react-hooks/refs -- Used by the imperative editor effects and pointer handlers.
  flushEraseRef.current = flushErase;

  function eraserRadius() {
    return eraserBackground ? Math.min(50, eraserWidth * 3) : eraserWidth * 3;
  }

  function paintLive() {
    liveFrameRef.current = null;
    const overlay = liveCanvasRef.current;
    if (!overlay) return;
    // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
    const paintStartedAt = penDiagnostics ? performance.now() : 0;
    clearPageCanvas(overlay);
    const context = pageContext(overlay);
    if (!context) return;
    const stroke = liveStrokeRef.current;
    if (stroke) {
      drawStroke(context, withPredictedTail(stroke, predictedRef.current), true);
      if (writingWindowOpen) paintWritingWindowLive(stroke);
      penMeter.recordPaint(paintStartedAt);
    } else if (eraserCursorRef.current && penHoverPreview) {
      // Apagando: o anel acompanha a borracha até soltar, em vez de sumir ao apertar.
      drawEraserPreview(context, eraserCursorRef.current, eraserRadius());
    } else if (hoverPointRef.current && (tool === "pen" || tool === "highlighter")) {
      const previewWidth = tool === "highlighter" ? Math.min(100, width * 2.5) : width;
      drawHoverPreview(context, hoverPointRef.current, previewWidth / 2, color);
    } else if (hoverPointRef.current && tool === "eraser") {
      // A borracha apaga num raio de eraserWidth * 3 (o modo de fundo é limitado a 50).
      drawEraserPreview(context, hoverPointRef.current, eraserRadius());
    }
    paintReveals(context);
  }

  // Escreve, quadro a quadro, os traços novos de colegas. Ao terminar, cada um é
  // desenhado na folha no mesmo quadro em que sai da camada ao vivo.
  function paintReveals(context: CanvasRenderingContext2D) {
    const reveals = revealsRef.current;
    if (reveals.length === 0) return;
    // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
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
    const main = layerVisibility.strokes ? inkCanvasRef.current : null;
    const mainContext = finished.length > 0 && main ? pageContext(main) : null;
    if (mainContext) for (const stroke of finished) drawStroke(mainContext, stroke);
    if (active.length > 0) scheduleLivePaint();
  }
  // eslint-disable-next-line react-hooks/refs -- Used by the imperative editor effects and pointer handlers.
  paintLiveRef.current = paintLive;

  function scheduleLivePaint() {
    if (liveFrameRef.current !== null) return;
    liveFrameRef.current = requestAnimationFrame(() => paintLiveRef.current());
  }

  function clearLive() {
    canvasRef.current?.style.removeProperty("cursor");
    writingCanvasRef.current?.style.removeProperty("cursor");
    predictedRef.current = [];
    if (liveFrameRef.current !== null) cancelAnimationFrame(liveFrameRef.current);
    liveFrameRef.current = null;
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
    const main = layerVisibility.strokes ? inkCanvasRef.current : null;
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
    const overlays = {
      coordinates: coordinateCanvasRef.current,
      text: textCanvasRef.current,
      strokes: inkCanvasRef.current,
      stickies: null,
    };
    for (const image of [source, ...pageScene.layerOrder.map((layer) => overlays[layer])]) {
      if (!image) continue;
      context.drawImage(
        image,
        writingWindowX * mirrorScale,
        writingWindowY * mirrorScale,
        writingSize.width * mirrorScale,
        writingSize.height * mirrorScale,
        0,
        0,
        target.width,
        target.height,
      );
    }
    context.save();
    context.scale(target.width / writingSize.width, target.height / writingSize.height);
    context.translate(-writingWindowX, -writingWindowY);
    drawStroke(context, stroke, true);
    context.restore();
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    objectClickRef.current = null;
    if (textMode) setTextMode(false);
    hoverPointRef.current = null;
    if (event.pointerType === "pen") {
      // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
      palmRef.current = { penDown: true, lastPenAt: performance.now() };
    } else if (
      event.pointerType === "touch" &&
      // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
      shouldIgnoreTouch(palmRef.current, performance.now())
    ) {
      // Palma apoiada enquanto a caneta escreve: não é gesto e não pode cancelar o traço.
      event.preventDefault();
      return;
    }
    if (event.pointerType === "touch" && pinch.start(event)) {
      event.preventDefault();
      return;
    }
    // Ponta de borracha invertida e botao de barril sao comuns em mesas
    // digitalizadoras (Wacom, Huion, Surface Pen). O navegador reporta a
    // ponta de borracha como button 5 e o botao de barril como button 2 em
    // pointerType "pen". Tratamos os dois sem exigir que a pessoa troque de
    // ferramenta manualmente.
    // Também vale o botão apertado ANTES de encostar (button 0 com buttons 3), comum na S Pen.
    const isEraserTip = isPenEraserTip(event);
    const isBarrelButton = isPenBarrelButton(event);
    const isSecondButton = isPenSecondButton(event);
    const penButton = isEraserTip || isBarrelButton || isSecondButton;
    if (event.button !== 0 && !penButton) return;
    if (event.pointerType === "pen" && !penDetectedRef.current) {
      penDetectedRef.current = true;
      changePreference("penOnly", true);
    }
    // A ponta traseira vale mais que o botão lateral, que vale mais que o segundo botão.
    const penAction = isEraserTip
      ? shortcutSettings.penTail
      : isBarrelButton
        ? shortcutSettings.penSide
        : shortcutSettings.penSecond;
    if (penButton && penAction === "select" && tool !== "select") setTool("select");
    const rawTool: HandwritingTool = penButton && penAction !== "selected" ? penAction : tool;
    // Borracha de fundo: em vez de apagar tinta, desenha um traço de cobertura que fura o fundo
    // importado ao ser solto. Daí em diante o gesto é o de um traço comum.
    const coverErase = rawTool === "eraser" && eraserBackground && backgroundAvailable;
    const effectiveTool: HandwritingTool = coverErase ? "pen" : rawTool;
    activeToolRef.current = effectiveTool;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (effectiveTool === "zoom-in" || effectiveTool === "zoom-out") {
      zoomAt(event.clientX, event.clientY, effectiveTool === "zoom-in" ? 1 : -1);
      return;
    }
    if (effectiveTool === "select" && copiedTextStyle) {
      applyTextStyle(canvasPoint(canvas, event), event.shiftKey);
      return;
    }
    if (effectiveTool === "select" && selectedIds.length === 1 && !event.shiftKey) {
      const point = canvasPoint(canvas, event);
      const id = pickAt(selectionScene, point).ids.at(-1);
      const frame = selectionBounds();
      const item = stickies.find((item) => item.id === id);
      const inset = (3 * PAGE_WIDTH) / canvas.getBoundingClientRect().width;
      const insideBody =
        item &&
        point.x > item.x + inset &&
        point.y > item.y + inset &&
        point.x < item.x + stickyWidth(item) - inset &&
        point.y < item.y + stickyHeight(item) - inset;
      const radius =
        ((event.pointerType === "touch" ? 22 : 12) * PAGE_WIDTH) /
        canvas.getBoundingClientRect().width;
      if (
        id &&
        selectedIds.includes(id) &&
        (stickies.some((item) => item.id === id) || id === PAGE_TEXT_SELECTION_ID) &&
        (insideBody || !frame || !hitSelectionHandle(point, frame, radius, rotationSide))
      )
        objectClickRef.current = { id, x: event.clientX, y: event.clientY };
    }
    if (activePointerRef.current !== null) return;
    canvas.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    if (
      effectiveTool === "hand" ||
      (penOnly && event.pointerType === "touch" && effectiveTool !== "select")
    ) {
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
    if (effectiveTool === "curve") {
      setCurveDrag(point);
      return;
    }
    if (effectiveTool === "space") {
      remember();
      const drag = { y: point.y, shift: 0 };
      spaceDragRef.current = drag;
      setSpaceDrag(drag);
      setSpaceGuide(point.y);
      return;
    }
    if (effectiveTool === "select") {
      selectionGesture.begin(
        event,
        point,
        false,
        PAGE_WIDTH / canvas.getBoundingClientRect().width,
      );
      return;
    }
    remember();
    if (effectiveTool === "eraser") {
      eraserChangedRef.current = false;
      eraserPointRef.current = null;
      eraserCursorRef.current = point;
      eraseAt([point]);
      paintLive();
      return;
    }
    const activeWidth = effectiveTool === "highlighter" ? Math.min(100, width * 2.5) : width;
    const nextStroke: Stroke = coverErase
      ? {
          id: strokeId(),
          tool: "pen",
          brush: "fine",
          cover: true,
          color: "#7433e0",
          width: Math.min(100, eraserWidth * 6),
          points: [point],
        }
      : {
          id: strokeId(),
          tool: effectiveTool === "ruler" ? "pen" : effectiveTool,
          ...(effectiveTool === "pen" ? { brush } : {}),
          ...(effectiveTool === "pen" && dash ? { dash } : {}),
          ...(effectiveTool === "pen"
            ? { dynamics: event.pointerType === "pen" ? ("pen" as const) : ("simulated" as const) }
            : {}),
          ...(effectiveTool === "highlighter" ? { opacity: highlighterOpacity } : {}),
          color,
          width: activeWidth,
          points: [point],
        };
    if (effectiveTool !== "ruler") liveStrokeRef.current = nextStroke;
    if (effectiveTool === "pen" && event.pointerType === "mouse")
      event.currentTarget.style.cursor = pencilCursor(nextStroke.color, true);
    if (effectiveTool === "pen" || effectiveTool === "highlighter") penMeter.begin();
    liveStabilizerRef.current =
      stabilization && effectiveTool !== "ruler"
        ? createLiveStabilizer(point, {
            ...DEFAULT_LIVE_STABILIZER,
            maxLag: Math.min(4, (PAGE_WIDTH / canvas.getBoundingClientRect().width) * 1.5),
          })
        : null;
    clearTimeout(holdTimerRef.current);
    shapeSnappedRef.current = false;
    shapeKindRef.current = null;
    shapeAdjusterRef.current = null;
    holdAnchorRef.current = null;
    setShapeBadge(null);
    // O traço em andamento fica só na camada ao vivo; a folha o recebe ao soltar a caneta.
    if (effectiveTool !== "ruler") {
      paintLive();
    }
  }

  function updateHoverPreview(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const shouldShow =
      penHoverPreview &&
      // A caneta paira sobre a folha; o mouse também mostra o anel da borracha.
      (event.pointerType === "pen" || (event.pointerType === "mouse" && tool === "eraser")) &&
      event.buttons === 0 &&
      !drawingRef.current &&
      canvas;
    if (shouldShow) {
      hoverPointRef.current = canvasPoint(canvas, event);
      paintLive();
    } else if (hoverPointRef.current) {
      hoverPointRef.current = null;
      paintLive();
    }
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    const press = objectClickRef.current;
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 3)
      objectClickRef.current = null;
    updateHoverPreview(event);
    if (onCursorMove && canvasRef.current) {
      const at = canvasPoint(canvasRef.current, event);
      onCursorMove(at.x, at.y);
    }
    if (event.pointerType === "pen") {
      // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
      palmRef.current = { ...palmRef.current, lastPenAt: performance.now() };
    } else if (
      event.pointerType === "touch" &&
      // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
      shouldIgnoreTouch(palmRef.current, performance.now())
    ) {
      return;
    }
    if (event.pointerType === "touch" && pinch.move(event)) return;
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
    if (selectionGesture.move(event, canvasPoint(canvas, event))) return;
    const sampleEvents = pointerSamples(event.nativeEvent);
    const bounds = canvas.getBoundingClientRect();
    const points = sampleEvents.map((sample) => {
      const point = canvasPoint(canvas, sample, bounds);
      if (event.type === "pointerup" && sample.pressure === 0)
        point.pressure = liveStrokeRef.current?.points.at(-1)?.pressure ?? point.pressure;
      return point;
    });
    const sampleTimes = sampleEvents.map((sample) => sample.timeStamp);
    if (activeToolRef.current === "pen" || activeToolRef.current === "highlighter")
      penMeter.recordEvent(event.nativeEvent.timeStamp, sampleEvents.length);
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
    if (activeToolRef.current === "curve") {
      const end = points.at(-1);
      if (end) setCurveDrag(end);
    }
    if (activeToolRef.current === "space") {
      const end = points.at(-1);
      const drag = spaceDragRef.current;
      if (end && drag) {
        const next = {
          y: drag.y,
          shift: clampSpaceShift(selectionScene, drag.y, end.y - drag.y, PAGE_HEIGHT),
        };
        spaceDragRef.current = next;
        setSpaceDrag(next);
      }
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
      eraserCursorRef.current = points.at(-1) ?? eraserCursorRef.current;
      // No pointerup o finish() repinta o estado final; evita um quadro intermediário com o anel.
      if (event.type !== "pointerup") paintLive();
      return;
    }
    const liveStroke = liveStrokeRef.current;
    if (!liveStroke) return;
    if (shapeSnappedRef.current) {
      const adjust = shapeAdjusterRef.current;
      if (adjust) {
        const result = adjust(canvasPoint(canvas, event));
        liveStroke.points = result.points;
        setShapeBadge((badge) =>
          badge && badge.detail !== result.detail ? { ...badge, detail: result.detail } : badge,
        );
        scheduleLivePaint();
      }
      return;
    }
    // Na dobra do canto não há papel: pontos ali nem entram no traço.
    const onPaper = sampleEvents.map(
      (sample) => !isInFoldCorner(bounds, sample.clientX, sample.clientY),
    );
    const paperPoints = points.filter((_, index) => onPaper[index]);
    if (paperPoints.length === 0) return;
    const paperTimes = sampleTimes.filter((_, index) => onPaper[index]);
    const previous = liveStroke.points.at(-1);
    const added = (liveStabilizerRef.current?.push(paperPoints, paperTimes) ?? paperPoints).reduce<
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
    predictedRef.current =
      // Só a caneta: com mouse e dedo a previsão do navegador erra a direção (posições inteiras,
      // pouca história) e a ponta desenhada vira um toco duro que some no quadro seguinte.
      inkPrediction &&
      event.nativeEvent.pointerType === "pen" &&
      (liveStroke.tool === "pen" || liveStroke.tool === "highlighter")
        ? predictedTail(
            liveStroke.points,
            (event.nativeEvent.getPredictedEvents?.() ?? []).map((sample) =>
              canvasPoint(canvas, sample, bounds),
            ),
          )
        : [];
    scheduleLivePaint();
    if (shapeSnap && (activeToolRef.current === "pen" || activeToolRef.current === "highlighter")) {
      const tip = liveStroke.points.at(-1);
      const anchor = holdAnchorRef.current;
      const tolerance = SHAPE_HOLD_JITTER_PX * (PAGE_WIDTH / Math.max(1, bounds.width));
      // O tremor de uma mão parada não reinicia a contagem: só um movimento de verdade.
      if (tip && (!anchor || Math.hypot(tip.x - anchor.x, tip.y - anchor.y) > tolerance)) {
        clearTimeout(holdTimerRef.current);
        holdAnchorRef.current = tip;
        holdTimerRef.current = setTimeout(snapHeldStroke, SHAPE_HOLD_MS);
      }
    } else clearTimeout(holdTimerRef.current);
  }

  function snapHeldStroke() {
    const live = liveStrokeRef.current;
    if (!live || !drawingRef.current || shapeSnappedRef.current) return;
    const shape = recognizeShape(live.points);
    if (!shape) return;
    const tip = live.points.at(-1);
    shapeAdjusterRef.current = tip ? createShapeAdjuster(shape, tip) : null;
    live.points = shape.points;
    liveStabilizerRef.current = null;
    predictedRef.current = [];
    shapeSnappedRef.current = true;
    shapeKindRef.current = shape.kind;
    setShapeBadge({ kind: shape.kind, detail: "" });
    // Um toque de vibração confirma o encaixe, onde o aparelho tem.
    navigator.vibrate?.(12);
    scheduleLivePaint();
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    // Alguns dispositivos entregam a última posição somente no pointerup.
    // Consumir esse ponto evita encurtar traços rápidos ou deixar falhas na borracha.
    if (
      event.type === "pointerup" &&
      event.pointerId === activePointerRef.current &&
      (liveStrokeRef.current || activeToolRef.current === "eraser")
    )
      move(event);
    clearTimeout(holdTimerRef.current);
    holdAnchorRef.current = null;
    shapeAdjusterRef.current = null;
    setShapeBadge(null);
    if (event.pointerType === "pen") {
      // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
      palmRef.current = { penDown: false, lastPenAt: performance.now() };
    }
    if (event.pointerType === "touch") pinch.end(event.pointerId);
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
    if (activeToolRef.current === "curve") {
      const canvas = canvasRef.current;
      setCurveDrag(null);
      // Um cancelamento (palma, perda do ponteiro) não marca ponto.
      if (canvas && event.type === "pointerup") placeCurvePoint(canvasPoint(canvas, event));
      activePointerRef.current = null;
      drawingRef.current = false;
      return;
    }
    if (activeToolRef.current === "space") {
      const drag = spaceDragRef.current;
      spaceDragRef.current = null;
      setSpaceDrag(null);
      if (drag && Math.abs(drag.shift) >= 1) applySpaceShift(drag.y, drag.shift);
      else setUndoStack((history) => history.slice(0, -1));
      activePointerRef.current = null;
      drawingRef.current = false;
      return;
    }
    if (activeToolRef.current === "coordinates" && coordinateMeasure) {
      const measuredWidth = Math.abs(coordinateMeasure.end.x - coordinateMeasure.start.x);
      const height = Math.abs(coordinateMeasure.end.y - coordinateMeasure.start.y);
      if (measuredWidth > 48 && height > 48)
        setCoordinateSystems((current) => [
          ...current,
          {
            id: strokeId(),
            origin: coordinateMeasure.start,
            end: coordinateMeasure.end,
            step: coordinateStep,
            measurements: coordinateMeasurements,
            color,
            lineWidth: width,
          },
        ]);
      else setUndoStack((history) => history.slice(0, -1));
      setCoordinateMeasure(null);
      activePointerRef.current = null;
      drawingRef.current = false;
      return;
    }
    activePointerRef.current = null;
    if (
      selectionGesture.end(
        event.type === "pointerup" && canvasRef.current
          ? canvasPoint(canvasRef.current, event)
          : undefined,
      )
    ) {
      drawingRef.current = false;
      return;
    }
    if (panRef.current) {
      panRef.current = null;
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setGestureRevision((value) => value + 1);
    if (activeToolRef.current === "eraser") {
      flushErase();
      eraserPointRef.current = null;
      // Mouse e caneta continuam vendo o anel onde soltaram; o dedo não tem pairar.
      hoverPointRef.current = event.pointerType === "touch" ? null : eraserCursorRef.current;
      eraserCursorRef.current = null;
      paintLive();
      if (!eraserChangedRef.current) setUndoStack((history) => history.slice(0, -1));
      return;
    }
    const liveStroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (!liveStroke) return;
    penMeter.end();
    const sheet = canvasRef.current;
    const unitsPerPixel = sheet
      ? Number(sheet.dataset["pageWidth"] || PAGE_WIDTH) /
        Math.max(1, sheet.getBoundingClientRect().width)
      : 1;
    const settledRaw = settleLiveStroke(liveStroke.points);
    // Rabiscar sobre a escrita com a caneta apaga os traços de baixo. Só vale se o zigue-zague
    // cobre tinta que já existe; em lugar vazio ele fica como um traço comum.
    if (
      scribbleErase &&
      liveStroke.tool === "pen" &&
      !liveStroke.dash &&
      !shapeSnappedRef.current
    ) {
      const scribble = recognizeScribble(settledRaw);
      const erased = scribble
        ? scribbleTargets(settledRaw, strokes, scribble.reach, liveStroke.id)
        : [];
      if (erased.length > 0) {
        clearLive();
        recentLinesRef.current = [];
        const gone = new Set(erased);
        setStrokes((current) => current.filter((stroke) => !gone.has(stroke.id)));
        return;
      }
    }
    // Mouse e dedo informam pixels inteiros: o degrau é alisado ao soltar (a caneta não precisa).
    const settledPoints =
      liveStroke.dynamics === "simulated" && !shapeSnappedRef.current
        ? denoiseMousePath(settledRaw, unitsPerPixel)
        : settledRaw;
    const points = compactPoints(
      (stabilization && !shapeSnappedRef.current
        ? straightenStroke(settledPoints)
        : settledPoints
      ).map((point) => ({
        ...point,
        x: Math.max(0, Math.min(PAGE_WIDTH, point.x)),
        y: Math.max(0, Math.min(PAGE_HEIGHT, point.y)),
      })),
    );
    const finished: Stroke = { ...liveStroke, points };
    // Reta acertada de propósito: pode fechar uma forma com as retas acertadas logo antes. Tudo
    // acontece neste mesmo gesto, então um passo de desfazer volta ao que havia antes desta reta.
    const snappedLine = shapeSnappedRef.current && shapeKindRef.current === "line";
    // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
    const now = performance.now();
    const recent = pruneRecentLines(recentLinesRef.current, now, strokes);
    const combined = snappedLine
      ? combineWithRecentLines(strokes, recent, finished, strokeId)
      : null;
    if (combined) {
      recentLinesRef.current = [];
      commitLiveStroke(combined.stroke);
      const removed = new Set(combined.remove);
      setStrokes((current) => [
        ...current.filter((stroke) => !removed.has(stroke.id)),
        combined.stroke,
      ]);
      return;
    }
    recentLinesRef.current = snappedLine ? [...recent, { id: finished.id, time: now }] : [];
    commitLiveStroke(finished);
    setStrokes((current) => [...current, finished]);
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
    const origin = bounds ?? { x: 112, y: 80, height: 0 };
    remember();
    const id = strokeId();
    setStickies((current) => [
      ...current,
      {
        id,
        kind: "text",
        formula: true,
        x: Math.max(24, Math.min(PAGE_WIDTH - 460, origin.x)),
        y: Math.max(24, Math.min(PAGE_HEIGHT - 260, origin.y + origin.height + 18)),
        width: 460,
        height: 260,
        color: "yellow",
        ink: "#292432",
        text: formula.slice(0, 240),
      },
    ]);
    setFormulaDraft("");
    setSelectedIds([]);
    setTool("pen");
  }

  async function recognizeSelectedFormula() {
    const selectedStrokes = strokes.filter(
      (stroke) => selectedIds.includes(stroke.id) && stroke.tool !== "highlighter",
    );
    const bounds = unionBounds(selectedStrokes.map(strokeBounds));
    if (!bounds) {
      setError(uiText(297));
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
      if (!context) throw new Error(uiText(298));
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
      if (!recognized) throw new Error(uiText(299));
      setFormulaDraft(recognized);
      setOcrProgress(100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(300));
    } finally {
      if (worker) await worker.terminate();
      setOcrBusy(false);
    }
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

  // Objetos entram visíveis e selecionados, usando a parte da folha que está na tela.
  function insertWithoutDrawing(kind: InsertKind) {
    remember();
    const canvas = canvasRef.current?.getBoundingClientRect();
    const viewport = viewportRef.current?.getBoundingClientRect();
    const visible =
      canvas && viewport
        ? {
            left: Math.max(canvas.left, viewport.left),
            right: Math.min(canvas.right, viewport.right),
            top: Math.max(canvas.top, viewport.top),
            bottom: Math.min(canvas.bottom, viewport.bottom),
          }
        : null;
    const scale = canvas?.width ? PAGE_WIDTH / canvas.width : 1;
    const visibleWidth = visible ? (visible.right - visible.left) * scale : PAGE_WIDTH;
    const visibleHeight = visible ? (visible.bottom - visible.top) * scale : PAGE_HEIGHT;
    const shapeWidth = visible ? Math.min(320, Math.max(24, visibleWidth * 0.55)) : 320;
    const shapeHeight =
      kind === "arrow"
        ? Math.min(40, Math.max(16, visibleHeight * 0.5))
        : Math.max(16, Math.min(220, shapeWidth * 0.7, visibleHeight * 0.55));
    const centerX =
      visible && canvas
        ? ((visible.left + visible.right) / 2 - canvas.left) * scale
        : PAGE_WIDTH / 2;
    const centerY =
      visible && canvas
        ? ((visible.top + visible.bottom) / 2 - canvas.top) * scale
        : PAGE_HEIGHT / 2;
    const box = {
      x: Math.max(0, Math.min(PAGE_WIDTH - shapeWidth, centerX - shapeWidth / 2)),
      y: Math.max(0, Math.min(PAGE_HEIGHT - shapeHeight, centerY - shapeHeight / 2)),
      width: shapeWidth,
      height: shapeHeight,
    };
    const id = strokeId();
    const ink =
      tool === "highlighter" ? (brushSettings[`pen:${brush}`]?.color ?? defaultInk) : color;
    const points = canonicalShape(kind, box);
    setStrokes((current) => [
      ...current,
      { id, tool: "pen", brush: "fine", color: ink, width: 4, points },
    ]);
    setSelectedIds([id]);
    setSelectedCoordinateIds([]);
    setTool("select");
    setMobileDrawer(null);
    setLayerVisibility((current) => ({ ...current, strokes: true, coordinates: true }));
  }

  function addSticky(kind?: "text" | "table") {
    if (stickies.length >= 40) {
      setError(uiText(1703));
      return;
    }
    remember();
    const id = strokeId();
    setTool("select");
    setEditingTextId(null);
    setTextMode(false);
    setSelectedIds([id]);
    setSelectedCoordinateIds([]);
    setStickies((current) => [
      ...current,
      {
        id,
        x: 160 + (current.length % 3) * 55,
        y: 160 + (current.length % 4) * 55,
        color: "yellow",
        text: "",
        ...(kind === "text" ? { kind, ink: color } : {}),
        ...(kind === "table"
          ? {
              kind,
              width: 360,
              height: 220,
              cells: [
                ["", "", ""],
                ["", "", ""],
                ["", "", ""],
              ],
            }
          : {}),
      },
    ]);
  }

  function updateSticky(id: string, change: Partial<HandwritingSticky>) {
    setStickies((current) =>
      current.map((sticky) => (sticky.id === id ? { ...sticky, ...change } : sticky)),
    );
  }

  function toggleLayerVisibility(layer: keyof HandwritingLayerVisibility) {
    remember();
    setLayerVisibility((current) => ({ ...current, [layer]: !current[layer] }));
  }

  function moveLayer(layer: HandwritingLayerKey, direction: -1 | 1) {
    const available = completeLayerOrder.filter((key) => layerAvailability[key]);
    const visibleIndex = available.indexOf(layer);
    const swapWith = available[visibleIndex + direction];
    const index = completeLayerOrder.indexOf(layer);
    const swapIndex = swapWith ? completeLayerOrder.indexOf(swapWith) : -1;
    if (index < 0 || swapIndex < 0) return;
    remember();
    setLayerOrder(() => {
      const next = [...completeLayerOrder];
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
    const width = Math.max(STICKY_MIN_WIDTH, resize.width + (event.clientX - resize.x) * scale);
    const height = Math.max(STICKY_MIN_HEIGHT, resize.height + (event.clientY - resize.y) * scale);
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
      Partial<Pick<PointerEvent, "tiltX" | "tiltY" | "twist">>,
    measuredBounds?: DOMRect,
  ): HandwritingPoint {
    const canvas = writingCanvasRef.current;
    if (!canvas) return { x: writingWindowX, y: writingWindowY, pressure: 0.5 };
    const bounds = measuredBounds ?? canvas.getBoundingClientRect();
    return {
      tiltX: event.tiltX ?? 0,
      tiltY: event.tiltY ?? 0,
      ...(event.twist !== undefined ? { twist: event.twist } : {}),
      x:
        writingWindowX +
        Math.max(
          0,
          Math.min(
            writingSize.width,
            ((event.clientX - bounds.left) / bounds.width) * writingSize.width,
          ),
        ),
      y:
        writingWindowY +
        Math.max(
          0,
          Math.min(
            writingSize.height,
            ((event.clientY - bounds.top) / bounds.height) * writingSize.height,
          ),
        ),
      pressure: event.pressure > 0 ? event.pressure : 0.5,
    };
  }

  function startWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if ((event.button !== 0 && event.pointerType !== "pen") || writingPointerRef.current !== null)
      return;
    if (tool !== "pen" && tool !== "highlighter" && tool !== "eraser") return;
    const shortcut = isPenEraserTip(event)
      ? shortcutSettings.penTail
      : isPenBarrelButton(event)
        ? shortcutSettings.penSide
        : isPenSecondButton(event)
          ? shortcutSettings.penSecond
          : "selected";
    if (shortcut !== "selected" && shortcut !== "eraser") return;
    const writingTool = shortcut === "eraser" ? "eraser" : tool;
    writingToolRef.current = writingTool;
    writingPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    remember();
    const point = writingPoint(event.nativeEvent);
    if (writingTool === "eraser") {
      eraserChangedRef.current = false;
      eraserPointRef.current = null;
      eraseAt([point]);
      return;
    }
    const nextStroke: Stroke = {
      id: strokeId(),
      tool: writingTool,
      ...(writingTool === "pen"
        ? {
            brush,
            ...(dash ? { dash } : {}),
            dynamics:
              event.nativeEvent.pointerType === "pen" ? ("pen" as const) : ("simulated" as const),
          }
        : { opacity: highlighterOpacity }),
      color,
      width: writingTool === "highlighter" ? Math.min(100, width * 2.5) : width,
      points: [point],
    };
    liveStrokeRef.current = nextStroke;
    if (writingTool === "pen" && event.pointerType === "mouse")
      event.currentTarget.style.cursor = pencilCursor(nextStroke.color, true);
    // Na janela ampliada a tinta tem que ficar sob a caneta enquanto se escreve.
    // A inércia do estabilizador ao vivo, calibrada para a folha inteira, aparece
    // ampliada aqui e faz a tinta ficar atrás da ponta, então só se suaviza ao
    // terminar o traço.
    liveStabilizerRef.current = null;
    paintLive();
  }

  function moveWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    if (writingToolRef.current === "eraser") {
      const bounds = event.currentTarget.getBoundingClientRect();
      eraseAt(pointerSamples(event.nativeEvent).map((sample) => writingPoint(sample, bounds)));
      return;
    }
    const liveStroke = liveStrokeRef.current;
    if (!liveStroke) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const points = pointerSamples(event.nativeEvent).map((sample) => {
      const point = writingPoint(sample, bounds);
      if (event.type === "pointerup" && sample.pressure === 0)
        point.pressure = liveStroke.points.at(-1)?.pressure ?? point.pressure;
      return point;
    });
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
    scheduleLivePaint();
  }

  function finishWritingWindow(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (writingPointerRef.current !== event.pointerId) return;
    if (event.type === "pointerup") moveWritingWindow(event);
    writingPointerRef.current = null;
    if (writingToolRef.current === "eraser") {
      flushErase();
      eraserPointRef.current = null;
      if (!eraserChangedRef.current) setUndoStack((history) => history.slice(0, -1));
      return;
    }
    const liveStroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (liveStroke) {
      penMeter.end();
      if (scribbleErase && liveStroke.tool === "pen" && !liveStroke.dash) {
        const scribble = recognizeScribble(liveStroke.points);
        const erased = scribble
          ? scribbleTargets(liveStroke.points, strokes, scribble.reach, liveStroke.id)
          : [];
        if (erased.length > 0) {
          clearLive();
          const gone = new Set(erased);
          setStrokes((current) => current.filter((stroke) => !gone.has(stroke.id)));
          return;
        }
      }
      const smoothed =
        liveStroke.dynamics === "simulated"
          ? denoiseMousePath(
              liveStroke.points,
              writingSize.width / Math.max(1, event.currentTarget.getBoundingClientRect().width),
            )
          : liveStroke.points;
      const points = stabilization ? straightenStroke(smoothed) : smoothed;
      commitLiveStroke({ ...liveStroke, points });
      setStrokes((current) => [...current, { ...liveStroke, points }]);
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    if (event.type === "pointerup" && relativeX >= 0.82) advanceWritingWindow();
  }

  function advanceWritingWindow() {
    const step = Math.min(300, writingSize.width * 0.6);
    if (writingWindowX + writingSize.width + step < PAGE_WIDTH) {
      setWritingWindowX((current) => current + step);
    } else {
      setWritingWindowX(Math.min(100, Math.max(0, PAGE_WIDTH - writingSize.width)));
      setWritingWindowY((current) => Math.min(PAGE_HEIGHT - writingSize.height, current + 48));
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
      throw new Error(uiText(301));
    }
    return document;
  }

  const [pageTurn, setPageTurn] = useState<"forward" | "backward" | null>(null);
  const [navigationPreview, setNavigationPreview] = useState("");
  useEffect(() => {
    if (
      !onSelectPage ||
      !pageNavigationOpen ||
      !importedImagesReady ||
      (background && !backgroundImage)
    )
      return;
    const timer = window.setTimeout(() => {
      if (drawingRef.current) return;
      const thumbnail = document.createElement("canvas");
      sizePageCanvas(thumbnail, 180 / PAGE_WIDTH, PAGE_WIDTH, PAGE_HEIGHT);
      renderPageScene(thumbnail, pageScene);
      setNavigationPreview(thumbnail.toDataURL("image/png"));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    onSelectPage,
    pageNavigationOpen,
    importedImagesReady,
    background,
    backgroundImage,
    pageScene,
    gestureRevision,
  ]);

  function pageImage(): string {
    if (background && !backgroundImage) throw new Error(uiText(302));
    if (!importedImagesReady) throw new Error(uiText(1706));
    const canvas = document.createElement("canvas");
    sizePageCanvas(canvas, 1, PAGE_WIDTH, PAGE_HEIGHT);
    renderPageScene(canvas, pageScene);
    return exportPage(canvas);
  }

  function selectedCanvas() {
    const bounds = selectionBounds();
    if (!bounds) throw new Error(uiText(301));
    if (!importedImagesReady) throw new Error(uiText(1706));
    const chosen = new Set(selectedIds);
    const source = document.createElement("canvas");
    sizePageCanvas(source, 1, PAGE_WIDTH, PAGE_HEIGHT);
    renderPageScene(
      source,
      {
        ...pageScene,
        strokes: strokes.filter((item) => chosen.has(item.id)),
        stickies: stickies.filter((item) => chosen.has(item.id)),
        coordinateSystems: coordinateSystems.filter((item) => chosen.has(item.id)),
        pageText: chosen.has(PAGE_TEXT_SELECTION_ID) ? pageText : "",
        images: renderableImportedImages.filter((item) => chosen.has(item.id)),
        backgroundImage: undefined,
      },
      { transparentPaper: true },
    );
    const crop = document.createElement("canvas");
    const x = Math.max(0, Math.floor(bounds.x - 12));
    const y = Math.max(0, Math.floor(bounds.y - 12));
    crop.width = Math.max(1, Math.min(PAGE_WIDTH - x, Math.ceil(bounds.width + 24)));
    crop.height = Math.max(1, Math.min(PAGE_HEIGHT - y, Math.ceil(bounds.height + 24)));
    const context = crop.getContext("2d");
    if (!context) throw new Error(uiText(301));
    context.drawImage(source, x, y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    return crop;
  }

  function exportSelectedPng() {
    try {
      const link = document.createElement("a");
      link.href = selectedCanvas().toDataURL("image/png");
      link.download = "selecao-do-caderno.png";
      link.click();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(308));
    }
  }

  async function exportPng() {
    try {
      const mascot = await loadPaperExportMascot();
      if (background && !backgroundImage) throw new Error(uiText(302));
      if (!importedImagesReady) throw new Error(uiText(1706));
      const canvas = document.createElement("canvas");
      sizePageCanvas(canvas, 1, PAGE_WIDTH, PAGE_HEIGHT);
      renderPageScene(canvas, pageScene);
      const link = document.createElement("a");
      link.href = brandedExportCanvas(canvas, mascot).toDataURL("image/png");
      link.download = "folha-do-caderno.png";
      link.click();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(304));
    }
  }

  async function printPage() {
    const printWindow = openPrintWindow();
    try {
      if (!printWindow) throw new Error(uiText(305));
      const mascot = await loadPaperExportMascot();
      if (background && !backgroundImage) throw new Error(uiText(302));
      if (!importedImagesReady) throw new Error(uiText(1706));
      const canvas = document.createElement("canvas");
      sizePageCanvas(canvas, 1, PAGE_WIDTH, PAGE_HEIGHT);
      renderPageScene(canvas, pageScene);
      const imageUrl = brandedExportCanvas(canvas, mascot).toDataURL("image/png");
      const image = printWindow.document.createElement("img");
      image.alt = uiText(2289);
      image.style.cssText = "display:block;width:100%;height:auto;max-width:210mm;margin:auto";
      image.onload = () => printWindow.print();
      printWindow.document.body.style.margin = "0";
      printWindow.document.body.append(image);
      image.src = imageUrl;
    } catch (caught) {
      printWindow?.close();
      setError(caught instanceof Error ? caught.message : uiText(306));
    }
  }

  async function exportPdf() {
    try {
      const mascot = await loadPaperExportMascot();
      if (background && !backgroundImage) throw new Error(uiText(302));
      if (!importedImagesReady) throw new Error(uiText(1706));
      const canvas = document.createElement("canvas");
      sizePageCanvas(canvas, 1, PAGE_WIDTH, PAGE_HEIGHT);
      renderPageScene(canvas, pageScene);
      downloadCanvasAsPdf(brandedExportCanvas(canvas, mascot), "folha-do-caderno.pdf");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(307));
    }
  }

  // eslint-disable-next-line react-hooks/immutability -- Used by the imperative editor effects and pointer handlers.
  useEffect(() => {
    if (!flushOnClose) return;
    // eslint-disable-next-line react-hooks/immutability -- Used by the imperative editor effects and pointer handlers.
    flushOnClose.current = () => {
      if (!dirty) return true;
      try {
        const document = buildDocument();
        if (JSON.stringify(currentDocument) !== autosavedRef.current) {
          if (!importedImagesReady || (background && !backgroundImage))
            throw new Error(uiText(1706));
          onSave(pageImage(), document);
        }
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : uiText(310));
        return false;
      }
    };
    return () => {
      flushOnClose.current = null;
    };
  });

  function switchPage(navigate: () => void) {
    try {
      if (dirty) onSave(pageImage(), buildDocument());
      navigate();
      requestAnimationFrame(resetView);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(308));
    }
  }

  function copyTextStyle() {
    const sticky = [...stickies]
      .reverse()
      .find((item) => selectedIds.includes(item.id) && item.kind !== "table" && !item.formula);
    if (sticky)
      setCopiedTextStyle({ ink: sticky.ink ?? "#17151c", textSize: sticky.textSize ?? 25 });
    else if (selectedIds.includes(PAGE_TEXT_SELECTION_ID))
      setCopiedTextStyle({
        ink: pageTextFrame.ink ?? (paperColor === "night" ? "#fff9ef" : "#17151c"),
        textSize: pageTextSize,
      });
    else {
      setStyleMessage(uiText(3792));
      return;
    }
    setTool("select");
    setStyleMessage(uiText(3789));
  }

  function applyTextStyle(point: HandwritingPoint, repeat: boolean) {
    if (!copiedTextStyle) return false;
    const picked = pickAt(selectionScene, point).ids.at(-1);
    const target = stickies.find(
      (item) => item.id === picked && item.kind !== "table" && !item.formula,
    );
    if (!target && picked !== PAGE_TEXT_SELECTION_ID) return true;
    remember();
    if (target)
      setStickies((items) =>
        items.map((item) => (item.id === target.id ? { ...item, ...copiedTextStyle } : item)),
      );
    else {
      setPageTextSize(Math.max(16, copiedTextStyle.textSize));
      setPageTextFrame((frame) => ({ ...frame, ink: copiedTextStyle.ink }));
    }
    if (picked) setSelectedIds([picked]);
    if (!repeat) setCopiedTextStyle(null);
    setStyleMessage(uiText(3790));
    return true;
  }

  function resetView() {
    setZoom(0.7);
    const viewport = viewportRef.current;
    if (!viewport) return;
    // Use an immediate reset: smooth scrolling can leave the editor in an
    // intermediate position when the user starts drawing right away.
    viewport.scrollTo({ top: 0, left: 0, behavior: "auto" });
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
  }

  useEditorShortcuts(
    {
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
      copyStyle: copyTextStyle,
      insert: (kind) => addSticky(kind === "sticky" ? undefined : kind),
      cycleSelection,
      hasSelection,
      nudge: nudgeSelection,
    },
    canvasRef,
    viewportRef,
  );

  // Move tudo o que está abaixo da linha. Usa os ids da folha de agora e atualizações funcionais,
  // para não apagar um traço que um colega acrescentou enquanto a linha era arrastada.
  function applySpaceShift(lineY: number, shift: number) {
    const items = itemsBelowLine(selectionScene, lineY);
    const page = { width: PAGE_WIDTH, height: PAGE_HEIGHT };
    setStrokes((current) => moveStrokes(current, items.strokeIds, 0, shift, page));
    setCoordinateSystems((current) =>
      moveCoordinateSystems(current, items.coordinateIds, 0, shift, page),
    );
    setStickies((current) => moveStickies(current, items.stickyIds, 0, shift, page));
    setImportedImages((current) => moveImages(current, items.imageIds, 0, shift, page));
    if (items.moveText) setPageTextFrame((frame) => shiftTextFrame(frame, 0, shift, page));
  }

  // Curva: marcar um ponto, concluir (gera um traço comum com a caneta de agora) e cancelar.
  const CURVE_CURSOR_STEP = 12;
  const curveCursorAt = curveCursor ?? {
    x: Math.round(PAGE_WIDTH / 2),
    y: Math.round(PAGE_HEIGHT / 3),
    pressure: 0.5,
  };

  function finishCurve() {
    const controls = dedupeControls(curveControls);
    setCurveControls([]);
    setCurveDrag(null);
    curveClickRef.current = null;
    if (controls.length < 2) return;
    const points = splinePoints(controls, 0.5, { width: PAGE_WIDTH, height: PAGE_HEIGHT });
    remember();
    setStrokes((current) => [
      ...current,
      {
        id: strokeId(),
        tool: "pen",
        brush,
        ...(dash ? { dash } : {}),
        color,
        width,
        points,
      },
    ]);
  }

  function placeCurvePoint(point: HandwritingPoint) {
    // eslint-disable-next-line react-hooks/purity -- Used by the imperative editor effects and pointer handlers.
    const now = performance.now();
    const last = curveClickRef.current;
    setCurveCursor(point);
    // Dois toques no mesmo lugar concluem a curva, sem marcar o ponto de novo.
    if (
      last &&
      now - last.time < 400 &&
      Math.hypot(point.x - last.x, point.y - last.y) < 14 &&
      curveControls.length >= 2
    ) {
      finishCurve();
      return;
    }
    curveClickRef.current = { x: point.x, y: point.y, time: now };
    setCurveControls((current) =>
      current.length >= MAX_CONTROL_POINTS ? current : [...current, point],
    );
  }

  function handleCurveKeyDown(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    const step = (event.shiftKey ? 4 : 1) * CURVE_CURSOR_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setCurveCursor({
        x: Math.max(0, Math.min(PAGE_WIDTH, curveCursorAt.x + move[0])),
        y: Math.max(0, Math.min(PAGE_HEIGHT, curveCursorAt.y + move[1])),
        pressure: 0.5,
      });
    } else if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      finishCurve();
    } else if (event.key === "Enter") {
      event.preventDefault();
      setCurveControls((current) =>
        current.length >= MAX_CONTROL_POINTS ? current : [...current, curveCursorAt],
      );
    } else if (event.key === "Escape" && curveControls.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      setCurveControls([]);
      setCurveDrag(null);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setCurveControls((current) => current.slice(0, -1));
    }
  }

  const SPACE_GUIDE_STEP = 24;
  const SPACE_KEY_SHIFT = 48;
  const spaceGuideY = Math.max(0, Math.min(PAGE_HEIGHT, spaceGuide ?? Math.round(PAGE_HEIGHT / 3)));

  function handleSpaceKeyDown(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    if (!event.shiftKey) {
      setSpaceGuide(Math.max(0, Math.min(PAGE_HEIGHT, spaceGuideY + direction * SPACE_GUIDE_STEP)));
      return;
    }
    const shift = clampSpaceShift(
      selectionScene,
      spaceGuideY,
      direction * SPACE_KEY_SHIFT,
      PAGE_HEIGHT,
    );
    if (Math.abs(shift) < 1) return;
    remember();
    applySpaceShift(spaceGuideY, shift);
  }

  function cycleSelection(direction: -1 | 1) {
    const ids = pickInBox(selectionScene, {
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    }).ids;
    if (!ids.length) return;
    const index = ids.indexOf(selectedIds.at(-1) ?? "");
    const next = ids[(index + direction + ids.length) % ids.length]!;
    setSelectedIds([next]);
    setSelectedCoordinateIds(coordinateSystems.some((system) => system.id === next) ? [next] : []);
  }

  function handleCanvasKeyDown(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    if (event.key === "Escape" && copiedTextStyle) {
      event.preventDefault();
      setCopiedTextStyle(null);
      setStyleMessage("");
      return;
    }
    if (tool === "space") handleSpaceKeyDown(event);
    if (tool === "curve") handleCurveKeyDown(event);
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
      selectedIds.length === 0 &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      viewport.scrollBy({
        left: event.key === "ArrowLeft" ? -80 : event.key === "ArrowRight" ? 80 : 0,
        top: event.key === "ArrowUp" ? -80 : event.key === "ArrowDown" ? 80 : 0,
      });
    }
  }

  async function save(closeAfter = true) {
    setSaveConfirmation(0);
    const canvas = canvasRef.current;
    if (!canvas) {
      setError(uiText(309));
      return;
    }
    try {
      const savedSnapshot = JSON.stringify(currentDocument);
      const draftStorageKey = `helenastudy.handwriting.draft.${draftKey}`;
      const draftBeforeSave = localStorage.getItem(draftStorageKey);
      const document = buildDocument();
      onSave(pageImage(), document);
      await onConfirmSave?.(document);
      if (localStorage.getItem(draftStorageKey) === draftBeforeSave)
        localStorage.removeItem(draftStorageKey);
      autosavedRef.current = savedSnapshot;
      setSavedBaseline(savedSnapshot);
      setDraftStatus(uiText(342));
      setSaveConfirmation(Date.now());
      setError("");
      if (closeAfter) onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(310));
    }
  }

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
  const completeLayerOrder = [...new Set([...layerOrder, ...DEFAULT_HANDWRITING_LAYER_ORDER])];
  const layerDepth = (layer: HandwritingLayerKey) => completeLayerOrder.indexOf(layer) + 1;
  const selectedStroke =
    tool === "select" ? strokes.find((stroke) => selectedIds.includes(stroke.id)) : undefined;
  const selectedText =
    tool === "select"
      ? [...stickies]
          .reverse()
          .find((item) => selectedIds.includes(item.id) && item.kind !== "table" && !item.formula)
      : undefined;
  const selectedTable =
    tool === "select"
      ? [...stickies]
          .reverse()
          .find((item) => selectedIds.includes(item.id) && item.kind === "table")
      : undefined;
  const selectedSticky =
    selectedIds.length === 1 ? stickies.find((item) => item.id === selectedIds[0]) : undefined;
  const floatingSelection =
    tool === "select" && !textMode && selectedIds.length > 0 ? selectionBounds() : null;
  const visibleLayerOrder = completeLayerOrder
    .filter((layer) => layerAvailability[layer])
    .reverse();
  const optionsOpen = toolPresses === 2 && !textMode;
  const inkOptions = (
    <HandwritingInkOptions
      tool={tool}
      color={color}
      onColorChange={setColor}
      width={tool === "eraser" ? eraserWidth : width}
      onWidthChange={tool === "eraser" ? setEraserWidth : setWidth}
      eraserWholeStroke={eraserWholeStroke}
      onEraserWholeStrokeChange={setEraserWholeStroke}
      eraserBackground={eraserBackground}
      onEraserBackgroundChange={setEraserBackground}
      backgroundAvailable={backgroundAvailable}
      highlighterOpacity={highlighterOpacity}
      onHighlighterOpacityChange={setHighlighterOpacity}
      dash={dash}
      onDashChange={setDash}
    />
  );
  const showBrushPanel = tool === "pen" && optionsOpen && !writingWindowOpen;
  const showRulerPanel = tool === "ruler" && optionsOpen;
  const showCoordinatePanel = tool === "coordinates" && optionsOpen;
  const showToolCase =
    !phoneLayout &&
    optionsOpen &&
    ["eraser", "highlighter", "ruler", "curve", "coordinates"].includes(tool);
  const rightPanelCount =
    Number(showBrushPanel) +
    Number(showToolCase) +
    Number(phoneLayout && showRulerPanel) +
    Number(phoneLayout && showCoordinatePanel) +
    Number(layersOpen);

  return (
    <div
      className="handwriting-studio"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || (!copiedTextStyle && !textMode)) return;
        event.preventDefault();
        event.stopPropagation();
        setCopiedTextStyle(null);
        setStyleMessage("");
        setTextMode(false);
        if (editingTextId) setSelectedIds([editingTextId]);
        canvasRef.current?.focus();
      }}
      data-mobile-drawer={mobileDrawer ?? "closed"}
      data-tool-options={optionsOpen}
      data-tool={textMode ? "text" : tool}
    >
      {phoneLayout && (
        <div className="notebook-mobile-dock" aria-label={uiText(311)}>
          <button
            type="button"
            aria-expanded={mobileDrawer === "tool"}
            onClick={() => setMobileDrawer(mobileDrawer === "tool" ? null : "tool")}
          >
            <PaperEditorIcon name="pen" />
            <span>{uiText(312)}</span>
          </button>
          <button
            type="button"
            aria-expanded={mobileDrawer === "history"}
            onClick={() => setMobileDrawer(mobileDrawer === "history" ? null : "history")}
          >
            <PaperEditorIcon name="undo" />
            <span>{uiText(313)}</span>
          </button>
          {mobileDrawer && (
            <button type="button" aria-label={uiText(314)} onClick={() => setMobileDrawer(null)}>
              <PaperCloseIcon />
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
        aria-label={uiText(315)}
        inert={fileAction === "import"}
      >
        <HandwritingToolGroup
          textMode={textMode}
          tool={tool}
          rulerUnit={rulerUnit}
          layersOpen={layersOpen}
          writingWindowOpen={writingWindowOpen}
          onSelectTool={(next) => {
            if (!["pen", "highlighter", "eraser", "ruler", "coordinates", "curve"].includes(next)) {
              setTool(next);
            } else if (!textMode && tool === next && toolPresses > 0) {
              setToolPresses(toolPresses === 1 ? 2 : 1);
              setMobileDrawer("tool");
            } else {
              setTool(next);
              setToolPresses(1);
            }
          }}
          onToggleLayers={() => {
            setLayersOpen((open) => !open);
            setMobileDrawer("tool");
          }}
          onToggleText={() => {
            setMobileDrawer(null);
            if (textMode) setTextMode(false);
            else addSticky("text");
          }}
          onAddSticky={() => addSticky()}
          onAddTable={() => addSticky("table")}
          onToggleWritingWindow={() => {
            setTextMode(false);
            setWritingWindowOpen((open) => !open);
          }}
          onOpenShapeInsert={() => setShapeInsertOpen(true)}
        />

        {shapeInsertOpen && (
          <HandwritingShapeInsert
            onInsert={insertWithoutDrawing}
            onClose={() => setShapeInsertOpen(false)}
          />
        )}

        {(selectedIds.length > 0 || tool === "select") && (
          <HandwritingSelectionActions
            onMove={() => setTool("hand")}
            tool={tool}
            selectionMode={selectionMode}
            onSelectionModeChange={(mode) => {
              setTool("select");
              setEditingTextId(null);
              setSelectionMode(mode);
            }}
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
            allSelected={allSelected}
            floatingActions
            strokeProperties={
              selectedStroke && {
                color: selectedStroke.color,
                width: selectedStroke.width,
                onChange: (change) => {
                  remember();
                  setStrokes((current) =>
                    current.map((stroke) =>
                      selectedIds.includes(stroke.id) ? { ...stroke, ...change } : stroke,
                    ),
                  );
                },
              }
            }
            canPaste={canPaste}
            hasPageText={Boolean(selectedText) || selectedIds.includes(PAGE_TEXT_SELECTION_ID)}
            pageTextSize={selectedText ? (selectedText.textSize ?? 25) : pageTextSize}
            minimumTextSize={selectedText ? 4 : 16}
            tableProperties={
              selectedTable && {
                cells: selectedTable.cells ?? [[""]],
                onRemember: remember,
                onChange: (cells) => updateSticky(selectedTable.id, { cells }),
              }
            }
            textProperties={
              selectedText || selectedIds.includes(PAGE_TEXT_SELECTION_ID)
                ? {
                    ink: selectedText
                      ? (selectedText.ink ?? "#17151c")
                      : (pageTextFrame.ink ?? (paperColor === "night" ? "#fff9ef" : "#17151c")),
                    onColorChange: (ink) => {
                      remember();
                      setStickies((items) =>
                        items.map((item) =>
                          selectedIds.includes(item.id) && item.kind !== "table" && !item.formula
                            ? { ...item, ink }
                            : item,
                        ),
                      );
                      if (selectedIds.includes(PAGE_TEXT_SELECTION_ID))
                        setPageTextFrame((frame) => ({ ...frame, ink }));
                    },
                  }
                : undefined
            }
            onChangeTextSize={(delta) => {
              remember();
              setStickies((items) =>
                items.map((item) =>
                  selectedIds.includes(item.id) && item.kind !== "table" && !item.formula
                    ? {
                        ...item,
                        textSize: Math.max(4, Math.min(144, (item.textSize ?? 25) + delta)),
                      }
                    : item,
                ),
              );
              if (selectedIds.includes(PAGE_TEXT_SELECTION_ID))
                setPageTextSize((size) => Math.max(16, Math.min(144, size + delta)));
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

        {optionsOpen && !(showBrushPanel && !phoneLayout) && !showToolCase && inkOptions}

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
          selectionImage={
            floatingSelection ? () => selectedCanvas().toDataURL("image/png") : undefined
          }
          uploadOpen={uploadOpen}
          onUpload={() => {
            setFileMenuOpen(false);
            setUploadOpen(!uploadOpen);
          }}
          uploadPanel={
            <>
              <label className="notebook-upload-picker">
                <PaperEditorIcon name="cloudUpload" />
                <span>{uiText(802)}</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    addUploads(Array.from(event.currentTarget.files ?? []));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <small className="notebook-upload-limits">{uiText(3860)}</small>
              <div className="notebook-upload-grid">
                {uploads.map((item) => (
                  <div className="notebook-upload-entry" key={item.id}>
                    <button
                      key={item.id}
                      type="button"
                      className="notebook-upload-card"
                      draggable={Boolean(item.preview)}
                      disabled={!item.preview}
                      aria-busy={!item.preview && !item.error}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/x-olena-upload", item.id);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => insertUpload(item)}
                    >
                      <span className="notebook-upload-thumbnail">
                        {item.preview ? (
                          <img src={item.preview.image} alt="" draggable={false} />
                        ) : (
                          <PaperEditorIcon name="page" />
                        )}
                      </span>
                      <span className="notebook-upload-name" title={item.name ?? item.file.name}>
                        {item.name ?? item.file.name}
                      </span>
                      {item.error && <small>{item.error}</small>}
                    </button>
                    <button
                      type="button"
                      className="notebook-upload-more"
                      data-no-tooltip
                      aria-label={"Opções de " + (item.name ?? item.file.name)}
                      aria-expanded={uploadMenu === item.id}
                      onClick={(event) => {
                        setUploadMenuAnchor(event.currentTarget.getBoundingClientRect());
                        setUploadMenu(uploadMenu === item.id ? undefined : item.id);
                        setUploadView("actions");
                      }}
                    >
                      <PaperEditorIcon name="more" />
                    </button>
                    {uploadMenu === item.id &&
                      uploadMenuAnchor &&
                      createPortal(
                        <div
                          className="notebook-upload-actions"
                          role="group"
                          aria-label={uiText(3861)}
                          style={{
                            left: Math.max(
                              8,
                              Math.min(uploadMenuAnchor.right - 240, window.innerWidth - 248),
                            ),
                            ...(window.innerHeight - uploadMenuAnchor.bottom > 300
                              ? { top: uploadMenuAnchor.bottom + 6 }
                              : { bottom: window.innerHeight - uploadMenuAnchor.top + 6 }),
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.stopPropagation();
                              setUploadMenu(undefined);
                            }
                          }}
                        >
                          <strong>{item.name ?? item.file.name}</strong>
                          {uploadView === "actions" && (
                            <>
                              <button type="button" onClick={() => setUploadView("rename")}>
                                <PaperEditorIcon name="uploadRename" />
                                {uiText(3862)}
                              </button>
                              <button
                                type="button"
                                disabled={!item.preview}
                                onClick={() => {
                                  const url = URL.createObjectURL(item.file);
                                  window.open(url, "_blank", "noopener,noreferrer");
                                  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
                                }}
                              >
                                <PaperEditorIcon name="uploadOpen" />
                                {uiText(3863)}
                              </button>
                              <button type="button" onClick={() => setUploadView("details")}>
                                <PaperEditorIcon name="uploadDetails" />
                                {uiText(3864)}
                              </button>
                              <button
                                type="button"
                                disabled={!item.preview}
                                onClick={() => insertUpload(item)}
                              >
                                <PaperEditorIcon name="uploadInsert" />
                                {uiText(3865)}
                              </button>
                              <button type="button" onClick={() => setUploadView("remove")}>
                                <ShelfToolIcon name="trash" />
                                {uiText(3866)}
                              </button>
                            </>
                          )}
                          {uploadView === "rename" && (
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                const name = String(
                                  new FormData(event.currentTarget).get("name") ?? "",
                                ).trim();
                                if (!name) return;
                                setUploads((current) =>
                                  current.map((entry) =>
                                    entry.id === item.id ? { ...entry, name } : entry,
                                  ),
                                );
                                setUploadView("actions");
                              }}
                            >
                              <input
                                aria-label={uiText(3867)}
                                name="name"
                                defaultValue={item.name ?? item.file.name}
                                maxLength={160}
                                required
                              />
                              <button type="submit">
                                <PaperEditorIcon name="save" />
                                {uiText(3868)}
                              </button>
                            </form>
                          )}
                          {uploadView === "details" && (
                            <small>
                              {item.file.type || "Arquivo"} ·{" "}
                              {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
                                item.file.size / 1024,
                              )}{" "}
                              {uiText(3869)}
                            </small>
                          )}
                          {uploadView === "remove" && (
                            <>
                              <small>{uiText(3870)}</small>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploads((current) =>
                                    current.filter((entry) => entry.id !== item.id),
                                  );
                                  uploadCount.current--;
                                  setUploadMenu(undefined);
                                }}
                              >
                                <ShelfToolIcon name="trash" />
                                {uiText(3871)}
                              </button>
                            </>
                          )}
                          {uploadView !== "actions" && (
                            <button type="button" onClick={() => setUploadView("actions")}>
                              {uiText(374)}
                            </button>
                          )}
                        </div>,
                        document.body,
                      )}
                  </div>
                ))}
              </div>
            </>
          }
          onSave={() => save(false)}
          onPng={exportPng}
          onPdf={exportPdf}
          onPrint={printPage}
          menuOpen={fileMenuOpen}
          onMenuChange={(open) => {
            setFileMenuOpen(open);
            if (open) setUploadOpen(false);
            if (open) setPaperSectionsOpen({ paper: false, color: false });
          }}
        />
        {captureActions}
      </div>

      {writingWindowOpen && (
        <HandwritingWritingWindow
          canvasRef={writingCanvasRef}
          view={{
            x: writingWindowX,
            y: writingWindowY,
            zoom: writingWindowZoom,
            aspect: writingWindowAspect,
          }}
          page={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
          tool={tool}
          onNavigate={navigateWritingWindow}
          onStart={startWritingWindow}
          onMove={moveWritingWindow}
          onFinish={finishWritingWindow}
        />
      )}

      <div
        className={`handwriting-workspace${rightPanelCount ? " handwriting-workspace--brushes" : ""}${rightPanelCount > 1 ? " handwriting-workspace--panels-two" : ""}`}
        inert={fileAction === "import"}
      >
        <HandwritingColorDock
          active
          color={color}
          onColorChange={(next) => {
            setColor(next);
            // Escolher uma cor com a borracha na mão volta para a caneta, como nos outros apps.
            if (tool === "eraser") setTool("pen");
          }}
        />
        <div className="handwriting-shape-badge" role="status" aria-live="polite">
          {shapeBadge
            ? [
                {
                  line: uiText("Reta"),
                  ellipse: uiText(1665),
                  rectangle: uiText(197),
                  triangle: uiText(227),
                  arrow: uiText(1666),
                  polygon: uiText(228),
                }[shapeBadge.kind],
                shapeBadge.detail,
              ]
                .filter(Boolean)
                .join(" ")
            : null}
        </div>
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
          {...(onApplyPaperToNotebook ? { onApplyToNotebook: applyPaperToNotebook } : {})}
        />

        <div
          className="handwriting-viewport handwriting-viewport--board"
          onDragOver={(event) => {
            if (
              event.dataTransfer.types.some(
                (type) => type === "Files" || type === "application/x-olena-upload",
              )
            )
              event.preventDefault();
          }}
          onDrop={(event) => {
            const id = event.dataTransfer.getData("application/x-olena-upload");
            const listed = uploads.find((item) => item.id === id);
            const files = Array.from(event.dataTransfer.files);
            if (!listed && !files.length) return;
            event.preventDefault();
            if (listed && canvasRef.current) {
              void insertUpload(
                listed,
                canvasPoint(canvasRef.current, {
                  clientX: event.clientX,
                  clientY: event.clientY,
                  pressure: 0.5,
                }),
              );
            } else {
              addUploads(files);
              setFileMenuOpen(false);
              setUploadOpen(true);
            }
          }}
          ref={viewportRef}
          {...middleMousePan}
        >
          {(tool === "hand" || tool === "zoom-in" || tool === "zoom-out") && (
            <span className="handwriting-viewport-hint" aria-hidden="true">
              {tool === "hand" ? uiText(316) : tool === "zoom-in" ? uiText(317) : uiText(318)}
            </span>
          )}
          {penDiagnostics && <HandwritingPenMeterPanel meter={penMeter.meter} sheet={canvasRef} />}
          <div
            data-page-turn={pageTurn ?? undefined}
            data-paper-color={paperColor}
            inert={pageTurn !== null}
            className={"handwriting-page-shell" + (transforming ? " is-transforming" : "")}
            style={{
              width: displayWidth,
              height: (displayWidth / PAGE_WIDTH) * PAGE_HEIGHT,
              ["--handwriting-page-width" as string]: displayWidth + "px",
            }}
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
                      pointerEvents: "none",
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
                      aria-label={uiText(319)}
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
                      {uiText(316)}
                    </button>
                    <button
                      type="button"
                      data-resize
                      className="handwriting-import-resize"
                      aria-label={uiText(320)}
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
              tool === "hand" &&
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
                    aria-label={uiText(319)}
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
                    {uiText(316)}
                  </button>
                  <button
                    type="button"
                    data-resize
                    className="handwriting-import-resize"
                    aria-label={uiText(320)}
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
                    aria-label={uiText(321)}
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
            {tool === "curve" && !textMode && (
              <svg
                className="handwriting-ruler-overlay handwriting-curve-overlay"
                viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
                aria-hidden="true"
              >
                {(() => {
                  const preview = splinePoints(
                    curveDrag ? [...curveControls, curveDrag] : curveControls,
                  );
                  return preview.length > 1 ? (
                    <path
                      d={`M${preview.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={Math.max(2, width * 0.65)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={dash ? (dash === "dashed" ? "14 12" : "1 10") : undefined}
                      opacity="0.85"
                    />
                  ) : null;
                })()}
                {curveControls.map((control, index) => (
                  <rect
                    key={`${control.x}-${control.y}-${index}`}
                    x={control.x - 7}
                    y={control.y - 7}
                    width="14"
                    height="14"
                    fill="#7433e0"
                    stroke="#fff9ef"
                    strokeWidth="2"
                  />
                ))}
                {curveDrag && (
                  <rect
                    x={curveDrag.x - 7}
                    y={curveDrag.y - 7}
                    width="14"
                    height="14"
                    fill="#facc15"
                    stroke="#7433e0"
                    strokeWidth="2"
                  />
                )}
                {curveCursor && !curveDrag && (
                  <path
                    d={`M${curveCursor.x - 14} ${curveCursor.y}H${curveCursor.x + 14}M${curveCursor.x} ${curveCursor.y - 14}V${curveCursor.y + 14}`}
                    stroke="#7433e0"
                    strokeWidth="3"
                  />
                )}
              </svg>
            )}
            {tool === "curve" && !textMode && curveControls.length > 0 && (
              <p className="visually-hidden" role="status" aria-live="polite">
                {curveControls.length === 1 ? uiText(1707) : uiText(1708, [curveControls.length])}
                {uiText(2563)}
              </p>
            )}
            {tool === "space" && !textMode && (
              <svg
                className="handwriting-ruler-overlay handwriting-space-overlay"
                viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
                aria-hidden="true"
              >
                {spaceDrag && spaceDrag.shift !== 0 && (
                  <rect
                    x="0"
                    y={Math.min(spaceDrag.y, spaceDrag.y + spaceDrag.shift)}
                    width={PAGE_WIDTH}
                    height={Math.abs(spaceDrag.shift)}
                    fill="#facc15"
                    opacity="0.35"
                  />
                )}
                <path
                  d={`M0 ${spaceDrag ? spaceDrag.y : spaceGuideY}H${PAGE_WIDTH}`}
                  fill="none"
                  stroke="#7433e0"
                  strokeWidth="4"
                  strokeDasharray="18 12"
                />
                <rect
                  x="0"
                  y={(spaceDrag ? spaceDrag.y : spaceGuideY) - 14}
                  width="28"
                  height="28"
                  fill="#7433e0"
                />
                {spaceDrag && spaceDrag.shift !== 0 && (
                  <text x="44" y={spaceDrag.y - 12} fill="#51259b" fontSize="30" fontWeight="700">
                    {spaceDrag.shift > 0 ? uiText(322) : uiText(323)}
                  </text>
                )}
              </svg>
            )}
            {coordinateMeasure && (
              <svg
                className="handwriting-ruler-overlay"
                viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
                aria-label={uiText(324)}
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
                  ? uiText(325)
                  : tool === "zoom-out"
                    ? uiText(326)
                    : tool === "hand"
                      ? uiText(327)
                      : tool === "select"
                        ? uiText(328)
                        : tool === "curve"
                          ? uiText(329)
                          : tool === "space"
                            ? uiText(330)
                            : uiText(331)
              }
              onDoubleClick={(event) => {
                if (tool !== "select" || copiedTextStyle) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const id = pickAt(
                  selectionScene,
                  canvasPoint(canvas, {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    pressure: 0.5,
                  }),
                ).ids.at(-1);
                const target = stickies.find((item) => item.id === id);
                if (!target && id !== PAGE_TEXT_SELECTION_ID) return;
                editObject(target?.id ?? PAGE_TEXT_SELECTION_ID, event.clientX, event.clientY);
                requestAnimationFrame(() => {
                  const input = target
                    ? canvas.parentElement?.querySelector(
                        '[data-sticky-id="' + CSS.escape(target.id) + '"] textarea',
                      )
                    : canvas.parentElement?.querySelector(".handwriting-full-page-text");
                  if (input instanceof HTMLTextAreaElement) {
                    input.focus();
                    input.select();
                  }
                });
              }}
              onClick={(event) => {
                const press = objectClickRef.current;
                objectClickRef.current = null;
                if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 3)
                  editObject(press.id, event.clientX, event.clientY);
              }}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
              onLostPointerCapture={finish}
              onPointerLeave={() => {
                if (hoverPointRef.current) {
                  hoverPointRef.current = null;
                  paintLive();
                }
              }}
              onKeyDown={handleCanvasKeyDown}
            />
            <canvas
              ref={coordinateCanvasRef}
              className="handwriting-scene-layer"
              style={{ zIndex: layerDepth("coordinates") }}
              aria-hidden="true"
            />
            <canvas
              ref={textCanvasRef}
              className="handwriting-scene-layer"
              style={{ zIndex: layerDepth("text") }}
              aria-hidden="true"
            />
            <canvas
              ref={inkCanvasRef}
              className="handwriting-scene-layer handwriting-committed-ink"
              style={{ zIndex: layerDepth("strokes") }}
              aria-hidden="true"
            />
            <canvas
              ref={selectionCanvasRef}
              className="handwriting-scene-layer"
              style={{ zIndex: completeLayerOrder.length + 1 }}
              aria-hidden="true"
            />
            <canvas
              ref={liveCanvasRef}
              style={{
                zIndex: layerDepth("strokes"),
                visibility: layerVisibility.strokes ? undefined : "hidden",
              }}
              className="handwriting-live-layer"
              width={PAGE_WIDTH}
              height={PAGE_HEIGHT}
              aria-hidden="true"
            />
            {remoteCursors?.map((cursor) => (
              <div
                key={cursor.participantId}
                className="handwriting-remote-cursor"
                aria-hidden="true"
                style={{
                  left: `${(cursor.x / PAGE_WIDTH) * 100}%`,
                  top: `${(cursor.y / PAGE_HEIGHT) * 100}%`,
                  ["--cursor-color" as string]: cursorColor(cursor.participantId),
                }}
              >
                <span className="handwriting-remote-cursor__dot" />
                <span className="handwriting-remote-cursor__name">{cursor.displayName}</span>
              </div>
            ))}
            {!textMode && pageText && layerVisibility.text && (
              <button
                type="button"
                className="handwriting-legacy-text-target"
                aria-label={uiText(332)}
                style={{
                  pointerEvents: tool === "select" ? "none" : undefined,
                  zIndex: layerDepth("text"),
                  left: (pageTextFrame.x / PAGE_WIDTH) * 100 + "%",
                  top: (pageTextFrame.y / PAGE_HEIGHT) * 100 + "%",
                  width: (pageTextFrame.width / PAGE_WIDTH) * 100 + "%",
                }}
                onClick={() => {
                  setEditingTextId(null);
                  setTextMode(true);
                }}
              />
            )}
            {textMode && !editingTextId && layerVisibility.text && (
              <div
                className="handwriting-text-frame"
                style={{
                  zIndex: layerDepth("text"),
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
                  aria-label={uiText(332)}
                  onKeyDown={adjustTextFrameWithKeyboard}
                >
                  <PaperEditorIcon name="hand" />
                </button>
                <div className="handwriting-text-frame-size" aria-label={uiText(333)}>
                  <button
                    type="button"
                    aria-label={uiText(334)}
                    disabled={pageTextSize <= 16}
                    onClick={() => {
                      remember();
                      setPageTextSize((size) => Math.max(16, size - 2));
                    }}
                  >
                    {uiText(335)}
                  </button>
                  <span>
                    <PaperDigits value={String(pageTextSize)} />
                    <b className="handwriting-text-unit">{uiText(219)}</b>
                  </span>
                  <button
                    type="button"
                    aria-label={uiText(336)}
                    disabled={pageTextSize >= 144}
                    onClick={() => {
                      remember();
                      setPageTextSize((size) => Math.min(144, size + 2));
                    }}
                  >
                    {uiText(337)}
                  </button>
                </div>
                <textarea
                  className="handwriting-full-page-text"
                  aria-label={uiText(338)}
                  placeholder={uiText(339)}
                  value={pageText}
                  spellCheck
                  lang={uiLocale()}
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  wrap="soft"
                  style={{
                    fontSize: `${(pageTextSize * displayWidth) / PAGE_WIDTH}px`,
                    lineHeight: `${(pageTextSize * (40 / 28) * displayWidth) / PAGE_WIDTH}px`,
                    color: pageTextFrame.ink ?? (paperColor === "night" ? "#fff9ef" : "#17151c"),
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
                      setError(uiText(340));
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
                  aria-label={uiText(341)}
                  onKeyDown={adjustTextFrameWithKeyboard}
                >
                  <PaperEditorIcon name="resize" />
                </button>
              </div>
            )}
            {styleMessage && (
              <span className="handwriting-style-status" role="status">
                {styleMessage}
              </span>
            )}
            {floatingSelection && !transforming && !copiedTextStyle && (
              <HandwritingSelectionToolbar
                selection={floatingSelection}
                canvasRef={canvasRef}
                viewportRef={viewportRef}
                depth={completeLayerOrder.length + 2}
                onRotationSideChange={setRotationSide}
              >
                <HandwritingToolTips
                  className="handwriting-selection-float__tools"
                  role="group"
                  label={uiText(195)}
                >
                  <button type="button" aria-label={uiText(201)} onClick={copySelection}>
                    <PaperEditorIcon name="copyLink" />
                  </button>
                  <button type="button" aria-label={uiText(204)} onClick={duplicateSelection}>
                    <PaperEditorIcon name="add" />
                  </button>
                  <button type="button" aria-label={uiText(210)} onClick={deleteSelection}>
                    <PaperEditorIcon name="trash" />
                  </button>
                  {selectedText && (
                    <button
                      type="button"
                      aria-label={uiText(3788)}
                      aria-pressed={Boolean(copiedTextStyle)}
                      onClick={copyTextStyle}
                    >
                      <PaperEditorIcon name="highlighter" />
                    </button>
                  )}
                  <details
                    key={selectedIds.join(",")}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && event.currentTarget.open) {
                        event.stopPropagation();
                        event.currentTarget.open = false;
                        event.currentTarget.querySelector("summary")?.focus();
                      }
                    }}
                  >
                    <summary aria-label={uiText(195)}>
                      <PaperEditorIcon name="more" />
                    </summary>
                    <div
                      className="handwriting-selection-float__menu"
                      onClick={(event) => {
                        if (event.target instanceof Element && event.target.closest("button"))
                          event.currentTarget.closest("details")?.removeAttribute("open");
                      }}
                    >
                      <button type="button" onClick={cutSelection}>
                        <PaperEditorIcon name="cut" />
                        {uiText(203)}
                      </button>
                      <button type="button" disabled={!canPaste} onClick={pasteSelection}>
                        <PaperEditorIcon name="selectionPaste" />
                        {uiText(200)}
                      </button>
                      {strokes.some((stroke) => selectedIds.includes(stroke.id)) && (
                        <button type="button" onClick={alignSelection}>
                          <PaperEditorIcon name="select" />
                          {uiText(205)}
                        </button>
                      )}
                      {selectedSticky?.kind === undefined && selectedSticky && (
                        <button type="button" onClick={() => toggleStickyChecklist(selectedSticky)}>
                          <PaperEditorIcon name="review" />
                          {selectedSticky.checklist?.length ? uiText(269) : uiText(1688)}
                        </button>
                      )}
                      {selectedSticky && selectedSticky.kind !== "text" && (
                        <div
                          className="handwriting-selection-float__colors"
                          aria-label={uiText(271)}
                        >
                          {(["yellow", "blue", "lilac"] as const).map((nextColor) => (
                            <button
                              type="button"
                              key={nextColor}
                              aria-label={uiText(1691, [
                                nextColor === "yellow"
                                  ? "amarela"
                                  : nextColor === "blue"
                                    ? "azul"
                                    : uiText(1690),
                              ])}
                              aria-pressed={selectedSticky.color === nextColor}
                              style={{
                                background:
                                  nextColor === "yellow"
                                    ? "#ffedab"
                                    : nextColor === "blue"
                                      ? "#bfdef1"
                                      : "#ddc7f5",
                              }}
                              onClick={() => {
                                remember();
                                updateSticky(selectedSticky.id, { color: nextColor });
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={exportSelectedPng}>
                        <PaperEditorIcon name="download" />
                        {uiText(3795)}
                      </button>
                    </div>
                  </details>
                </HandwritingToolTips>
              </HandwritingSelectionToolbar>
            )}
            {layerVisibility.stickies && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: layerDepth("stickies"),
                  pointerEvents: "none",
                }}
              >
                {stickies.map((sticky) => (
                  <HandwritingStickyNote
                    key={sticky.id}
                    sticky={sticky}
                    selectionManaged
                    pageWidth={PAGE_WIDTH}
                    pageHeight={PAGE_HEIGHT}
                    isSelected={!textMode && selectedIds.includes(sticky.id)}
                    ignorePointer={!textMode || editingTextId !== sticky.id}
                    menuOpen={stickyMenuId === sticky.id}
                    {...(sticky.kind === "text" && !sticky.formula
                      ? {
                          editingText: textMode && editingTextId === sticky.id,
                          onEditText: () => {
                            setEditingTextId(sticky.id);
                            setTextMode(true);
                          },
                        }
                      : {})}
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
            )}
          </div>
        </div>
        {showToolCase && (
          <HandwritingToolCase
            key={tool}
            title={uiText(
              (
                {
                  eraser: "Borracha",
                  highlighter: "Marca-texto",
                  ruler: "Réguas",
                  curve: "Curva",
                  coordinates: "Sistema de coordenadas",
                } as Record<string, string>
              )[tool] ?? "Ferramentas",
            )}
          >
            {inkOptions}
            {showRulerPanel && (
              <div className="handwriting-tool-case-variants">
                {" "}
                <HandwritingRulerPanel
                  rulerUnit={rulerUnit}
                  rulerKind={rulerKind}
                  onRulerUnitChange={setRulerUnit}
                  onRulerKindChange={setRulerKind}
                />
              </div>
            )}
            {showCoordinatePanel && (
              <div className="handwriting-tool-case-variants">
                {" "}
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
              </div>
            )}
          </HandwritingToolCase>
        )}
        {showBrushPanel && (
          <HandwritingBrushPanel brush={brush} color={color} onBrushChange={setBrush}>
            {!phoneLayout && inkOptions}
          </HandwritingBrushPanel>
        )}
        {phoneLayout && showRulerPanel && (
          <HandwritingRulerPanel
            rulerUnit={rulerUnit}
            rulerKind={rulerKind}
            onRulerUnitChange={setRulerUnit}
            onRulerKindChange={setRulerKind}
          />
        )}
        {phoneLayout && showCoordinatePanel && (
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
            onMoveLayer={(layer, direction) => moveLayer(layer, direction === -1 ? 1 : -1)}
          />
        )}
      </div>

      {/Falha|Sem espaço/.test(draftStatus) && <p role="alert">{draftStatus}</p>}
      {saveConfirmation > 0 && (
        <p className="handwriting-save-status" role="status" aria-live="polite">
          {uiText(342)}
        </p>
      )}
      {preferenceError && <p role="status">{preferenceError}</p>}
      {error && <p className="capture-error">{uiText(error)}</p>}
      {onSelectPage && onCreatePage && (
        <div
          className="handwriting-page-navigation"
          data-open={pageNavigationOpen}
          inert={fileAction === "import"}
        >
          <button
            type="button"
            className="handwriting-page-navigation__toggle"
            aria-label={uiText(695)}
            aria-expanded={pageNavigationOpen}
            onClick={() => setPageNavigationOpen((open) => !open)}
          >
            <FocusPaperArrow />
          </button>
          <NotebookPageBook
            pages={notebookPages}
            currentPreview={navigationPreview}
            onTurn={setPageTurn}
            currentPageId={currentPageId ?? draftKey}
            inert={!pageNavigationOpen}
            onSelect={(id) => switchPage(() => onSelectPage?.(id))}
            onCreate={() => switchPage(() => onCreatePage())}
            {...(onRemovePage ? { onRemove: onRemovePage } : {})}
            {...(onMovePage ? { onMove: onMovePage } : {})}
          />
        </div>
      )}
      {fileAction === "import" && (
        <Suspense fallback={<HelenaLoading label={uiText(343)} compact />}>
          <PageImport
            initialFile={incomingFile}
            onClose={closeImport}
            onImportMany={(pages) => {
              onImportPages?.(pages);
              closeImport();
            }}
            onImport={(image, frame) => {
              if (!frame) return;
              placeUpload(image, frame.width, frame.height, dropPoint);
              closeImport();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
