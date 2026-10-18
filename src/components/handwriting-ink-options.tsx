import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
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

const DASH_CHOICES = localizeLabels(
  () =>
    [
      [undefined, uiText(172), uiText(173), ""],
      ["dashed", uiText(1637), uiText(1638), "9 8"],
      ["dotted", uiText(1639), uiText(1640), "0.1 9"],
    ] as const,
);

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
  useLanguage();

  const percentage = Math.max(0, Math.min(100, Math.round(((width - 0.5) / 39.5) * 100)));
  return (
    <div className="handwriting-ink-options">
      {tool === "eraser" && onEraserWholeStrokeChange && (
        <fieldset className="eraser-mode paper-choice-row">
          <legend>{uiText(174)}</legend>
          <button
            type="button"
            aria-label={uiText(175)}
            title={uiText(175)}
            aria-pressed={!eraserWholeStroke && !eraserBackground}
            onClick={() => {
              onEraserBackgroundChange?.(false);
              onEraserWholeStrokeChange(false);
            }}
          >
            <PaperObjectIcon name="eraseArea" />
            <span>{uiText(176)}</span>
          </button>
          <button
            type="button"
            aria-label={uiText(177)}
            title={uiText(177)}
            aria-pressed={eraserWholeStroke && !eraserBackground}
            onClick={() => {
              onEraserBackgroundChange?.(false);
              onEraserWholeStrokeChange(true);
            }}
          >
            <PaperObjectIcon name="eraseStroke" />
            <span>{uiText(178)}</span>
          </button>
          {onEraserBackgroundChange && (
            <button
              type="button"
              aria-label={uiText(179)}
              title={backgroundAvailable ? uiText(180) : uiText(181)}
              aria-pressed={eraserBackground && backgroundAvailable}
              disabled={!backgroundAvailable}
              onClick={() => onEraserBackgroundChange(true)}
            >
              <PaperObjectIcon name="eraseBackground" />
              <span>{uiText(182)}</span>
            </button>
          )}
        </fieldset>
      )}
      {tool !== "eraser" && (
        <fieldset className="ink-palette">
          <legend>{uiText(183)}</legend>
          {[
            ["#17151c", uiText(1573)],
            ["#7c3aed", uiText(1568)],
            ["#ef476f", uiText(1570)],
            ["#2d8a67", uiText(1571)],
            ["#facc15", uiText(1569)],
            ["#fff9ef", uiText(1641)],
          ].map(([ink, label]) => (
            <button
              key={ink}
              type="button"
              className="ink-swatch"
              aria-label={uiText(1642, [label])}
              aria-pressed={color.toLowerCase() === ink}
              style={{ backgroundColor: ink }}
              onClick={() => ink && onColorChange(ink)}
            >
              <span aria-hidden="true">
                {color.toLowerCase() === ink ? <PaperCheckIcon /> : null}
              </span>
            </button>
          ))}
          <label className="ink-custom" title={uiText(184)}>
            <span>{uiText(185)}</span>
            <input
              type="color"
              aria-label={uiText(183)}
              value={color}
              onChange={(event) => onColorChange(event.target.value)}
            />
          </label>
        </fieldset>
      )}
      {tool === "highlighter" && onHighlighterOpacityChange && (
        <fieldset className="highlighter-opacity">
          <legend>{uiText(186)}</legend>
          <label className="ink-size-control">
            <span>
              {uiText(187)} {Math.round(highlighterOpacity * 100)}%
            </span>
            <input
              type="range"
              min="10"
              max="70"
              step="1"
              aria-label={uiText(186)}
              aria-valuetext={`${Math.round(highlighterOpacity * 100)}%`}
              value={Math.round(highlighterOpacity * 100)}
              onChange={(event) => onHighlighterOpacityChange(Number(event.target.value) / 100)}
            />
          </label>
        </fieldset>
      )}
      {tool === "pen" && onDashChange && (
        <fieldset className="stroke-palette dash-palette">
          <legend>{uiText(188)}</legend>
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
        <legend>{tool === "eraser" ? uiText(189) : uiText(190)}</legend>
        <label className="ink-size-control">
          <span>
            {tool === "eraser" ? uiText(1643) : uiText(1644)}: {percentage}%
            {![3, 5, 8].includes(width) && uiText(2288)}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label={tool === "eraser" ? uiText(1643) : uiText(1645)}
            aria-valuetext={`${percentage}%`}
            value={percentage}
            onChange={(event) => onWidthChange(0.5 + Number(event.target.value) * 0.395)}
          />
        </label>
        {(
          [
            [3, uiText(1646)],
            [5, uiText(1647)],
            [8, uiText(1648)],
          ] as const
        ).map(([size, label]) => (
          <button
            type="button"
            key={size}
            aria-label={uiText(1649, [label])}
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
