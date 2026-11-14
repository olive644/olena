import { PaperDigits } from "./paper-digits";
import { ShelfToolIcon } from "./shelf-tool-icon";
import { HandwritingToolTips } from "./handwriting-tool-tips";
import { uiText, useLanguage } from "../i18n/runtime";
import { PaperEditorIcon } from "./paper-editor-icon";

type HandwritingHistoryBarProps = {
  textMode: boolean;
  textAutoCorrect: boolean;
  onToggleAutoCorrect: () => void;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canClear: boolean;
  onClear: () => void;
};

export function HandwritingHistoryBar({
  textMode,
  textAutoCorrect,
  onToggleAutoCorrect,
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canClear,
  onClear,
}: HandwritingHistoryBarProps) {
  useLanguage();

  return (
    <HandwritingToolTips className="handwriting-history" label={uiText(163)}>
      {textMode && (
        <button
          type="button"
          className={textAutoCorrect ? "is-active" : ""}
          aria-label={uiText(164)}
          aria-pressed={textAutoCorrect}
          onClick={() => onToggleAutoCorrect()}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path fill="#eadfc8" d="M3 2h12l4 4v16H3Z" />
            <path fill="#b7a68e" d="M15 2v5h4Z" />
            <path fill="#51465d" d="M6 7h7v2H6zm0 4h8v2H6z" />
            <path d="m10 17 3 3 8-8" fill="none" stroke="#218b73" strokeWidth="3" />
          </svg>
        </button>
      )}
      <output className="handwriting-zoom-value" aria-label={uiText(167)}>
        <PaperDigits value={String(Math.round(zoom * 100))} />
        <svg className="handwriting-zoom-percent" viewBox="0 0 20 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M2 2h6v7H2zm2 2v3h2V4zm8 11h6v7h-6zm2 2v3h2v-3zM2 20 15 2h4L6 20z"
            fillRule="evenodd"
          />
        </svg>
        <span className="visually-hidden">%</span>
      </output>
      <span className="handwriting-commandbar__divider" />
      <button type="button" aria-label={uiText(168)} disabled={!canUndo} onClick={onUndo}>
        <PaperEditorIcon name="undo" />
      </button>
      <button type="button" aria-label={uiText(169)} disabled={!canRedo} onClick={onRedo}>
        <PaperEditorIcon name="redo" />
      </button>
      <button type="button" aria-label={uiText(170)} disabled={!canClear} onClick={onClear}>
        <ShelfToolIcon name="trash" />
      </button>
    </HandwritingToolTips>
  );
}
