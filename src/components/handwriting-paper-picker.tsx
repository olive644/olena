import { useState } from "react";
import { FocusPaperArrow } from "./focus-paper-arrow";
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
  const [visible, setVisible] = useState(true);

  return (
    <>
      <button
        type="button"
        className="handwriting-paper-disclosure"
        aria-label={uiText(191)}
        aria-expanded={visible}
        onClick={() => {
          if (visible && sectionsOpen.paper) onToggleSection("paper");
          if (visible && sectionsOpen.color) onToggleSection("color");
          setVisible(!visible);
        }}
      >
        <FocusPaperArrow />
      </button>
      <aside className="handwriting-paper-picker" aria-label={uiText(191)}>
        {visible && (
          <>
            <section className="handwriting-paper-section handwriting-paper-section--type">
              <button
                type="button"
                className="handwriting-paper-section__toggle secondary-button"
                aria-expanded={sectionsOpen.paper}
                aria-label={uiText(192)}
                title={uiText(192)}
                onClick={() => onToggleSection("paper")}
              >
                <span className="paper-preview paper-preview--blank" aria-hidden="true" />
                <span className="paper-picker-label">{uiText(192)}</span>
                <span className="paper-picker-chevron" aria-hidden="true">
                  <FocusPaperArrow />
                </span>
              </button>
            </section>
            <section className="handwriting-paper-section handwriting-paper-section--color">
              <button
                type="button"
                className="handwriting-paper-section__toggle secondary-button"
                aria-expanded={sectionsOpen.color}
                aria-label={uiText(193)}
                title={uiText(193)}
                onClick={() => onToggleSection("color")}
              >
                <span className="paper-preview paper-preview--tone-aged" aria-hidden="true" />
                <span className="paper-picker-label">{uiText(193)}</span>
                <span className="paper-picker-chevron" aria-hidden="true">
                  <FocusPaperArrow />
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
                        ["blank", uiText(1654)],
                        ["calendar", uiText(194)],
                        ["cornell", uiText(1656)],
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
                        <span
                          className={`paper-preview paper-preview--${value}`}
                          aria-hidden="true"
                        />
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
          </>
        )}
      </aside>
    </>
  );
}
