import { FocusPaperArrow } from "./focus-paper-arrow";
import { HandwritingToolTips } from "./handwriting-tool-tips";
import { uiText, useLanguage } from "../i18n/runtime";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { HandwritingTool } from "./handwriting-types";
import type { RulerUnit } from "../domain/ruler";

type HandwritingToolGroupProps = {
  textMode: boolean;
  tool: HandwritingTool;
  rulerUnit: RulerUnit;
  layersOpen: boolean;
  writingWindowOpen: boolean;
  onSelectTool: (tool: HandwritingTool) => void;
  onToggleLayers: () => void;
  onToggleText: () => void;
  onAddSticky: () => void;
  onAddTable: () => void;
  onToggleWritingWindow: () => void;
  onOpenShapeInsert: () => void;
};

export function HandwritingToolGroup({
  textMode,
  tool,
  rulerUnit,
  layersOpen,
  writingWindowOpen,
  onSelectTool,
  onToggleLayers,
  onToggleText,
  onAddSticky,
  onAddTable,
  onToggleWritingWindow,
  onOpenShapeInsert,
}: HandwritingToolGroupProps) {
  useLanguage();
  return (
    <HandwritingToolTips className="handwriting-tool-group" label={uiText(344)}>
      <button
        type="button"
        className={!textMode && tool === "ruler" ? "is-active" : ""}
        aria-label={uiText(345)}
        aria-pressed={!textMode && tool === "ruler"}
        onClick={() => onSelectTool("ruler")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/handwriting-static-0.svg#art" />
        </svg>
        <b className="ruler-tool-unit" aria-hidden="true">
          {rulerUnit}
        </b>
        <span>{uiText(345)}</span>
        {!textMode && tool === "ruler" && (
          <span className="handwriting-tool-disclosure">
            <FocusPaperArrow />
          </span>
        )}
      </button>
      <button
        type="button"
        className={!textMode && tool === "curve" ? "is-active" : ""}
        aria-label={uiText(347)}
        aria-pressed={!textMode && tool === "curve"}
        onClick={() => onSelectTool("curve")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/notebook-tool-curve.svg#art" />
        </svg>{" "}
        <span>{uiText(347)}</span>
        {!textMode && tool === "curve" && (
          <span className="handwriting-tool-disclosure">
            <FocusPaperArrow />
          </span>
        )}
      </button>
      <button
        type="button"
        className={!textMode && tool === "coordinates" ? "is-active" : ""}
        aria-label={uiText(250)}
        aria-pressed={!textMode && tool === "coordinates"}
        onClick={() => onSelectTool("coordinates")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/notebook-tool-coordinates.svg#art" />
        </svg>
        <span>{uiText(352)}</span>
        {!textMode && tool === "coordinates" && (
          <span className="handwriting-tool-disclosure">
            <FocusPaperArrow />
          </span>
        )}
      </button>
      <button
        type="button"
        className={layersOpen ? "is-active" : ""}
        aria-label={uiText(260)}
        aria-pressed={layersOpen}
        onClick={() => onToggleLayers()}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/notebook-tool-layers.svg#art" />
        </svg>{" "}
        <span>{uiText(354)}</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "pen" ? "is-active" : ""}
        aria-label={uiText(355)}
        aria-pressed={!textMode && tool === "pen"}
        onClick={() => onSelectTool("pen")}
      >
        <PaperEditorIcon name="pen" />
        {!textMode && tool === "pen" && (
          <span className="handwriting-tool-disclosure">
            <FocusPaperArrow />
          </span>
        )}
      </button>
      <button
        type="button"
        className={!textMode && tool === "highlighter" ? "is-active" : ""}
        aria-label={uiText(356)}
        aria-pressed={!textMode && tool === "highlighter"}
        onClick={() => onSelectTool("highlighter")}
      >
        <PaperEditorIcon name="highlighter" /> <span>{uiText(356)}</span>
        {!textMode && tool === "highlighter" && (
          <span className="handwriting-tool-disclosure">
            <FocusPaperArrow />
          </span>
        )}
      </button>
      <button
        type="button"
        className={!textMode && tool === "eraser" ? "is-active" : ""}
        aria-label={uiText(357)}
        aria-pressed={!textMode && tool === "eraser"}
        onClick={() => onSelectTool("eraser")}
      >
        <PaperEditorIcon name="eraser" /> <span>{uiText(357)}</span>
        {!textMode && tool === "eraser" && (
          <span className="handwriting-tool-disclosure">
            <FocusPaperArrow />
          </span>
        )}
      </button>
      <button
        type="button"
        className={!textMode && tool === "select" ? "is-active" : ""}
        aria-label={uiText(358)}
        aria-pressed={!textMode && tool === "select"}
        onClick={() => onSelectTool("select")}
      >
        <PaperEditorIcon name="select" /> <span>{uiText(359)}</span>
      </button>
      <button
        type="button"
        aria-label={uiText(360)}
        aria-pressed={textMode}
        onClick={() => onToggleText()}
      >
        <PaperEditorIcon name="text" /> <span>{uiText(361)}</span>
      </button>
      <button type="button" aria-label={uiText(362)} onClick={() => onAddSticky()}>
        <PaperEditorIcon name="sticky" /> <span>{uiText(363)}</span>
      </button>
      <button type="button" aria-label={uiText(364)} onClick={() => onAddTable()}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/notebook-tool-table.svg#art" />
        </svg>
        <span>{uiText(366)}</span>
      </button>
      <button type="button" aria-label={uiText(229)} onClick={() => onOpenShapeInsert()}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/notebook-tool-shapes.svg#art" />
        </svg>
        <span>{uiText(229)}</span>
      </button>
      <button
        type="button"
        className={writingWindowOpen ? "is-active" : ""}
        aria-label={uiText(368)}
        aria-pressed={writingWindowOpen}
        onClick={() => onToggleWritingWindow()}
      >
        <PaperEditorIcon name="zoomIn" /> <span>{uiText(369)}</span>
      </button>
    </HandwritingToolTips>
  );
}
