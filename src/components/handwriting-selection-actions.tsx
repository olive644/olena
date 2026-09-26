import type { HandwritingTool, SelectionMode } from "./handwriting-types";

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
  return (
    <div className="handwriting-selection-actions" aria-label="Itens selecionados">
      {tool === "select" && (
        <>
          <span>Modo</span>
          <button
            type="button"
            aria-pressed={selectionMode === "rectangle"}
            onClick={() => onSelectionModeChange("rectangle")}
          >
            Retângulo
          </button>
          <button
            type="button"
            aria-pressed={selectionMode === "lasso"}
            onClick={() => onSelectionModeChange("lasso")}
          >
            Laço livre
          </button>
          <button type="button" onClick={onSelectAll}>
            Selecionar tudo
          </button>
          <button type="button" disabled={!canPaste} onClick={onPaste}>
            Colar
          </button>
        </>
      )}
      {selectedIds.length > 0 && (
        <>
          <span>
            {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "item selecionado" : "itens selecionados"}
          </span>
          <button type="button" onClick={onCopy}>
            Copiar
          </button>
          <button type="button" onClick={onCut}>
            Recortar
          </button>
          <button type="button" onClick={onDuplicate}>
            Duplicar
          </button>
          <button type="button" disabled={!canAlign} onClick={onAlign}>
            Alinhar
          </button>
          {!hasSelectedImages && (
            <>
              <button type="button" onClick={() => onRotate(-1)}>
                Girar −15°
              </button>
              <button type="button" onClick={() => onRotate(1)}>
                Girar +15°
              </button>
            </>
          )}
          <button type="button" onClick={() => onScale(1.12)}>
            Aumentar
          </button>
          <button type="button" onClick={() => onScale(0.88)}>
            Diminuir
          </button>
          <button type="button" onClick={onDelete}>
            Apagar seleção
          </button>
        </>
      )}
      {selectedCoordinateIds.length > 0 && (
        <>
          <span>
            {selectedCoordinateIds.length} sistema
            {selectedCoordinateIds.length === 1 ? "" : "s"} de coordenadas selecionado
            {selectedCoordinateIds.length === 1 ? "" : "s"}
          </span>
          <button type="button" onClick={onDelete}>
            Apagar coordenadas
          </button>
        </>
      )}
      {tool === "select" && hasBackground && (
        <>
          <span>Imagem importada selecionada</span>
          <button type="button" onClick={onRemoveBackground}>
            Remover imagem
          </button>
        </>
      )}
      {tool === "select" && hasSelectedImages && (
        <>
          <span>Imagem(ns) importada(s) selecionada(s)</span>
          <button type="button" onClick={onRemoveSelectedImages}>
            Remover imagem(ns)
          </button>
          <button type="button" onClick={() => onRotate(-1)}>
            Girar −15°
          </button>
          <button type="button" onClick={() => onRotate(1)}>
            Girar +15°
          </button>
        </>
      )}
      {tool === "select" && hasPageText && (
        <>
          <span>Texto: {pageTextSize}px</span>
          <button type="button" disabled={pageTextSize <= 16} onClick={() => onChangeTextSize(-2)}>
            Diminuir texto
          </button>
          <button type="button" disabled={pageTextSize >= 72} onClick={() => onChangeTextSize(2)}>
            Aumentar texto
          </button>
        </>
      )}
      {tool === "select" && (hasSelectedCoordinateSystem || selectedStrokeCount > 0) && (
        <div className="handwriting-formula-assist">
          <span>Assistente local</span>
          <input
            aria-label="Fórmula matemática"
            value={formulaDraft}
            maxLength={240}
            onChange={(event) => onFormulaDraftChange(event.target.value)}
            placeholder="Ex.: y = 2x + 1"
          />
          {hasSelectedCoordinateSystem && (
            <button type="button" onClick={onUseCoordinateFormula}>
              Usar leitura
            </button>
          )}
          {selectedStrokeCount > 0 && (
            <button type="button" disabled={ocrBusy} onClick={() => void onRecognizeFormula()}>
              {ocrBusy ? `OCR ${ocrProgress}%` : "Reconhecer OCR local"}
            </button>
          )}
          <button type="button" disabled={!formulaDraft.trim()} onClick={onInsertFormula}>
            Inserir fórmula
          </button>
        </div>
      )}
    </div>
  );
}
