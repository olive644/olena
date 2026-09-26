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
  return (
    <div className="handwriting-history" aria-label="Histórico">
      {textMode && (
        <button
          type="button"
          className={textAutoCorrect ? "is-active" : ""}
          aria-label="Correção automática de texto"
          aria-pressed={textAutoCorrect}
          title="Corrige acentos comuns e início de frases ao sair da área de texto"
          onClick={() => onToggleAutoCorrect()}
        >
          <PaperEditorIcon name="review" /> <span>Correção automática</span>
        </button>
      )}
      <output className="handwriting-zoom-value" aria-label="Zoom atual">
        {Math.round(zoom * 100)}%
      </output>
      <span className="handwriting-commandbar__divider" />
      <button type="button" aria-label="Desfazer" disabled={!canUndo} onClick={onUndo}>
        <PaperEditorIcon name="undo" />
        <span className="editor-action-label">Desfazer</span>
      </button>
      <button type="button" aria-label="Refazer" disabled={!canRedo} onClick={onRedo}>
        <PaperEditorIcon name="redo" />
        <span className="editor-action-label">Refazer</span>
      </button>
      <button type="button" aria-label="Limpar folha" disabled={!canClear} onClick={onClear}>
        <PaperEditorIcon name="trash" />
        <span className="editor-action-label">Limpar</span>
      </button>
    </div>
  );
}
