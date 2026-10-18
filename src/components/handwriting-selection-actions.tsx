import { uiText, useLanguage } from "../i18n/runtime";
import type { HandwritingTool, SelectionMode } from "./handwriting-types";
import { PaperEditorIcon } from "./paper-editor-icon";

type HandwritingSelectionActionsProps = {
  tool: HandwritingTool;
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  selectedIds: readonly string[];
  selectedCoordinateIds: readonly string[];
  canAlign: boolean;
  onAlign: () => void;
  onScale: (factor: number) => void;
  onDelete: () => void;
  hasBackground: boolean;
  onRemoveBackground: () => void;
  hasSelectedImages: boolean;
  onRemoveSelectedImages: () => void;
  onRotate: (direction: -1 | 1) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onMove: () => void;
  canPaste: boolean;
  hasPageText: boolean;
  pageTextSize: number;
  onChangeTextSize: (delta: -2 | 2) => void;
  hasSelectedCoordinateSystem: boolean;
  selectedStrokeCount: number;
  formulaDraft: string;
  onFormulaDraftChange: (value: string) => void;
  ocrBusy: boolean;
  ocrProgress: number;
  onUseCoordinateFormula: () => void;
  onRecognizeFormula: () => void | Promise<void>;
  onInsertFormula: () => void;
};

export function HandwritingSelectionActions({
  tool,
  selectionMode,
  onSelectionModeChange,
  selectedIds,
  selectedCoordinateIds,
  canAlign,
  onAlign,
  onScale,
  onDelete,
  hasBackground,
  onRemoveBackground,
  hasSelectedImages,
  onRemoveSelectedImages,
  onRotate,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onSelectAll,
  onMove,
  canPaste,
  hasPageText,
  pageTextSize,
  onChangeTextSize,
  hasSelectedCoordinateSystem,
  selectedStrokeCount,
  formulaDraft,
  onFormulaDraftChange,
  ocrBusy,
  ocrProgress,
  onUseCoordinateFormula,
  onRecognizeFormula,
  onInsertFormula,
}: HandwritingSelectionActionsProps) {
  useLanguage();

  return (
    <div className="handwriting-selection-actions" aria-label={uiText(195)}>
      {tool === "select" && (
        <>
          <span>{uiText(196)}</span>
          <button
            type="button"
            aria-pressed={selectionMode === "rectangle"}
            onClick={() => onSelectionModeChange("rectangle")}
          >
            {uiText(197)}
          </button>
          <button
            type="button"
            aria-pressed={selectionMode === "lasso"}
            onClick={() => onSelectionModeChange("lasso")}
          >
            {uiText(198)}
          </button>
          <button type="button" onClick={onSelectAll}>
            {uiText(199)}
          </button>
          <button type="button" disabled={!canPaste} onClick={onPaste}>
            {uiText(200)}
          </button>
        </>
      )}
      {selectedIds.length > 0 && (
        <>
          <span role="status" aria-live="polite">
            {selectedIds.length} {selectedIds.length === 1 ? uiText(1661) : uiText(1662)}
          </span>
          <button type="button" onClick={onCopy}>
            {uiText(201)}
          </button>
          <button type="button" aria-pressed={tool === "hand"} onClick={onMove}>
            <PaperEditorIcon name="hand" /> {uiText(202)}
          </button>
          <button type="button" onClick={onCut}>
            {uiText(203)}
          </button>
          <button type="button" onClick={onDuplicate}>
            {uiText(204)}
          </button>
          <button type="button" disabled={!canAlign} onClick={onAlign}>
            {uiText(205)}
          </button>
          {!hasSelectedImages && (
            <>
              <button type="button" onClick={() => onRotate(-1)}>
                {uiText(206)}
              </button>
              <button type="button" onClick={() => onRotate(1)}>
                {uiText(207)}
              </button>
            </>
          )}
          <button type="button" onClick={() => onScale(1.12)}>
            {uiText(208)}
          </button>
          <button type="button" onClick={() => onScale(0.88)}>
            {uiText(209)}
          </button>
          <button type="button" onClick={onDelete}>
            {uiText(210)}
          </button>
        </>
      )}
      {selectedCoordinateIds.length > 0 && (
        <>
          <span role="status" aria-live="polite">
            {selectedCoordinateIds.length} {uiText(211)}
            {selectedCoordinateIds.length === 1 ? "" : "s"} {uiText(212)}
            {selectedCoordinateIds.length === 1 ? "" : "s"}
          </span>
          <button type="button" onClick={onDelete}>
            {uiText(213)}
          </button>
        </>
      )}
      {tool === "select" && hasBackground && (
        <>
          <span>{uiText(214)}</span>
          <button type="button" onClick={onRemoveBackground}>
            {uiText(215)}
          </button>
        </>
      )}
      {tool === "select" && hasSelectedImages && (
        <>
          <span>{uiText(216)}</span>
          <button type="button" onClick={onRemoveSelectedImages}>
            {uiText(217)}
          </button>
          <button type="button" onClick={() => onRotate(-1)}>
            {uiText(206)}
          </button>
          <button type="button" onClick={() => onRotate(1)}>
            {uiText(207)}
          </button>
        </>
      )}
      {tool === "select" && hasPageText && (
        <>
          <span>
            {uiText(218)} {pageTextSize}
            {uiText(219)}
          </span>
          <button type="button" disabled={pageTextSize <= 16} onClick={() => onChangeTextSize(-2)}>
            {uiText(220)}
          </button>
          <button type="button" disabled={pageTextSize >= 72} onClick={() => onChangeTextSize(2)}>
            {uiText(221)}
          </button>
        </>
      )}
      {tool === "select" && (hasSelectedCoordinateSystem || selectedStrokeCount > 0) && (
        <div className="handwriting-formula-assist">
          <span>{uiText(222)}</span>
          <input
            aria-label={uiText(223)}
            value={formulaDraft}
            maxLength={240}
            onChange={(event) => onFormulaDraftChange(event.target.value)}
            placeholder={uiText(224)}
          />
          {hasSelectedCoordinateSystem && (
            <button type="button" onClick={onUseCoordinateFormula}>
              {uiText(225)}
            </button>
          )}
          {selectedStrokeCount > 0 && (
            <button type="button" disabled={ocrBusy} onClick={() => void onRecognizeFormula()}>
              {ocrBusy ? uiText(1663, [ocrProgress]) : uiText(1664)}
            </button>
          )}
          <button type="button" disabled={!formulaDraft.trim()} onClick={onInsertFormula}>
            {uiText(226)}
          </button>
        </div>
      )}
    </div>
  );
}
