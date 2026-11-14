import { HandwritingToolTips } from "./handwriting-tool-tips";
import { PaperEditorIcon } from "./paper-editor-icon";
import { uiText, useLanguage } from "../i18n/runtime";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

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

  return (
    <section className="handwriting-writing-window" aria-label={uiText(368)}>
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
