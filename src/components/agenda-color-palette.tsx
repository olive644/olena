import { PaperCheckIcon } from "./paper-check-icon";

const COLORS = [
  ["#7c3aed", "Roxo"],
  ["#facc15", "Amarelo"],
  ["#ef476f", "Rosa"],
  ["#2d8a67", "Verde"],
  ["#4070c9", "Azul"],
  ["#292432", "Grafite"],
] as const;

export function AgendaColorPalette({
  value,
  onChange,
  label = "Cor do evento",
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}) {
  return (
    <fieldset className="agenda-color-palette">
      <legend>{label}</legend>
      <div className="agenda-color-items">
        {COLORS.map(([color, label]) => (
          <button
            key={color}
            type="button"
            aria-label={`Cor ${label}`}
            title={label}
            aria-pressed={value.toLowerCase() === color}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          >
            <span className="agenda-color-name">{label}</span>
            {value.toLowerCase() === color && (
              <span className="agenda-color-check">
                <PaperCheckIcon />
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
