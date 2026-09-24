import { PaperEditorIcon } from "./paper-editor-icon";
import type { HandwritingTool } from "./handwriting-types";

type HandwritingHistoryBarProps = {
  textMode: boolean;
  textAutoCorrect: boolean;
  onToggleAutoCorrect: () => void;
  tool: HandwritingTool;
  onSelectTool: (tool: HandwritingTool) => void;
  zoom: number;
  onResetView: () => void;
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
  tool,
  onSelectTool,
  zoom,
  onResetView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canClear,
  onClear,
}: HandwritingHistoryBarProps) {
  return (
    <div className="handwriting-history" aria-label="Histórico e zoom">
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
      <button
        type="button"
        className={!textMode && tool === "zoom-out" ? "is-active" : ""}
        aria-label="Lupa para reduzir"
        aria-pressed={!textMode && tool === "zoom-out"}
        onClick={() => onSelectTool("zoom-out")}
      >
        <PaperEditorIcon name="zoomOut" />
        <span className="editor-action-label">Reduzir</span>
      </button>
      <button className="handwriting-zoom-value" type="button" onClick={onResetView}>
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className={!textMode && tool === "zoom-in" ? "is-active" : ""}
        aria-label="Lupa para ampliar"
        aria-pressed={!textMode && tool === "zoom-in"}
        onClick={() => onSelectTool("zoom-in")}
      >
        <PaperEditorIcon name="zoomIn" />
        <span className="editor-action-label">Ampliar</span>
      </button>
      <button type="button" aria-label="Redefinir visualização" onClick={onResetView}>
        <PaperEditorIcon name="reset" />
        <span className="editor-action-label">Redefinir</span>
      </button>
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
