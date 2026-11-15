import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HandwritingToolTips } from "./handwriting-tool-tips";
import { PaperEditorIcon } from "./paper-editor-icon";
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
  status: string;
  onStart: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onBack: () => void;
  onAdvance: () => void;
  onNextLine: () => void;
};

const KEY_STEP = 16;

export function HandwritingWritingWindow({
  canvasRef,
  status,
  onStart,
  onMove,
  onFinish,
  onBack,
  onAdvance,
  onNextLine,
}: HandwritingWritingWindowProps) {
  useLanguage();
  const rootRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<WritingWindowPoint | null>(null);
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
      setPosition((current) =>
        current ? clampWritingWindow(current, box.area, box.size) : current,
      );
    };
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", keepVisible);
      return () => window.removeEventListener("resize", keepVisible);
    }
    const observer = new ResizeObserver(keepVisible);
    observer.observe(area);
    return () => observer.disconnect();
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

  return (
    <section
      ref={rootRef}
      className="handwriting-writing-window"
      aria-label={uiText(368)}
      style={position ? { left: position.x, top: position.y } : undefined}
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
          onPointerDown={onStart}
          onPointerMove={onMove}
          onPointerUp={onFinish}
          onPointerCancel={onFinish}
        />
      </div>
      <p className="handwriting-writing-window__status" aria-live="polite">
        {uiText(status)}
      </p>
      <HandwritingToolTips
        className="handwriting-writing-window__actions"
        label={uiText(368)}
        role="group"
      >
        <button
          className="secondary-button"
          type="button"
          aria-label={uiText(374)}
          onClick={onBack}
        >
          <PaperEditorIcon name="undo" />
        </button>
        <button
          className="secondary-button"
          type="button"
          aria-label={uiText(375)}
          onClick={onAdvance}
        >
          <PaperEditorIcon name="redo" />
        </button>
        <button
          className="secondary-button"
          type="button"
          aria-label={uiText(376)}
          onClick={onNextLine}
        >
          <PaperEditorIcon name="uploadInsert" />
        </button>
      </HandwritingToolTips>
    </section>
  );
}
