import { HandwritingTableControls } from "./handwriting-table-controls";
import { PaperDigits } from "./paper-digits";
import { HandwritingToolTips } from "./handwriting-tool-tips";
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
  strokeProperties?:
    | {
        color: string;
        width: number;
        onChange: (change: { color?: string; width?: number }) => void;
      }
    | undefined;
  tableProperties?:
    | { cells: string[][]; onChange: (cells: string[][]) => void; onRemember: () => void }
    | undefined;
  textProperties?: { ink: string; onColorChange: (ink: string) => void } | undefined;
  minimumTextSize?: number;
  floatingActions?: boolean;
  allSelected?: boolean;
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
  onDelete,
  hasBackground,
  onRemoveBackground,
  hasSelectedImages,
  onRemoveSelectedImages,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onSelectAll,
  strokeProperties,
  tableProperties,
  textProperties,
  minimumTextSize = 16,
  floatingActions = false,
  allSelected = false,
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
          <HandwritingToolTips
            className="handwriting-selection-modes"
            role="group"
            label={uiText(196)}
          >
            <button
              type="button"
              aria-label={uiText(197)}
              aria-pressed={selectionMode === "rectangle"}
              onClick={() => onSelectionModeChange("rectangle")}
            >
              <PaperEditorIcon name="selectionRectangle" />
            </button>
            <button
              type="button"
              aria-label={uiText(198)}
              aria-pressed={selectionMode === "lasso"}
              onClick={() => onSelectionModeChange("lasso")}
            >
              <PaperEditorIcon name="selectionLasso" />
            </button>
            <button
              type="button"
              aria-label={uiText(199)}
              aria-pressed={allSelected}
              onClick={onSelectAll}
            >
              <PaperEditorIcon name="expand" />
            </button>
            {!floatingActions && (
              <button type="button" aria-label={uiText(200)} disabled={!canPaste} onClick={onPaste}>
                <PaperEditorIcon name="selectionPaste" />
              </button>
            )}
          </HandwritingToolTips>
        </>
      )}
      {strokeProperties && (
        <div className="handwriting-selection-properties">
          <input
            type="color"
            aria-label={uiText(3794)}
            value={strokeProperties.color}
            onChange={(event) => strokeProperties.onChange({ color: event.currentTarget.value })}
          />
          <input
            type="number"
            aria-label={uiText(3793)}
            min={1}
            max={100}
            key={strokeProperties.width}
            defaultValue={strokeProperties.width}
            onBlur={(event) => {
              const width = event.currentTarget.valueAsNumber;
              if (width >= 1 && width <= 100 && width !== strokeProperties.width)
                strokeProperties.onChange({ width });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>
      )}
      {selectedIds.length > 0 && (
        <>
          <span role="status" aria-live="polite">
            {selectedIds.length} {selectedIds.length === 1 ? uiText(1661) : uiText(1662)}
          </span>
          {!floatingActions && (
            <button type="button" onClick={onCopy}>
              {uiText(201)}
            </button>
          )}
          {!floatingActions && (
            <button type="button" onClick={onCut}>
              {uiText(203)}
            </button>
          )}
          {!floatingActions && (
            <button type="button" onClick={onDuplicate}>
              {uiText(204)}
            </button>
          )}
          {!floatingActions && (
            <button type="button" disabled={!canAlign} onClick={onAlign}>
              {uiText(205)}
            </button>
          )}
          {!floatingActions && (
            <button type="button" onClick={onDelete}>
              {uiText(210)}
            </button>
          )}
        </>
      )}
      {!floatingActions && selectedCoordinateIds.length > 0 && (
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
      {!floatingActions && tool === "select" && hasBackground && (
        <>
          <span>{uiText(214)}</span>
          <button type="button" onClick={onRemoveBackground}>
            {uiText(215)}
          </button>
        </>
      )}
      {!floatingActions && tool === "select" && hasSelectedImages && (
        <>
          <span>{uiText(216)}</span>
          <button type="button" onClick={onRemoveSelectedImages}>
            {uiText(217)}
          </button>
        </>
      )}
      {tool === "select" && tableProperties && (
        <HandwritingTableControls {...tableProperties} className="handwriting-selection-table" />
      )}
      {tool === "select" && hasPageText && (
        <HandwritingToolTips
          className="handwriting-selection-text"
          role="group"
          label={uiText(360)}
        >
          {textProperties && (
            <input
              type="color"
              aria-label={uiText(183)}
              value={textProperties.ink}
              onChange={(event) => textProperties.onColorChange(event.target.value)}
            />
          )}
          <button
            type="button"
            className="secondary-button"
            aria-label={uiText(220)}
            disabled={pageTextSize <= minimumTextSize}
            onClick={() => onChangeTextSize(-2)}
          >
            <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true">
              <g transform="scale(.75)">
                <use href="/navigation-icons/paper/paper-editor-icon.svg#text" />
              </g>
              <path d="M31 32h14v5H31Z" fill="#C33466" />
              <path d="M31 32h14v2H31Z" fill="#FFA2BA" />
            </svg>
          </button>
          <output aria-label={uiText(218)}>
            <PaperDigits value={String(Math.round(pageTextSize))} />
            <b>{uiText(219)}</b>
          </output>
          <button
            type="button"
            className="secondary-button"
            aria-label={uiText(221)}
            disabled={pageTextSize >= 144}
            onClick={() => onChangeTextSize(2)}
          >
            <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true">
              <g transform="scale(.75)">
                <use href="/navigation-icons/paper/paper-editor-icon.svg#text" />
              </g>
              <path d="M36 27h5v5h5v5h-5v5h-5v-5h-5v-5h5Z" fill="#218570" />
              <path d="M36 27h2v15h-2Z" fill="#72C6A6" />
            </svg>
          </button>
        </HandwritingToolTips>
      )}
      {tool === "select" && (
        <div className="handwriting-formula-assist">
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
          <HandwritingToolTips className="handwriting-formula-insert" label={uiText(226)}>
            <button
              type="button"
              aria-label={uiText(226)}
              disabled={!formulaDraft.trim()}
              onClick={onInsertFormula}
            >
              <PaperEditorIcon name="add" />
            </button>
          </HandwritingToolTips>
        </div>
      )}
    </div>
  );
}
