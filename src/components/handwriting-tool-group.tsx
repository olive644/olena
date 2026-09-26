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
  onToggleWritingWindow: () => void;
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
  onToggleWritingWindow,
}: HandwritingToolGroupProps) {
  return (
    <div className="handwriting-tool-group" aria-label="Instrumentos">
      <button
        type="button"
        className={!textMode && tool === "ruler" ? "is-active" : ""}
        aria-label="Régua"
        title="Régua: arraste para traçar uma linha reta"
        aria-pressed={!textMode && tool === "ruler"}
        onClick={() => onSelectTool("ruler")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#B88C13" d="m2 15 14-13 7 7-14 14Z" />
          <path fill="#FACC15" d="m2 13 14-12 6 6L8 20Z" />
          <path fill="#FFE88D" d="m2 13 14-12 2 2L4 15Z" />
          <path stroke="#51465D" strokeWidth="1.5" d="m6 10 2 2m1-5 3 3m0-6 2 2m1-5 3 3" />
        </svg>
        <b className="ruler-tool-unit" aria-hidden="true">
          {rulerUnit}
        </b>
        <span>Régua</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "coordinates" ? "is-active" : ""}
        aria-label="Sistema de coordenadas"
        title="Sistema de coordenadas: arraste da origem até o fim dos eixos"
        aria-pressed={!textMode && tool === "coordinates"}
        onClick={() => onSelectTool("coordinates")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 3v17h17M4 8h3M9 17v3M4 4l-2 3m2-3 3 2m13 14-3-2m3 2-2 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Coordenadas</span>
      </button>
      <button
        type="button"
        className={layersOpen ? "is-active" : ""}
        aria-label="Camadas da folha"
        aria-pressed={layersOpen}
        title="Camadas da folha: mostrar, ocultar e ordenar elementos"
        onClick={() => onToggleLayers()}
      >
        <PaperEditorIcon name="layers" /> <span>Camadas</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "pen" ? "is-active" : ""}
        aria-label="Caneta"
        aria-pressed={!textMode && tool === "pen"}
        onClick={() => onSelectTool("pen")}
      >
        <PaperEditorIcon name="pen" /> <span>Caneta</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "highlighter" ? "is-active" : ""}
        aria-label="Marca-texto"
        aria-pressed={!textMode && tool === "highlighter"}
        onClick={() => onSelectTool("highlighter")}
      >
        <PaperEditorIcon name="highlighter" /> <span>Marca-texto</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "eraser" ? "is-active" : ""}
        aria-label="Borracha"
        aria-pressed={!textMode && tool === "eraser"}
        onClick={() => onSelectTool("eraser")}
      >
        <PaperEditorIcon name="eraser" /> <span>Borracha</span>
      </button>
      <button
        type="button"
        className={!textMode && tool === "select" ? "is-active" : ""}
        aria-label="Selecionar traços"
        aria-pressed={!textMode && tool === "select"}
        onClick={() => onSelectTool("select")}
      >
        <PaperEditorIcon name="select" /> <span>Selecionar</span>
      </button>
      <button
        type="button"
        aria-label="Texto na página inteira"
        aria-pressed={textMode}
        onClick={() => onToggleText()}
      >
        <PaperEditorIcon name="text" /> <span>Texto</span>
      </button>
      <button type="button" aria-label="Adicionar post-it" onClick={() => onAddSticky()}>
        <PaperEditorIcon name="sticky" /> <span>Post-it</span>
      </button>
      <button
        type="button"
        className={writingWindowOpen ? "is-active" : ""}
        aria-label="Janela de escrita ampliada"
        aria-pressed={writingWindowOpen}
        onClick={() => onToggleWritingWindow()}
      >
        <PaperEditorIcon name="zoomIn" /> <span>Janela de escrita</span>
      </button>
    </div>
  );
}
