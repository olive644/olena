import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { PaperCheckIcon } from "./paper-check-icon";

const COLORS = localizeLabels(
  () =>
    [
      ["#7c3aed", uiText(1568)],
      ["#facc15", uiText(1569)],
      ["#ef476f", uiText(1570)],
      ["#2d8a67", uiText(1571)],
      ["#4070c9", uiText(1572)],
      ["#292432", uiText(1573)],
    ] as const,
);

export function AgendaColorPalette({
  value,
  onChange,
  label = uiText(1574),
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}) {
  useLanguage();

  return (
    <fieldset className="agenda-color-palette">
      <legend>{label}</legend>
      <div className="agenda-color-items">
        {COLORS.map(([color, label]) => (
          <button
            key={color}
            type="button"
            aria-label={uiText(1575, [label])}
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
