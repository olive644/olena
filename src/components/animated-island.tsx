import { useEffect, useRef, useState } from "react";
import { useMotionReduced } from "../data/accessibility-preferences";
import { stepEnvelope } from "../domain/island-motion";
import type { PlaceRig } from "../domain/place-rig";
import { buildIslandSprites, drawIsland, groupDelta, type IslandSprites } from "./island-sprites";

/** Lado da arte das ilhas (public/practice-islands/*.webp). */
const ART_SIZE = 800;
const spritesBySource = new Map<string, Promise<IslandSprites | null>>();

function loadSprites(source: string, rig: PlaceRig | undefined): Promise<IslandSprites | null> {
  const cached = spritesBySource.get(source);
  if (cached) return cached;
  const promise = new Promise<IslandSprites | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      buildIslandSprites(image, ART_SIZE, undefined, rig).then(resolve, () => resolve(null));
    };
    image.onerror = () => resolve(null);
    image.src = source;
  });
  spritesBySource.set(source, promise);
  return promise;
}

/** Espera o navegador ficar ocioso: a análise da arte não deve disputar tempo com o carrossel. */
function afterIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 250);
  return () => window.clearTimeout(id);
}

export type IslandShift = { x: number; y: number };

/**
 * Anima uma ilha de estudo sobre a própria arte. O `<img>` do carrossel continua existindo (texto
 * alternativo e carregamento) e só fica transparente depois que o primeiro quadro está pronto.
 * Em movimento reduzido, sem canvas ou sem a arte, nada é desenhado e a imagem parada segue valendo.
 */
export function AnimatedIsland({
  source,
  active,
  anchor = { x: 0.5, y: 0.5 },
  rig,
  className = "practice-island-canvas",
  onReadyChange,
  onShift,
}: {
  source: string;
  active: boolean;
  /** Ponto da arte (0 a 1) que acompanha a ilha, por exemplo onde fica o avatar. */
  anchor?: { x: number; y: number };
  /** Partes móveis recortadas da arte (lugares da ilha de Matemática). Sem isto, é a ilha inteira. */
  rig?: PlaceRig;
  /** Classe do canvas, para o CSS de quem hospeda a animação. */
  className?: string;
  onReadyChange?: (ready: boolean) => void;
  /** Deslocamento, em pixels da tela, do ponto de ancoragem neste quadro. */
  onShift?: (shift: IslandShift) => void;
}) {
  const reduced = useMotionReduced();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sprites, setSprites] = useState<IslandSprites | null>(null);
  const activeRef = useRef(active);
  const onReadyRef = useRef(onReadyChange);
  const onShiftRef = useRef(onShift);
  const start = useRef<() => void>(() => {});

  useEffect(() => {
    activeRef.current = active;
    onReadyRef.current = onReadyChange;
    onShiftRef.current = onShift;
    if (active) start.current();
  }, [active, onReadyChange, onShift]);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const cancelIdle = afterIdle(() => {
      void loadSprites(source, rig).then((loaded) => {
        if (!cancelled) setSprites(loaded);
      });
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [source, rig, reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!sprites || reduced || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frameId = 0;
    let running = false;
    let last = performance.now();
    let envelope = 0;
    let reported = false;
    let lastWidth = 0;

    const fitCanvas = () => {
      const device = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * device));
      if (width === lastWidth) return;
      lastWidth = width;
      canvas.width = width;
      canvas.height = width;
    };
    const paint = (seconds: number, eased: number) => {
      fitCanvas();
      drawIsland(context, sprites, seconds, eased, canvas.width / sprites.logicalSize);
      // Quando só as partes se mexem, o avatar não sai do lugar.
      if (!sprites.model.group) return;
      const perArt = canvas.clientWidth / sprites.logicalSize;
      const delta = groupDelta(
        seconds,
        eased,
        sprites.size,
        anchor.x * sprites.size,
        anchor.y * sprites.size,
      );
      onShiftRef.current?.({ x: delta.dx * perArt, y: delta.dy * perArt });
    };
    const frame = (now: number) => {
      frameId = 0;
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      envelope = stepEnvelope(envelope, activeRef.current && !document.hidden, delta);
      paint(now / 1000, envelope * envelope * (3 - 2 * envelope));
      if (!reported) {
        reported = true;
        onReadyRef.current?.(true);
      }
      if (envelope > 0 || (activeRef.current && !document.hidden)) {
        frameId = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };
    start.current = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frameId = requestAnimationFrame(frame);
    };
    start.current();

    const resize = new ResizeObserver(() => {
      if (!running) paint(performance.now() / 1000, 0);
    });
    resize.observe(canvas);
    const visibility = () => {
      if (!document.hidden && activeRef.current) start.current();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      start.current = () => {};
      onShiftRef.current?.({ x: 0, y: 0 });
      onReadyRef.current?.(false);
    };
  }, [sprites, reduced, anchor.x, anchor.y]);

  if (reduced || !sprites) return null;
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
