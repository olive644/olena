import type { HandwritingTool } from "./handwriting-types";
import { PaperObjectIcon } from "./paper-object-icon";

type HandwritingInkOptionsProps = {
  tool: HandwritingTool;
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  eraserWholeStroke?: boolean;
  onEraserWholeStrokeChange?: (wholeStroke: boolean) => void;
  highlighterOpacity?: number;
  onHighlighterOpacityChange?: (opacity: number) => void;
};

export function HandwritingInkOptions({
  tool,
  color,
  onColorChange,
  width,
  onWidthChange,
  eraserWholeStroke = false,
  onEraserWholeStrokeChange,
  highlighterOpacity = 0.3,
  onHighlighterOpacityChange,
}: HandwritingInkOptionsProps) {
  const percentage = Math.max(0, Math.min(100, Math.round(((width - 0.5) / 39.5) * 100)));
  return (
    <div className="handwriting-ink-options">
      {tool === "eraser" && onEraserWholeStrokeChange && (
        <fieldset className="eraser-mode paper-choice-row">
          <legend>Modo da borracha</legend>
          <button
            type="button"
            aria-label="Apagar só o trecho tocado"
            title="Apagar só o trecho tocado"
            aria-pressed={!eraserWholeStroke}
            onClick={() => onEraserWholeStrokeChange(false)}
          >
            <PaperObjectIcon name="eraseArea" />
            <span>Trecho</span>
          </button>
          <button
            type="button"
            aria-label="Apagar o traço inteiro"
            title="Apagar o traço inteiro"
            aria-pressed={eraserWholeStroke}
            onClick={() => onEraserWholeStrokeChange(true)}
          >
            <PaperObjectIcon name="eraseStroke" />
            <span>Traço inteiro</span>
          </button>
        </fieldset>
      )}
      {tool !== "eraser" && (
        <fieldset className="ink-palette">
          <legend>Cor da tinta</legend>
          {[
            ["#17151c", "Grafite"],
            ["#7c3aed", "Roxo"],
            ["#ef476f", "Rosa"],
            ["#2d8a67", "Verde"],
            ["#facc15", "Amarelo"],
            ["#fff9ef", "Creme"],
          ].map(([ink, label]) => (
            <button
              key={ink}
              type="button"
              className="ink-swatch"
              aria-label={`Tinta ${label}`}
              aria-pressed={color.toLowerCase() === ink}
              style={{ backgroundColor: ink }}
              onClick={() => ink && onColorChange(ink)}
            >
              <span aria-hidden="true">{color.toLowerCase() === ink ? "✓" : ""}</span>
            </button>
          ))}
          <label className="ink-custom" title="Escolher outra cor">
            <span>Outra</span>
            <input
              type="color"
              aria-label="Cor da tinta"
              value={color}
              onChange={(event) => onColorChange(event.target.value)}
            />
          </label>
        </fieldset>
      )}
      {tool === "highlighter" && onHighlighterOpacityChange && (
        <fieldset className="highlighter-opacity">
          <legend>Opacidade do marca-texto</legend>
          <label className="ink-size-control">
            <span>Opacidade: {Math.round(highlighterOpacity * 100)}%</span>
            <input
              type="range"
              min="10"
              max="70"
              step="1"
              aria-label="Opacidade do marca-texto"
              aria-valuetext={`${Math.round(highlighterOpacity * 100)}%`}
              value={Math.round(highlighterOpacity * 100)}
              onChange={(event) => onHighlighterOpacityChange(Number(event.target.value) / 100)}
            />
          </label>
        </fieldset>
      )}
      <fieldset className="stroke-palette">
        <legend>{tool === "eraser" ? "Área da borracha" : "Espessura do traço"}</legend>
        <label className="ink-size-control">
          <span>
            {tool === "eraser" ? "Tamanho da borracha" : "Espessura"}: {percentage}%
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label={tool === "eraser" ? "Tamanho da borracha" : "Espessura do pincel"}
            aria-valuetext={`${percentage}%`}
            value={percentage}
            onChange={(event) => onWidthChange(0.5 + Number(event.target.value) * 0.395)}
          />
        </label>
        {(
          [
            [3, "Fino"],
            [5, "Regular"],
            [8, "Forte"],
          ] as const
        ).map(([size, label]) => (
          <button
            type="button"
            key={size}
            aria-label={`Traço ${label}`}
            aria-pressed={width === size}
            onClick={() => onWidthChange(size)}
          >
            <svg viewBox="0 0 64 24" aria-hidden="true">
              <path
                d="M5 17C16 2 19 23 31 10S43 23 59 7"
                fill="none"
                stroke="currentColor"
                strokeWidth={size}
                strokeLinecap="round"
              />
            </svg>
            <span>{label}</span>
          </button>
        ))}
      </fieldset>
    </div>
  );
}
