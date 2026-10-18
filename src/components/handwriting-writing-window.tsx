import { uiText, useLanguage } from "../i18n/runtime";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

type HandwritingWritingWindowProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: string;
  autoFollow: boolean;
  onAutoFollowChange: (enabled: boolean) => void;
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
  autoFollow,
  onAutoFollowChange,
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
      <div>
        <strong>{uiText(370)}</strong>
        <span>{uiText(371)}</span>
      </div>
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
      <p className="handwriting-writing-window__status" aria-live="polite">
        {uiText(status)}
      </p>
      <div className="handwriting-writing-window__actions">
        <label>
          <input
            type="checkbox"
            checked={autoFollow}
            onChange={(event) => onAutoFollowChange(event.target.checked)}
          />
          {uiText(373)}
        </label>
        <button type="button" onClick={onBack}>
          {uiText(374)}
        </button>
        <button type="button" onClick={onAdvance}>
          {uiText(375)}
        </button>
        <button type="button" onClick={onNextLine}>
          {uiText(376)}
        </button>
      </div>
    </section>
  );
}
