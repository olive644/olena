import {
  resizeWritingWindow,
  type WritingResizeBox,
  type WritingResizeEdge,
} from "./handwriting-writing-window-resize";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWritingWindowNavigation } from "../hooks/use-writing-window-navigation";
import type { WritingView, WritingPageSize } from "./handwriting-writing-view";
import { uiText, useLanguage } from "../i18n/runtime";
import {
  clampWritingWindow,
  fromFraction,
  readWritingWindowFraction,
  toFraction,
  writeWritingWindowFraction,
  type WritingWindowPoint,
} from "./handwriting-writing-window-position";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";

type HandwritingWritingWindowProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  view: WritingView;
  page: WritingPageSize;
  tool: string;
  onNavigate: (view: WritingView) => void;
  onStart: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
};

const KEY_STEP = 16;

export function HandwritingWritingWindow({
  canvasRef,
  view,
  page,
  tool,
  onNavigate,
  onStart,
  onMove,
  onFinish,
}: HandwritingWritingWindowProps) {
  useLanguage();
  const navigation = useWritingWindowNavigation({ canvasRef, view, page, tool, onNavigate });
  const rootRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<WritingWindowPoint | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();
  const resizeRef = useRef<{
    id: number;
    edge: WritingResizeEdge;
    startX: number;
    startY: number;
    origin: WritingResizeBox;
    area: WritingResizeBox;
    next: WritingResizeBox;
  } | null>(null);
  const resizeFrame = useRef(0);
  const fractionRef = useRef<WritingWindowPoint | null>(readWritingWindowFraction());
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: WritingWindowPoint;
  } | null>(null);

  // A janela flutua sobre o editor (o pai posicionado dela), mas só dentro da área de escrita: assim
  // nunca cobre as ferramentas nem a barra de baixo.
  const measure = useCallback(() => {
    const root = rootRef.current;
    const parent = root?.offsetParent;
    if (!root || !(parent instanceof HTMLElement)) return null;
    const viewport = parent.querySelector<HTMLElement>(".handwriting-viewport");
    // As coordenadas da janela são relativas ao pai posicionado dela; o viewport pode ter outro pai
    // posicionado, então a origem vem da diferença entre os retângulos na tela.
    const parentRect = parent.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();
    return {
      area: viewportRect
        ? {
            x: viewportRect.left - parentRect.left - parent.clientLeft,
            y: viewportRect.top - parentRect.top - parent.clientTop,
            width: viewportRect.width,
            height: viewportRect.height,
          }
        : { x: 0, y: 0, width: parent.clientWidth, height: parent.clientHeight },
      size: { width: root.offsetWidth, height: root.offsetHeight },
    };
  }, []);

  // Posição inicial: a lembrada neste aparelho ou, sem ela, centralizada logo acima da folha.
  const place = useCallback(() => {
    const box = measure();
    if (!box) return;
    const saved = fractionRef.current;
    setPosition(
      saved
        ? fromFraction(saved, box.area, box.size)
        : clampWritingWindow(
            {
              x: box.area.x + (box.area.width - box.size.width) / 2,
              y: box.area.y + 8,
            },
            box.area,
            box.size,
          ),
    );
  }, [measure]);

  useLayoutEffect(() => {
    place();
  }, [place]);

  // Telas que mudam de tamanho (girar o celular, redimensionar) mantêm a janela visível.
  useEffect(() => {
    const area = rootRef.current?.offsetParent;
    if (!(area instanceof HTMLElement)) return;
    const keepVisible = () => {
      const box = measure();
      if (!box) return;
      const current = rootRef.current;
      if (!current || resizeRef.current) return;
      const rect = current.getBoundingClientRect();
      const parent = current.offsetParent;
      if (!(parent instanceof HTMLElement)) return;
      const parentRect = parent.getBoundingClientRect();
      const next = resizeWritingWindow(
        {
          x: rect.left - parentRect.left - parent.clientLeft,
          y: rect.top - parentRect.top - parent.clientTop,
          ...box.size,
        },
        "se",
        0,
        0,
        box.area,
      );
      setSize({ width: next.width, height: next.height });
      setPosition({ x: next.x, y: next.y });
    };
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", keepVisible);
      return () => {
        window.removeEventListener("resize", keepVisible);
        cancelAnimationFrame(resizeFrame.current);
        resizeRef.current = null;
      };
    }
    const observer = new ResizeObserver(keepVisible);
    observer.observe(area);
    const viewport = area.querySelector(".handwriting-viewport");
    if (viewport) observer.observe(viewport);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame.current);
      resizeRef.current = null;
    };
  }, [measure]);

  function moveTo(next: WritingWindowPoint, remember: boolean) {
    const box = measure();
    if (!box) return;
    const point = clampWritingWindow(next, box.area, box.size);
    setPosition(point);
    if (remember) {
      const fraction = toFraction(point, box.area, box.size);
      fractionRef.current = fraction;
      writeWritingWindowFraction(fraction);
    }
  }

  function onGripDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 && event.pointerType !== "pen" && event.pointerType !== "touch") return;
    if (!position) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
    };
  }

  function onGripMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    moveTo(
      {
        x: drag.origin.x + event.clientX - drag.startX,
        y: drag.origin.y + event.clientY - drag.startY,
      },
      false,
    );
  }

  function onGripUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (position) moveTo(position, true);
  }

  function onGripKey(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!position) return;
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    moveTo({ x: position.x + move[0], y: position.y + move[1] }, true);
  }

  function applyResize(next: WritingResizeBox) {
    setPosition({ x: next.x, y: next.y });
    setSize({ width: next.width, height: next.height });
  }
  function endResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = resizeRef.current;
    if (!current || current.id !== event.pointerId) return;
    cancelAnimationFrame(resizeFrame.current);
    resizeRef.current = null;
    const next = event.type === "pointercancel" ? current.origin : current.next;
    applyResize(next);
    const fraction = toFraction(next, current.area, next);
    fractionRef.current = fraction;
    writeWritingWindowFraction(fraction);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <section
      ref={rootRef}
      className="handwriting-writing-window"
      aria-label={uiText(368)}
      style={{
        ...(position ? { left: position.x, top: position.y } : {}),
        ...(size ? { width: size.width, height: size.height } : {}),
      }}
      data-resized={Boolean(size)}
    >
      <button
        type="button"
        className="handwriting-writing-window__grip"
        aria-label={uiText(3879)}
        title={uiText(3880)}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onPointerCancel={onGripUp}
        onKeyDown={onGripKey}
      />
      <div className="handwriting-writing-window__paper">
        <canvas
          ref={canvasRef}
          width={600}
          height={220}
          aria-label={uiText(372)}
          onPointerDown={(event) => {
            if (!navigation.start(event)) onStart(event);
          }}
          onPointerMove={(event) => {
            if (!navigation.move(event)) onMove(event);
          }}
          onPointerUp={(event) => {
            if (!navigation.end(event)) onFinish(event);
          }}
          onPointerCancel={(event) => {
            if (!navigation.end(event)) onFinish(event);
          }}
          onLostPointerCapture={(event) => {
            navigation.end(event);
          }}
          onAuxClick={(event) => {
            if (event.button === 1) event.preventDefault();
          }}
        />
      </div>
      {(["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const).map((edge) => (
        <button
          key={edge}
          type="button"
          className={"handwriting-writing-window__resize is-" + edge}
          aria-label={uiText("Redimensionar janela") + " " + edge.toUpperCase()}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const box = measure();
            if (!box || !position) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            const origin = { ...position, ...box.size };
            resizeRef.current = {
              id: event.pointerId,
              edge,
              startX: event.clientX,
              startY: event.clientY,
              origin,
              area: box.area,
              next: origin,
            };
          }}
          onPointerMove={(event) => {
            const current = resizeRef.current;
            if (!current || current.id !== event.pointerId) return;
            current.next = resizeWritingWindow(
              current.origin,
              edge,
              event.clientX - current.startX,
              event.clientY - current.startY,
              current.area,
            );
            cancelAnimationFrame(resizeFrame.current);
            resizeFrame.current = requestAnimationFrame(() => applyResize(current.next));
          }}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onLostPointerCapture={endResize}
          onKeyDown={(event) => {
            const box = measure();
            if (!box || !position) return;
            const step = event.shiftKey ? 32 : 8;
            const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
            const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
            if (!dx && !dy) return;
            event.preventDefault();
            applyResize(resizeWritingWindow({ ...position, ...box.size }, edge, dx, dy, box.area));
          }}
        />
      ))}{" "}
    </section>
  );
}
