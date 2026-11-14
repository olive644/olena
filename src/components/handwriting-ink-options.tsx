import type { CSSProperties } from "react";
import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import type { HandwritingTool, Stroke } from "./handwriting-types";
import { PaperCheckIcon } from "./paper-check-icon";
import { HandwritingToolTips } from "./handwriting-tool-tips";

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
  const language = useLanguage();

  const thickness =
    new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format((width * 210) / 1200) +
    " mm";
  const percentage = Math.max(0, Math.min(100, Math.round(((width - 0.5) / 39.5) * 100)));
  return (
    <div className="handwriting-ink-options">
      {tool === "eraser" && onEraserWholeStrokeChange && (
        <HandwritingToolTips
          className="eraser-mode paper-choice-row"
          role="group"
          label={uiText(174)}
        >
          <button
            type="button"
            aria-label={uiText(175)}

            aria-pressed={!eraserWholeStroke && !eraserBackground}
            onClick={() => {
              onEraserBackgroundChange?.(false);
              onEraserWholeStrokeChange(false);
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 21h5m4 0h4" stroke="#218b73" stroke-width="2" />
              <path d="m6 13 10-10 7 7-10 10Z" fill="#218b73" />
              <path d="m6 13 4-4 7 7-4 4Z" fill="#80d8bb" />
              <path d="m16 3 7 7-2 2-7-7Z" fill="#80d8bb" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={uiText(177)}

            aria-pressed={eraserWholeStroke && !eraserBackground}
            onClick={() => {
              onEraserBackgroundChange?.(false);
              onEraserWholeStrokeChange(true);
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m2 18 4 3 4-3 4 3 5-4" fill="none" stroke="#c33466" stroke-width="2" />
              <path d="m6 13 10-10 7 7-10 10Z" fill="#c33466" />
              <path d="m6 13 4-4 7 7-4 4Z" fill="#ffa2ba" />
              <path d="m16 3 7 7-2 2-7-7Z" fill="#ffa2ba" />
            </svg>
          </button>
          {onEraserBackgroundChange && (
            <button
              type="button"
              aria-label={uiText(179)}
              aria-description={uiText(backgroundAvailable ? 180 : 181)}

              aria-pressed={eraserBackground && backgroundAvailable}
              disabled={!backgroundAvailable}
              onClick={() => onEraserBackgroundChange(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 3h13v17H2Z" fill="#d9e7ff" />
                <path d="M4 7h8M4 11h5" stroke="#365dba" />
                <path d="m6 13 10-10 7 7-10 10Z" fill="#365dba" />
                <path d="m6 13 4-4 7 7-4 4Z" fill="#94b7ff" />
                <path d="m16 3 7 7-2 2-7-7Z" fill="#94b7ff" />
              </svg>
            </button>
          )}
        </HandwritingToolTips>
      )}
      {tool !== "eraser" && (
        <fieldset className="ink-palette">
          <legend className="visually-hidden">{uiText(183)}</legend>
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
          <legend className="visually-hidden">{uiText(186)}</legend>
          <label className="ink-size-control local-room-step-slider">
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
              style={
                {
                  "--room-slider-progress": ((highlighterOpacity * 100 - 10) / 60) * 100 + "%",
                } as CSSProperties
              }
              value={Math.round(highlighterOpacity * 100)}
              onChange={(event) => onHighlighterOpacityChange(Number(event.target.value) / 100)}
            />
          </label>
        </fieldset>
      )}
      {tool === "pen" && onDashChange && (
        <fieldset className="stroke-palette dash-palette">
          <legend className="visually-hidden">{uiText(188)}</legend>
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
        <legend className="visually-hidden">{tool === "eraser" ? uiText(189) : uiText(190)}</legend>
        <label className="ink-size-control local-room-step-slider">
          <span aria-hidden="true">{thickness}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label={tool === "eraser" ? uiText(1643) : uiText(1645)}
            aria-valuetext={`${thickness}${[3, 5, 8].includes(width) ? "" : uiText(2288)}`}
            style={{ "--room-slider-progress": percentage + "%" } as CSSProperties}
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
