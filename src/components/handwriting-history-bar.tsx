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
    <div className="handwriting-history" aria-label={uiText(163)}>
      {textMode && (
        <button
          type="button"
          className={textAutoCorrect ? "is-active" : ""}
          aria-label={uiText(164)}
          aria-pressed={textAutoCorrect}
          title={uiText(165)}
          onClick={() => onToggleAutoCorrect()}
        >
          <PaperEditorIcon name="review" /> <span>{uiText(166)}</span>
        </button>
      )}
      <output className="handwriting-zoom-value" aria-label={uiText(167)}>
        {Math.round(zoom * 100)}%
      </output>
      <span className="handwriting-commandbar__divider" />
      <button type="button" aria-label={uiText(168)} disabled={!canUndo} onClick={onUndo}>
        <PaperEditorIcon name="undo" />
        <span className="editor-action-label">{uiText(168)}</span>
      </button>
      <button type="button" aria-label={uiText(169)} disabled={!canRedo} onClick={onRedo}>
        <PaperEditorIcon name="redo" />
        <span className="editor-action-label">{uiText(169)}</span>
      </button>
      <button type="button" aria-label={uiText(170)} disabled={!canClear} onClick={onClear}>
        <PaperEditorIcon name="trash" />
        <span className="editor-action-label">{uiText(171)}</span>
      </button>
    </div>
  );
}
