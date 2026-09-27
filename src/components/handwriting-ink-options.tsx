import type { HandwritingTool } from "./handwriting-types";

type HandwritingInkOptionsProps = {
  tool: HandwritingTool;
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
};

export function HandwritingInkOptions({
  tool,
  color,
  onColorChange,
  width,
  onWidthChange,
}: HandwritingInkOptionsProps) {
  const percentage = Math.max(0, Math.min(100, Math.round(((width - 0.5) / 39.5) * 100)));
  return (
    <div className="handwriting-ink-options">
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
