import { uiText, useLanguage } from "../i18n/runtime";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperObjectIcon } from "./paper-object-icon";
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
    <div className="handwriting-tool-group" aria-label={uiText(344)}>
      <button
        type="button"
        className={!textMode && tool === "ruler" ? "is-active" : ""}
        aria-label={uiText(345)}
        title={uiText(346)}
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
      </button>
      <button
        type="button"
        className={!textMode && tool === "curve" ? "is-active" : ""}
        aria-label={uiText(347)}
        title={uiText(348)}
        aria-pressed={!textMode && tool === "curve"}
        onClick={() => onSelectTool("curve")}
      >
        <PaperObjectIcon name="curve" /> <span>{uiText(347)}</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "space" ? "is-active" : ""}
        aria-label={uiText(349)}
        title={uiText(350)}
        aria-pressed={!textMode && tool === "space"}
        onClick={() => onSelectTool("space")}
      >
        <PaperObjectIcon name="space" /> <span>{uiText(115)}</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "coordinates" ? "is-active" : ""}
        aria-label={uiText(250)}
        title={uiText(351)}
        aria-pressed={!textMode && tool === "coordinates"}
        onClick={() => onSelectTool("coordinates")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/handwriting-static-1.svg#art" />
        </svg>
        <span>{uiText(352)}</span>
      </button>
      <button
        type="button"
        className={layersOpen ? "is-active" : ""}
        aria-label={uiText(260)}
        aria-pressed={layersOpen}
        title={uiText(353)}
        onClick={() => onToggleLayers()}
      >
        <PaperEditorIcon name="layers" /> <span>{uiText(354)}</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "pen" ? "is-active" : ""}
        aria-label={uiText(355)}
        aria-pressed={!textMode && tool === "pen"}
        onClick={() => onSelectTool("pen")}
      >
        <PaperEditorIcon name="pen" /> <span>{uiText(355)}</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "highlighter" ? "is-active" : ""}
        aria-label={uiText(356)}
        aria-pressed={!textMode && tool === "highlighter"}
        onClick={() => onSelectTool("highlighter")}
      >
        <PaperEditorIcon name="highlighter" /> <span>{uiText(356)}</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "eraser" ? "is-active" : ""}
        aria-label={uiText(357)}
        aria-pressed={!textMode && tool === "eraser"}
        onClick={() => onSelectTool("eraser")}
      >
        <PaperEditorIcon name="eraser" /> <span>{uiText(357)}</span>
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
      <button
        type="button"
        aria-label={uiText(364)}
        title={uiText(365)}
        onClick={() => onAddTable()}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/navigation-icons/paper/handwriting-static-2.svg#art" />
        </svg>
        <span>{uiText(366)}</span>
      </button>
      <button
        type="button"
        aria-label={uiText(229)}
        title={uiText(367)}
        onClick={() => onOpenShapeInsert()}
      >
        <PaperObjectIcon name="shapes" />
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
    </div>
  );
}
