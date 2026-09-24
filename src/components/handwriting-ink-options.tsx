import type { HandwritingTool } from "./handwriting-types";

type HandwritingInkOptionsProps = {
  tool: HandwritingTool;
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  stabilization: boolean;
  onStabilizationChange: (enabled: boolean) => void;
  penOnly: boolean;
  onPenOnlyChange: (enabled: boolean) => void;
};

export function HandwritingInkOptions({
  tool,
  color,
  onColorChange,
  width,
  onWidthChange,
  stabilization,
  onStabilizationChange,
  penOnly,
  onPenOnlyChange,
}: HandwritingInkOptionsProps) {
  return (
    <div className="handwriting-ink-options">
      <fieldset className="ink-palette" disabled={tool === "eraser"}>
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
            disabled={tool === "eraser"}
            onChange={(event) => onColorChange(event.target.value)}
          />
        </label>
      </fieldset>
      <fieldset className="stroke-palette" disabled={tool === "eraser"}>
        <legend>Espessura do traço</legend>
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
      <label className="handwriting-assist">
        <input
          type="checkbox"
          checked={stabilization}
          onChange={(event) => onStabilizationChange(event.target.checked)}
        />
        <span>
          <strong>Ajuste inteligente</strong>
          <small>Suaviza e endireita traços leves</small>
        </span>
      </label>
      <label className="handwriting-pen-only">
        <input
          type="checkbox"
          checked={penOnly}
          onChange={(event) => onPenOnlyChange(event.target.checked)}
        />
        <span>Só caneta, dedo move</span>
      </label>
    </div>
  );
}
