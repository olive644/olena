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
  return (
    <aside className="handwriting-paper-picker" aria-label="Tipo e cor do papel">
      <section className="handwriting-paper-section">
        <button
          type="button"
          className="handwriting-paper-section__toggle"
          aria-expanded={sectionsOpen.paper}
          aria-label="Tipo de papel"
          onClick={() => onToggleSection("paper")}
        >
          <span className="paper-preview paper-preview--blank" aria-hidden="true" />
          <span className="paper-picker-label">Tipo de papel</span>
          <span className="paper-picker-chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
        {sectionsOpen.paper && (
          <div className="handwriting-paper-options">
            {(
              [
                ["ruled", "Pautado"],
                ["grid", "Quadriculado"],
                ["dots", "Pontilhado"],
                ["blank", "Em branco"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                className={paper === value ? "is-active" : ""}
                aria-pressed={paper === value}
                onClick={() => onSelectPaper(value)}
                key={value}
              >
                <span className={`paper-preview paper-preview--${value}`} aria-hidden="true" />
                <span className="paper-picker-label">{label}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="handwriting-paper-section">
        <button
          type="button"
          className="handwriting-paper-section__toggle"
          aria-expanded={sectionsOpen.color}
          aria-label="Cor da folha"
          onClick={() => onToggleSection("color")}
        >
          <span className="paper-preview paper-preview--tone-aged" aria-hidden="true" />
          <span className="paper-picker-label">Cor da folha</span>
          <span className="paper-picker-chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
        {sectionsOpen.color && (
          <div className="handwriting-paper-options">
            {(
              [
                ["light", "Clara"],
                ["aged", "Papel de livro"],
                ["night", "Escura"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                className={paperColor === value ? "is-active" : ""}
                aria-pressed={paperColor === value}
                onClick={() => onSelectPaperColor(value)}
                key={value}
              >
                <span className={`paper-preview paper-preview--tone-${value}`} aria-hidden="true" />
                <span className="paper-picker-label">{label}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
