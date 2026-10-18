import { uiText, useLanguage } from "../i18n/runtime";
import type { HandwritingPaperColor } from "../domain/handwriting";
import type { PaperStyle } from "./handwriting-types";

type HandwritingPaperPickerProps = {
  paper: PaperStyle;
  paperColor: HandwritingPaperColor;
  sectionsOpen: { paper: boolean; color: boolean };
  onToggleSection: (section: "paper" | "color") => void;
  onSelectPaper: (paper: PaperStyle) => void;
  onSelectPaperColor: (color: HandwritingPaperColor) => void;
};

export function HandwritingPaperPicker({
  paper,
  paperColor,
  sectionsOpen,
  onToggleSection,
  onSelectPaper,
  onSelectPaperColor,
}: HandwritingPaperPickerProps) {
  useLanguage();

  return (
    <aside className="handwriting-paper-picker" aria-label={uiText(191)}>
      <section className="handwriting-paper-section handwriting-paper-section--type">
        <button
          type="button"
          className="handwriting-paper-section__toggle"
          aria-expanded={sectionsOpen.paper}
          aria-label={uiText(192)}
          title={uiText(192)}
          onClick={() => onToggleSection("paper")}
        >
          <span className="paper-preview paper-preview--blank" aria-hidden="true" />
          <span className="paper-picker-label">{uiText(192)}</span>
          <span className="paper-picker-chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
      </section>
      <section className="handwriting-paper-section handwriting-paper-section--color">
        <button
          type="button"
          className="handwriting-paper-section__toggle"
          aria-expanded={sectionsOpen.color}
          aria-label={uiText(193)}
          title={uiText(193)}
          onClick={() => onToggleSection("color")}
        >
          <span className="paper-preview paper-preview--tone-aged" aria-hidden="true" />
          <span className="paper-picker-label">{uiText(193)}</span>
          <span className="paper-picker-chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
      </section>
      {(sectionsOpen.paper || sectionsOpen.color) && (
        <div className="handwriting-paper-options">
          {sectionsOpen.paper
            ? (
                [
                  ["board", uiText(1650)],
                  ["ruled", uiText(1651)],
                  ["grid", uiText(1652)],
                  ["dots", uiText(1653)],
                  ["blank", uiText(1654)],
                  ["weekly", uiText(1655)],
                  ["calendar", uiText(194)],
                  ["cornell", uiText(1656)],
                  ["staff", uiText(1657)],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  className={paper === value ? "is-active" : ""}
                  aria-pressed={paper === value}
                  aria-label={label}
                  title={label}
                  onClick={() => onSelectPaper(value)}
                  key={value}
                >
                  <span className={`paper-preview paper-preview--${value}`} aria-hidden="true" />
                  <span className="paper-picker-label">{label}</span>
                </button>
              ))
            : (
                [
                  ["light", uiText(1658)],
                  ["aged", uiText(1659)],
                  ["night", uiText(1660)],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  className={paperColor === value ? "is-active" : ""}
                  aria-pressed={paperColor === value}
                  aria-label={label}
                  title={label}
                  onClick={() => onSelectPaperColor(value)}
                  key={value}
                >
                  <span
                    className={`paper-preview paper-preview--tone-${value}`}
                    aria-hidden="true"
                  />
                  <span className="paper-picker-label">{label}</span>
                </button>
              ))}
        </div>
      )}
    </aside>
  );
}
