import type { HandwritingTool, Stroke } from "./handwriting-types";
import { PaperCheckIcon } from "./paper-check-icon";
import { PaperObjectIcon } from "./paper-object-icon";

type HandwritingInkOptionsProps = {
  tool: HandwritingTool;
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  eraserWholeStroke?: boolean;
  onEraserWholeStrokeChange?: (wholeStroke: boolean) => void;
  // Terceiro modo da borracha: apaga só o fundo importado. Só funciona com página ou imagem
  // importada na folha, por isso o botão fica desabilitado sem elas.
  eraserBackground?: boolean;
  onEraserBackgroundChange?: (background: boolean) => void;
  backgroundAvailable?: boolean;
  highlighterOpacity?: number;
  onHighlighterOpacityChange?: (opacity: number) => void;
  dash?: Stroke["dash"];
  onDashChange?: (dash: Stroke["dash"]) => void;
};

const DASH_CHOICES = [
  [undefined, "Contínua", "Linha contínua", ""],
  ["dashed", "Tracejada", "Linha tracejada", "9 8"],
  ["dotted", "Pontilhada", "Linha pontilhada", "0.1 9"],
] as const;

export function HandwritingInkOptions({
  tool,
  color,
  onColorChange,
  width,
  onWidthChange,
  eraserWholeStroke = false,
  onEraserWholeStrokeChange,
  eraserBackground = false,
  onEraserBackgroundChange,
  backgroundAvailable = false,
  highlighterOpacity = 0.3,
  onHighlighterOpacityChange,
  dash,
  onDashChange,
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
            aria-pressed={!eraserWholeStroke && !eraserBackground}
            onClick={() => {
              onEraserBackgroundChange?.(false);
              onEraserWholeStrokeChange(false);
            }}
          >
            <PaperObjectIcon name="eraseArea" />
            <span>Trecho</span>
          </button>
          <button
            type="button"
            aria-label="Apagar o traço inteiro"
            title="Apagar o traço inteiro"
            aria-pressed={eraserWholeStroke && !eraserBackground}
            onClick={() => {
              onEraserBackgroundChange?.(false);
              onEraserWholeStrokeChange(true);
            }}
          >
            <PaperObjectIcon name="eraseStroke" />
            <span>Traço inteiro</span>
          </button>
          {onEraserBackgroundChange && (
            <button
              type="button"
              aria-label="Apagar só o fundo importado"
              title={
                backgroundAvailable
                  ? "Apagar só o fundo importado (página ou imagem), sem tocar na tinta"
                  : "Disponível quando a folha tem uma página ou imagem importada"
              }
              aria-pressed={eraserBackground && backgroundAvailable}
              disabled={!backgroundAvailable}
              onClick={() => onEraserBackgroundChange(true)}
            >
              <PaperObjectIcon name="eraseBackground" />
              <span>Fundo</span>
            </button>
          )}
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
              <span aria-hidden="true">
                {color.toLowerCase() === ink ? <PaperCheckIcon /> : null}
              </span>
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
      {tool === "pen" && onDashChange && (
        <fieldset className="stroke-palette dash-palette">
          <legend>Estilo da linha</legend>
          {DASH_CHOICES.map(([value, label, description, pattern]) => (
            <button
              type="button"
              key={label}
              aria-label={description}
              aria-pressed={dash === value}
              onClick={() => onDashChange(value)}
            >
              <svg viewBox="0 0 64 24" aria-hidden="true">
                <path
                  d="M6 12H58"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  {...(pattern ? { strokeDasharray: pattern } : {})}
                />
              </svg>
              <span>{label}</span>
              <span className="ink-selection-mark" aria-hidden="true">
                <PaperCheckIcon size={12} />
              </span>
            </button>
          ))}
        </fieldset>
      )}
      <fieldset className="stroke-palette">
        <legend>{tool === "eraser" ? "Área da borracha" : "Espessura do traço"}</legend>
        <label className="ink-size-control">
          <span>
            {tool === "eraser" ? "Tamanho da borracha" : "Espessura"}: {percentage}%
            {![3, 5, 8].includes(width) && " (personalizada)"}
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
            <span className="ink-selection-mark" aria-hidden="true">
              <PaperCheckIcon size={12} />
            </span>
          </button>
        ))}
      </fieldset>
    </div>
  );
}
